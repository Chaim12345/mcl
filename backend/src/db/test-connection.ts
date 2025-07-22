import { query } from './client.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test database connection
    const result = await query('SELECT 1 as test');
    console.log('Database connection successful!');
    console.log('Query result:', result.rows);
    
    // Check if tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tablesResult.rows.map((row: any) => row.table_name));
    
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Run the test
console.log('Starting database connection test...');
testConnection()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error));