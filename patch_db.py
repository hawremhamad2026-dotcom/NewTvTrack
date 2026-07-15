import re

with open("server.ts", "r") as f:
    content = f.read()

# Remove DB imports
content = re.sub(r'import\s+{\s*db\s*}\s*from\s*"./src/db/index\.js";\n?', '', content)
content = re.sub(r'import\s+{\s*userProfiles,\s*mediaItems,\s*watchedEpisodes\s*}\s*from\s*"./src/db/schema\.js";\n?', '', content)
content = re.sub(r'import\s+{\s*eq,\s*and\s*}\s*from\s*"drizzle-orm";\n?', '', content)

# Add MemoryDB
memory_db_code = """
const MemoryDB = {
  profiles: new Set<string>(),
  mediaItems: [] as any[],
  watchedEpisodes: [] as any[],
};
"""

content = content.replace('let geminiClient:', memory_db_code + '\nlet geminiClient:')

# Patch authMiddleware
old_auth = """    // Ensure profile exists
    try {
      await db.insert(userProfiles)
        .values({ id: deviceId })
        .onConflictDoNothing();
    } catch (e) {
      console.error(e);
    }"""
new_auth = """    // Ensure profile exists
    try {
      MemoryDB.profiles.add(deviceId);
    } catch (e) {
      console.error(e);
    }"""
content = content.replace(old_auth, new_auth)

# Patch GET /api/state
old_get_state = """      const items = await db.select().from(mediaItems).where(eq(mediaItems.userId, deviceId));
      const eps = await db.select().from(watchedEpisodes).where(eq(watchedEpisodes.userId, deviceId));"""
new_get_state = """      const items = MemoryDB.mediaItems.filter((i: any) => i.userId === deviceId);
      const eps = MemoryDB.watchedEpisodes.filter((i: any) => i.userId === deviceId);"""
content = content.replace(old_get_state, new_get_state)

# Patch POST /api/state
old_post_state_start = """      // Wrap everything in a transaction to prevent race conditions during sync
      await db.transaction(async (tx) => {
        // Clear existing
        await tx.delete(mediaItems).where(eq(mediaItems.userId, deviceId));
        await tx.delete(watchedEpisodes).where(eq(watchedEpisodes.userId, deviceId));"""
new_post_state_start = """      // Wrap everything in a transaction to prevent race conditions during sync
      (async () => {
        // Clear existing
        MemoryDB.mediaItems = MemoryDB.mediaItems.filter((i: any) => i.userId !== deviceId);
        MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => i.userId !== deviceId);"""
content = content.replace(old_post_state_start, new_post_state_start)

old_insert_items = """      if (allItems.length > 0) {
        await tx.insert(mediaItems).values(allItems);
      }"""
new_insert_items = """      if (allItems.length > 0) {
        MemoryDB.mediaItems.push(...allItems);
      }"""
content = content.replace(old_insert_items, new_insert_items)

old_insert_eps = """      if (epsToInsert.length > 0) {
        await tx.insert(watchedEpisodes).values(epsToInsert);
      }
      }); // close tx"""
new_insert_eps = """      if (epsToInsert.length > 0) {
        MemoryDB.watchedEpisodes.push(...epsToInsert);
      }
      })(); // close tx"""
content = content.replace(old_insert_eps, new_insert_eps)

# Patch POST /api/media
old_post_media_find = """      // Find if exists
      const existing = await db.select().from(mediaItems)
        .where(and(eq(mediaItems.userId, deviceId), eq(mediaItems.mediaId, media.id)));"""
new_post_media_find = """      // Find if exists
      const existing = MemoryDB.mediaItems.filter((i: any) => i.userId === deviceId && i.mediaId === media.id);"""
content = content.replace(old_post_media_find, new_post_media_find)

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
content = content.replace(old_post_media_update, new_post_media_update)

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
content = content.replace(old_post_media_insert, new_post_media_insert)

# Patch POST /api/episode
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
new_post_ep_true = """        MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => !(i.userId === deviceId && i.showId === showId && i.episodeKey === episodeKey));
        MemoryDB.watchedEpisodes.push({
          userId: deviceId,
          showId: showId,
          episodeKey: episodeKey,
          watchedAt: new Date()
        });"""
content = content.replace(old_post_ep_true, new_post_ep_true)

old_post_ep_false = """        await db.delete(watchedEpisodes)
          .where(and(eq(watchedEpisodes.userId, deviceId), eq(watchedEpisodes.showId, showId), eq(watchedEpisodes.episodeKey, episodeKey)));"""
new_post_ep_false = """        MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => !(i.userId === deviceId && i.showId === showId && i.episodeKey === episodeKey));"""
content = content.replace(old_post_ep_false, new_post_ep_false)

# Patch POST /api/reset
old_reset = """      await db.delete(mediaItems).where(eq(mediaItems.userId, deviceId));
      await db.delete(watchedEpisodes).where(eq(watchedEpisodes.userId, deviceId));"""
new_reset = """      MemoryDB.mediaItems = MemoryDB.mediaItems.filter((i: any) => i.userId !== deviceId);
      MemoryDB.watchedEpisodes = MemoryDB.watchedEpisodes.filter((i: any) => i.userId !== deviceId);"""
content = content.replace(old_reset, new_reset)

with open("server.ts", "w") as f:
    f.write(content)

print("Patched!")
