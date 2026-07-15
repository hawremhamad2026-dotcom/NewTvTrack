import { GoogleGenAI } from "@google/genai";

export interface SeedrFile {
  id: number;
  name: string;
  size: number;
  streamUrl?: string;
  folderId?: number;
}

export interface SeedrTorrent {
  id: number;
  name: string;
  progress: number;
  status: string;
  hash?: string;
}

export interface SeedrStatusResponse {
  status: 'ready' | 'downloading' | 'not_added' | 'error';
  progress?: number;
  files?: SeedrFile[];
  message?: string;
}

/**
 * Custom Seedr API Client using standard native fetch
 */
export class SeedrClient {
  private email: string;
  private password: string;
  private token: string | null = null;

  constructor() {
    this.email = process.env.SEEDR_EMAIL || "hawremhamad2026@gmail.com";
    this.password = process.env.SEEDR_PASSWORD || "19711971";
  }

  /**
   * Logs in to Seedr and retrieves an access token
   */
  async login(): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('grant_type', 'password');
      formData.append('client_id', 'seedr_chrome');
      formData.append('type', 'login');
      formData.append('username', this.email);
      formData.append('password', this.password);

      const response = await fetch('https://www.seedr.cc/oauth_test/token.php', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Seedr login failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error("No access token returned from Seedr");
      }

