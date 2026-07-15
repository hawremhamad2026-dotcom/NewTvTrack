import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/imdb-reviews?imdbId=tt1480055');
    const data = await res.json();
    console.log("Reviews:", data.reviews ? data.reviews.length : 0);
  } catch (e) {
    console.error(e);
  }
}
test();
