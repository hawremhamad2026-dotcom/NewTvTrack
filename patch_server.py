import re

with open("server.ts", "r") as f:
    content = f.read()

# Remove MemoryDB
content = re.sub(r'const MemoryDB = \{[\s\S]*?\};\n', '', content)

# Add DB imports
imports = """import { db } from "./src/db/index.js";
import { userProfiles, mediaItems, watchedEpisodes } from "./src/db/schema.js";
import { eq, and } from "drizzle-orm";
"""
content = content.replace('import { SeedrClient } from "./src/lib/seedrService.js";\n', 'import { SeedrClient } from "./src/lib/seedrService.js";\n' + imports)

# Patch authMiddleware
new_auth = """    // Ensure profile exists
    try {
      MemoryDB.profiles.add(deviceId);
    } catch (e) {
      console.error(e);
    }"""
old_auth = """    // Ensure profile exists
    try {
      await db.insert(userProfiles)
        .values({ id: deviceId })
        .onConflictDoNothing();
    } catch (e) {
      console.error(e);
    }"""
content = content.replace(new_auth, old_auth)

# Patch GET /api/state
new_get_state = """      const items = MemoryDB.mediaItems.filter((i: any) => i.userId === deviceId);
      const eps = MemoryDB.watchedEpisodes.filter((i: any) => i.userId === deviceId);"""
old_get_state = """      const items = await db.select().from(mediaItems).where(eq(mediaItems.userId, deviceId));
      const eps = await db.select().from(watchedEpisodes).where(eq(watchedEpisodes.userId, deviceId));"""
content = content.replace(new_get_state, old_get_state)

# Patch POST /api/state
new_post_state_start = """      // Wrap everything in a transaction to prevent race conditions during sync
      (async () => {
        // Clear existing
        MemoryDB.mediaItems = MemoryDB.mediaItems.filter((i: any) => i.userId !== deviceId);
        MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => i.userId !== deviceId);"""
old_post_state_start = """      // Wrap everything in a transaction to prevent race conditions during sync
      await db.transaction(async (tx) => {
        // Clear existing
        await tx.delete(mediaItems).where(eq(mediaItems.userId, deviceId));
        await tx.delete(watchedEpisodes).where(eq(watchedEpisodes.userId, deviceId));"""
content = content.replace(new_post_state_start, old_post_state_start)

new_insert_items = """      if (allItems.length > 0) {
        MemoryDB.mediaItems.push(...allItems);
      }"""
old_insert_items = """      if (allItems.length > 0) {
        await tx.insert(mediaItems).values(allItems);
      }"""
content = content.replace(new_insert_items, old_insert_items)

new_insert_eps = """      if (epsToInsert.length > 0) {
        MemoryDB.watchedEpisodes.push(...epsToInsert);
      }
      })(); // close tx"""
old_insert_eps = """      if (epsToInsert.length > 0) {
        await tx.insert(watchedEpisodes).values(epsToInsert);
      }
      }); // close tx"""
content = content.replace(new_insert_eps, old_insert_eps)

# Patch POST /api/media
new_post_media_find = """      // Find if exists
      const existing = MemoryDB.mediaItems.filter((i: any) => i.userId === deviceId && i.mediaId === media.id);"""
old_post_media_find = """      // Find if exists
      const existing = await db.select().from(mediaItems)
        .where(and(eq(mediaItems.userId, deviceId), eq(mediaItems.mediaId, media.id)));"""
content = content.replace(new_post_media_find, old_post_media_find)

new_post_media_update = """        const idx = MemoryDB.mediaItems.findIndex((i: any) => i.userId === deviceId && i.mediaId === media.id);
        if (idx !== -1) {
          MemoryDB.mediaItems[idx] = {
            ...MemoryDB.mediaItems[idx],
            title: media.title,
            posterPath: media.posterPath,
            backdropPath: media.backdropPath,
            overview: media.overview,
            releaseDate: media.releaseDate,
            genres: media.genres,
            rating: media.rating?.toString(),
            runtime: media.runtime,
            seasonsCount: media.seasonsCount,
            episodesCount: media.episodesCount,
            inWatchlist: media.inWatchlist,
            isFavorite: media.isFavorite,
            userRating: media.userRating,
            completed: media.completed,
            stoppedWatching: media.stoppedWatching,
            lastWatchedAt: media.lastWatchedAt ? new Date(media.lastWatchedAt) : null,
            seasons: media.seasons,
            imdbId: media.imdbId
          };
        }"""
