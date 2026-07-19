import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        title, 
        length(coalesce(cast(seasons as text), '')) as seasons_len, 
        length(coalesce(cast("cast" as text), '')) as cast_len, 
        length(coalesce(cast(directors as text), '')) as dir_len 
      FROM media_items 
      WHERE user_id = 'MyMostRecent' 
      ORDER BY seasons_len DESC 
      LIMIT 10
    `);
    console.log('Top seasons lengths:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
