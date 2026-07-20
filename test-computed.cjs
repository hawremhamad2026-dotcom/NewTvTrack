// use global fetch

// Mock data structures and helper
const CURRENT_TIME = new Date();

function getReleasedEpisodesCount(show) {
  const currentDateStr = new Date().toISOString().split('T')[0];
  if (!show.seasons || show.seasons.length === 0) {
    return show.episodesCount || 8;
  }
  let count = 0;
  let hasAnyEpisodes = false;
  show.seasons.forEach(season => {
    if (season.episodes && season.episodes.length > 0) {
      hasAnyEpisodes = true;
      season.episodes.forEach(ep => {
        if (!ep.airDate || ep.airDate <= currentDateStr) {
          count++;
        }
      });
    }
  });
  if (hasAnyEpisodes) {
    return count;
  }
  return show.episodesCount || 8;
}

function getUpcomingEpisodesTimeline(shows, watchedEpisodes) {
  return []; // Mock
}

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/state", { headers: { "Authorization": "Bearer MyMostRecent" } });
    const state = await res.json();
    console.log("Fetched state success. Shows:", state.shows.length, "Movies:", state.movies.length);
    
    // Simulate computedData
    const enrichedShows = state.shows.map(show => ({
      ...show,
      isFavorite: state.favorites.includes(show.id),
    }));

    const enrichedMovies = state.movies.map(movie => ({
      ...movie,
      isFavorite: state.favorites.includes(movie.id),
    }));

    const getWatchedEpisodeCount = (showId) => {
      return Object.keys(state.watchedEpisodes[showId] || {}).length;
    };

    const watchlistTVShows = enrichedShows.filter(s => s.inWatchlist && !s.completed && !s.stoppedWatching);
    
    const tvWatchNext = [];
    const tvLongTimeNoWatch = [];
    const tvNotStarted = [];
    const tvWaiting = [];

    watchlistTVShows.forEach(show => {
      const watchedCount = getWatchedEpisodeCount(show.id);
      const releasedCount = getReleasedEpisodesCount(show);
      
      let totalCount = show.episodesCount || 8;
      if (show.seasons && show.seasons.length > 0) {
        let sum = 0;
        show.seasons.forEach(season => {
          if (season.episodes && season.episodes.length > 0) {
            sum += season.episodes.length;
          }
        });
        if (sum > 0) {
          totalCount = sum;
        }
      }

      if (watchedCount === 0) {
        tvNotStarted.push(show);
      } else if (watchedCount >= releasedCount && releasedCount < totalCount) {
        tvWaiting.push(show);
      } else {
        let hasNewEpisodes = false;
        const currentDateStr = new Date().toISOString().split('T')[0];
        
        if (show.seasons && show.seasons.length > 0) {
          show.seasons.forEach(season => {
            if (season.episodes) {
              season.episodes.forEach(ep => {
                const isReleased = !ep.airDate || ep.airDate <= currentDateStr;
                if (isReleased) {
                  const epKey = `S${season.seasonNumber}E${ep.episode}`;
                  const isWatched = !!(state.watchedEpisodes[show.id]?.[epKey]);
                  if (!isWatched) {
                    if (show.lastWatchedAt) {
                      const airDateObj = ep.airDate ? new Date(ep.airDate) : null;
                      const lastWatchedObj = new Date(show.lastWatchedAt);
                      if (airDateObj && airDateObj.getTime() > lastWatchedObj.getTime()) {
                        hasNewEpisodes = true;
                      }
                    } else {
                      hasNewEpisodes = true;
                    }
                  }
                }
              });
            }
          });
        }

        let isOld = false;
        if (show.lastWatchedAt) {
          const lastWatchDate = new Date(show.lastWatchedAt);
          const diffDays = (CURRENT_TIME.getTime() - lastWatchDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 30) {
            isOld = true;
          }
        }

        if (hasNewEpisodes) {
          isOld = false;
        }
        
        if (isOld) {
          tvLongTimeNoWatch.push(show);
        } else {
          tvWatchNext.push(show);
        }
      }
    });

    const watchlistOnlyShows = enrichedShows.filter(show => show.inWatchlist);
    const upcomingTVTimeline = getUpcomingEpisodesTimeline(watchlistOnlyShows, state.watchedEpisodes);

    const movieWatchlist = [];
    const movieUpcoming = [];

    enrichedMovies.forEach(movie => {
      if (!movie.inWatchlist) return;
      
      const releaseDate = new Date(movie.releaseDate);
      const isReleased = movie.releaseDate ? releaseDate.getTime() <= CURRENT_TIME.getTime() : true;

      if (isReleased) {
        if (!movie.completed) {
          movieWatchlist.push(movie);
        }
      } else {
        movieUpcoming.push(movie);
      }
    });

    movieUpcoming.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

    let totalEpisodesWatched = 0;
    let tvHours = 0;
    
    Object.keys(state.watchedEpisodes).forEach(showIdStr => {
      const showId = Number(showIdStr);
      const epsWatched = Object.keys(state.watchedEpisodes[showId] || {}).length;
      totalEpisodesWatched += epsWatched;
      
      const show = enrichedShows.find(s => s.id === showId);
      const runtime = (show && show.runtime > 0) ? show.runtime : 45;
      tvHours += (epsWatched * runtime) / 60;
    });

    const completedMovies = enrichedMovies
      .filter(m => m.completed)
      .sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA;
      });
    const moviesWatchedCount = completedMovies.length;
    let movieHours = 0;
    completedMovies.forEach(m => {
      movieHours += (m.runtime > 0 ? m.runtime : 120) / 60;
    });

    const showsWatchedCount = Object.keys(state.watchedEpisodes).filter(
      showIdStr => Object.keys(state.watchedEpisodes[Number(showIdStr)] || {}).length > 0
    ).length;

    const stats = {
      episodesWatched: totalEpisodesWatched,
      showsWatched: showsWatchedCount,
      hoursSpent: Math.round(tvHours + movieHours),
      moviesWatched: moviesWatchedCount,
    };

    const completedTVShows = enrichedShows
      .filter(s => s.completed)
      .sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : (a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0);
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : (b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0);
        return timeB - timeA;
      });

    const favoriteTVShows = enrichedShows
      .filter(s => s.isFavorite)
      .sort((a, b) => {
        const timeA = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0;
        const timeB = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0;
        return timeB - timeA;
      });

    const favoriteMovies = enrichedMovies
      .filter(m => m.isFavorite)
      .sort((a, b) => {
        const timeA = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0;
        const timeB = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0;
        return timeB - timeA;
      });

    const stoppedWatchingTVShows = enrichedShows
      .filter(s => s.stoppedWatching)
      .sort((a, b) => {
        const timeA = a.stoppedWatchingAt ? new Date(a.stoppedWatchingAt).getTime() : 0;
        const timeB = b.stoppedWatchingAt ? new Date(b.stoppedWatchingAt).getTime() : 0;
        return timeB - timeA;
      });

    console.log("Successfully ran computedData! Stats:", stats);
  } catch (err) {
    console.error("CRASHED!", err);
  }
}

run();
