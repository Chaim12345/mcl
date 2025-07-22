import { query } from './client.js';

async function checkSchema() {
  try {
    console.log('Checking database schema...');
    
    // Check users table columns
    const usersColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    usersColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();