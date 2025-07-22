import { query } from './client.js';

async function main() {
  try {
    const res = await query('SELECT * FROM "User" LIMIT 10;');
    console.log('Users:', res.rows);
  } catch (err) {
    console.error('Error querying users:', err);
  } finally {
    process.exit();
  }
}

main();
