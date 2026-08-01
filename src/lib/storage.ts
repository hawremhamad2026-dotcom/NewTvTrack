import { SavedState, MediaItem } from '../types';

export const STORAGE_KEY = 'tv_tracker_local_state';
const DB_NAME = 'tv_tracker_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'current_state';

// Initialize or open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

// Slim state for localStorage so it never exceeds the 5MB quota limit
export function slimStateForLocalStorage(state: SavedState): SavedState {
  const slimShows = (state.shows || []).map((show: any) => {
    const { seasons, cast, directors, recommendations, similar, videos, ...rest } = show;
    return {
      ...rest,
      overview: rest.overview ? rest.overview.slice(0, 300) : rest.overview,
    } as MediaItem;
  });

  const slimMovies = (state.movies || []).map((movie: any) => {
    const { cast, directors, recommendations, similar, videos, ...rest } = movie;
    return {
      ...rest,
      overview: rest.overview ? rest.overview.slice(0, 300) : rest.overview,
    } as MediaItem;
  });

  return {
    shows: slimShows,
    movies: slimMovies,
    watchedEpisodes: state.watchedEpisodes || {},
    favorites: state.favorites || [],
    updatedAt: state.updatedAt || Date.now(),
  };
}

// Save state to IndexedDB (full state) AND localStorage (slimmed state mirror)
export async function saveStateToStorage(state: SavedState): Promise<boolean> {
  let savedToIndexedDB = false;

  // 1. Save full complete state to IndexedDB (supports hundreds of MBs)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('IndexedDB put failed'));
    });
    savedToIndexedDB = true;
  } catch (e) {
    console.warn('[Storage] Failed to save state to IndexedDB:', e);
  }

  // 2. Save slimmed state to localStorage as fast synchronous fallback
  try {
    const slim = slimStateForLocalStorage(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch (e) {
    console.warn('[Storage] LocalStorage write failed or exceeded quota (safely backed up in IndexedDB):', e);
  }

  return savedToIndexedDB;
}

// Load state asynchronously from IndexedDB, falling back to localStorage
export async function loadStateFromStorage(): Promise<SavedState | null> {
  // 1. Try IndexedDB first for full state
  try {
    const db = await openDB();
    const state = await new Promise<SavedState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('IndexedDB get failed'));
    });

    if (state && (
      (state.shows && state.shows.length > 0) ||
      (state.movies && state.movies.length > 0) ||
      (state.watchedEpisodes && Object.keys(state.watchedEpisodes).length > 0)
    )) {
      return state;
    }
  } catch (e) {
    console.warn('[Storage] Failed to load state from IndexedDB:', e);
  }

  // 2. Fallback to synchronous localStorage read
  return getSyncLocalStorageState();
}

// Synchronous load from localStorage for instant initial app render
export function getSyncLocalStorageState(): SavedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const loadedShows = data.shows || [];
      const loadedMovies = data.movies || [];
      const loadedWatched = data.watchedEpisodes || {};
      return {
        shows: Array.from(new Map(loadedShows.map((s: any) => [s.id, s])).values()) as MediaItem[],
        movies: Array.from(new Map(loadedMovies.map((m: any) => [m.id, m])).values()) as MediaItem[],
        watchedEpisodes: loadedWatched,
        favorites: data.favorites || [],
        updatedAt: data.updatedAt || Date.now(),
      };
    }
  } catch (e) {
    console.warn('[Storage] Failed to load state from localStorage:', e);
  }
  return null;
}

// Clear all storage on user request
export async function clearAllStorage(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[Storage] Failed to remove from localStorage:', e);
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('IndexedDB delete failed'));
    });
  } catch (e) {
    console.warn('[Storage] Failed to clear IndexedDB:', e);
  }
}