old_post_media_update = """        await db.update(mediaItems)
          .set({
            title: media.title,
            posterPath: media.posterPath,
            backdropPath: media.backdropPath,
            overview: media.overview,
            releaseDate: media.releaseDate,
            genres: media.genres,
            rating: media.rating?.toString(),
            runtime: media.runtime,
            seasonsCount: media.seasonsCount,
            episodesCount: media.episodesCount,
            inWatchlist: media.inWatchlist,
            isFavorite: media.isFavorite,
            userRating: media.userRating,
            completed: media.completed,
            stoppedWatching: media.stoppedWatching,
            lastWatchedAt: media.lastWatchedAt ? new Date(media.lastWatchedAt) : null,
            seasons: media.seasons,
            imdbId: media.imdbId
          })
          .where(eq(mediaItems.id, existing[0].id));"""
content = content.replace(new_post_media_update, old_post_media_update)

new_post_media_insert = """        MemoryDB.mediaItems.push({
          userId: deviceId,
          mediaId: media.id,
          type: media.type,
          title: media.title,
          posterPath: media.posterPath,
          backdropPath: media.backdropPath,
          overview: media.overview,
          releaseDate: media.releaseDate,
          genres: media.genres,
          rating: media.rating?.toString(),
          runtime: media.runtime,
          seasonsCount: media.seasonsCount,
          episodesCount: media.episodesCount,
          inWatchlist: media.inWatchlist,
          isFavorite: media.isFavorite,
          userRating: media.userRating,
          completed: media.completed,
          stoppedWatching: media.stoppedWatching,
          lastWatchedAt: media.lastWatchedAt ? new Date(media.lastWatchedAt) : null,
          seasons: media.seasons,
          imdbId: media.imdbId
        });"""
old_post_media_insert = """        await db.insert(mediaItems).values({
          userId: deviceId,
          mediaId: media.id,
          type: media.type,
          title: media.title,
          posterPath: media.posterPath,
          backdropPath: media.backdropPath,
          overview: media.overview,
          releaseDate: media.releaseDate,
          genres: media.genres,
          rating: media.rating?.toString(),
          runtime: media.runtime,
          seasonsCount: media.seasonsCount,
          episodesCount: media.episodesCount,
          inWatchlist: media.inWatchlist,
          isFavorite: media.isFavorite,
          userRating: media.userRating,
          completed: media.completed,
          stoppedWatching: media.stoppedWatching,
          lastWatchedAt: media.lastWatchedAt ? new Date(media.lastWatchedAt) : null,
          seasons: media.seasons,
          imdbId: media.imdbId
        });"""
content = content.replace(new_post_media_insert, old_post_media_insert)

new_post_ep_true = """        MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => !(i.userId === deviceId && i.showId === showId && i.episodeKey === episodeKey));
        MemoryDB.watchedEpisodes.push({
          userId: deviceId,
          showId: showId,
          episodeKey: episodeKey,
          watchedAt: new Date()
        });"""
old_post_ep_true = """        await db.insert(watchedEpisodes).values({
          userId: deviceId,
          showId: showId,
          episodeKey: episodeKey,
          watchedAt: new Date()
        }).onConflictDoNothing(); // we don't have unique constraint, wait
        // To prevent duplicates, let's delete then insert
        await db.delete(watchedEpisodes)
          .where(and(eq(watchedEpisodes.userId, deviceId), eq(watchedEpisodes.showId, showId), eq(watchedEpisodes.episodeKey, episodeKey)));
        await db.insert(watchedEpisodes).values({
          userId: deviceId,
          showId: showId,
          episodeKey: episodeKey,
          watchedAt: new Date()
        });"""
content = content.replace(new_post_ep_true, old_post_ep_true)

new_post_ep_false = """        MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => !(i.userId === deviceId && i.showId === showId && i.episodeKey === episodeKey));"""
old_post_ep_false = """        await db.delete(watchedEpisodes)
          .where(and(eq(watchedEpisodes.userId, deviceId), eq(watchedEpisodes.showId, showId), eq(watchedEpisodes.episodeKey, episodeKey)));"""
content = content.replace(new_post_ep_false, old_post_ep_false)

new_reset = """      MemoryDB.mediaItems = MemoryDB.mediaItems.filter((i: any) => i.userId !== deviceId);
      MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => i.userId !== deviceId);"""
old_reset = """      await db.delete(mediaItems).where(eq(mediaItems.userId, deviceId));
      await db.delete(watchedEpisodes).where(eq(watchedEpisodes.userId, deviceId));"""
content = content.replace(new_reset, old_reset)

with open("server.ts", "w") as f:
    f.write(content)

print("Restored!")
