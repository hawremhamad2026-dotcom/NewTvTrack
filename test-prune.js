const prev = {
  movies: [{ id: 1, completed: false, inWatchlist: false, isFavorite: false, userRating: undefined }],
  favorites: []
};
const activeMovies = (prev.movies || []).filter(m => {
  const isFavorite = (prev.favorites || []).includes(m.id) || m.isFavorite;
  return m.inWatchlist || isFavorite || m.userRating !== null || m.completed;
});
console.log(activeMovies);
