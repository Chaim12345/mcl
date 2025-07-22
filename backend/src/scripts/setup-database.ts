import { config } from 'dotenv';
import { query } from '../db/client.js';

// Load environment variables
config();

/**
 * Set up the database connection and test it
 */
async function setupDatabase() {
  try {
    console.log('🔄 Setting up database connection...');
    
    // Test database connection
    const result = await query('SELECT 1 as test');
    console.log('✅ Database connection established successfully');
    console.log('✅ Database query test successful:', result.rows);
    
    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}

export { setupDatabase };