      this.token = data.access_token;
      return this.token;
    } catch (error: any) {
      console.error("Seedr Client Login Error:", error);
      throw error;
    }
  }

  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;
    return this.login();
  }

  /**
   * Fetches all contents from the seedr account
   */
  async getRootContents(): Promise<{ folders: any[]; files: any[]; torrents: any[] }> {
    const token = await this.ensureToken();
    try {
      const response = await fetch(`https://www.seedr.cc/api/folder?access_token=${token}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch root folder, status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Seedr getRootContents error:", error);
      // If token expired, try logging in again
      this.token = null;
      const rToken = await this.ensureToken();
      const response = await fetch(`https://www.seedr.cc/api/folder?access_token=${rToken}`);
      return await response.json();
    }
  }

  /**
   * Fetches files inside a specific folder
   */
  async getFolderContents(folderId: number): Promise<{ folders: any[]; files: any[] }> {
    const token = await this.ensureToken();
    const response = await fetch(`https://www.seedr.cc/api/folder/${folderId}?access_token=${token}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch folder ${folderId}, status: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Adds a magnet link to the Seedr account
   */
  async addMagnet(magnet: string): Promise<any> {
    const token = await this.ensureToken();
    const formData = new FormData();
    formData.append('access_token', token);
    formData.append('func', 'add_torrent');
    formData.append('torrent_magnet', magnet);

    const response = await fetch('https://www.seedr.cc/oauth_test/resource.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to add magnet, status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Fetches the direct streaming link for a specific file ID
   */
  async getFileStreamUrl(fileId: number): Promise<string> {
    const token = await this.ensureToken();
    const formData = new FormData();
    formData.append('access_token', token);
    formData.append('func', 'fetch_file');
    formData.append('folder_file_id', fileId.toString());

    const response = await fetch('https://www.seedr.cc/oauth_test/resource.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file stream details, status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error(`Seedr did not return a stream URL for file ID ${fileId}`);
    }

    return data.url;
  }

  /**
   * Deletes a folder, file, or active torrent queue item
   */
  async deleteItem(type: 'file' | 'folder' | 'torrent', id: number): Promise<any> {
    const token = await this.ensureToken();
    const formData = new FormData();
    formData.append('access_token', token);
    formData.append('func', 'delete');
    
    // In Seedr, active queue items are often deleted with type: 'torrent' or type: 'active_torrent'
    const deleteType = type === 'torrent' ? 'torrent' : type;
    formData.append('delete_arr', JSON.stringify([{
      type: deleteType,
      id: id
    }]));

    const response = await fetch('https://www.seedr.cc/oauth_test/resource.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to delete item ${type}:${id}, status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Clears all root files, folders, and torrents in the account to free up space
   */
  async clearAllContents(): Promise<void> {
    try {
      const root = await this.getRootContents();
      
      // Delete all active torrent downloads in progress
      if (root.torrents && Array.isArray(root.torrents)) {
        for (const t of root.torrents) {
          console.log(`Clearing active torrent queue item: ${t.name} (ID: ${t.id})`);
          await this.deleteItem('torrent', t.id).catch(e => console.error(e));
        }
      }

      // Delete all root folders
      if (root.folders && Array.isArray(root.folders)) {
        for (const f of root.folders) {
          console.log(`Clearing root folder: ${f.name} (ID: ${f.id})`);
          await this.deleteItem('folder', f.id).catch(e => console.error(e));
        }
      }

      // Delete all root files
      if (root.files && Array.isArray(root.files)) {
        for (const f of root.files) {
          console.log(`Clearing root file: ${f.name} (ID: ${f.id})`);
          await this.deleteItem('file', f.id).catch(e => console.error(e));
        }
      }
    } catch (error) {
      console.error("Error clearing Seedr contents:", error);
    }
  }

  /**
   * Normalizes a filename/title for reliable comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // remove all non-alphanumeric chars
      .trim();
  }

  /**
   * Checks if a stream exists in Seedr account and gets its status/URLs
   */
  async checkStreamStatus(infoHash: string, title: string): Promise<SeedrStatusResponse> {
    try {
      const root = await this.getRootContents();
      const cleanInfoHash = infoHash.toLowerCase().trim();
      const cleanTitle = this.normalizeString(title);

      // 1. Check if it's currently downloading/queued in torrents
      if (root.torrents && Array.isArray(root.torrents)) {
        const matchingTorrent = root.torrents.find(t => {
          const tHash = (t.hash || t.info_hash || '').toLowerCase().trim();
          if (tHash && tHash === cleanInfoHash) return true;
          
          const tNameClean = this.normalizeString(t.name || '');
          if (cleanTitle && tNameClean && (tNameClean.includes(cleanTitle) || cleanTitle.includes(tNameClean))) {
            return true;
          }
          return false;
        });

        if (matchingTorrent) {
          // Calculate progress percentage
          let progress = 0;
          if (matchingTorrent.progress !== undefined) {
            progress = matchingTorrent.progress;
          } else if (matchingTorrent.percent_done !== undefined) {
            progress = matchingTorrent.percent_done;
          }
          return {
            status: 'downloading',
            progress: progress,
            message: `Torrent is currently fetching in Seedr: ${matchingTorrent.name || 'Downloading'}`
          };
        }
      }

      // 2. Check root files for a direct match
      if (root.files && Array.isArray(root.files)) {
        const matchingFile = root.files.find(f => {
          const fNameClean = this.normalizeString(f.name || '');
          return fNameClean && (fNameClean.includes(cleanTitle) || cleanTitle.includes(fNameClean));
        });

        if (matchingFile) {
          try {
            const streamUrl = await this.getFileStreamUrl(matchingFile.id);
            return {
              status: 'ready',
              files: [{
                id: matchingFile.id,
                name: matchingFile.name,
                size: matchingFile.size || 0,
                streamUrl
              }]
            };
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 3. Check folders for a match, and inspect files inside matching folders
      if (root.folders && Array.isArray(root.folders)) {
        // Find matching folders
        const matchingFolders = root.folders.filter(folder => {
          const folderNameClean = this.normalizeString(folder.name || '');
          return folderNameClean && (folderNameClean.includes(cleanTitle) || cleanTitle.includes(folderNameClean));
        });

        if (matchingFolders.length > 0) {
          const allFoundFiles: SeedrFile[] = [];

          for (const folder of matchingFolders) {
            try {
              const folderDetails = await this.getFolderContents(folder.id);
              if (folderDetails.files && Array.isArray(folderDetails.files)) {
                // Video files usually have play_video=true or standard extensions like mkv, mp4, avi, etc.
                const videoFiles = folderDetails.files.filter(file => {
                  const extension = (file.name || '').split('.').pop()?.toLowerCase() || '';
                  const isVideoExt = ['mkv', 'mp4', 'avi', 'mov', 'webm', 'ts'].includes(extension);
                  return file.play_video || isVideoExt;
                });

                for (const file of videoFiles) {
                  try {
                    const streamUrl = await this.getFileStreamUrl(file.folder_file_id);
                    allFoundFiles.push({
                      id: file.folder_file_id,
                      name: file.name,
                      size: file.size || 0,
                      streamUrl,
                      folderId: folder.id
                    });
                  } catch (err) {
                    console.error(`Error getting stream URL for file ${file.name}:`, err);
                  }
                }
              }
            } catch (err) {
              console.error(`Error crawling folder ${folder.name}:`, err);
            }
          }

          if (allFoundFiles.length > 0) {
            return {
              status: 'ready',
              files: allFoundFiles
            };
          }
        }
      }

      // If we got here, it's not in the account
      return {
        status: 'not_added',
        message: 'Stream not found in Seedr account'
      };
    } catch (error: any) {
      console.error("Error checking stream status in Seedr:", error);
      return {
        status: 'error',
        message: error.message || 'Error communicating with Seedr'
      };
    }
  }
}
