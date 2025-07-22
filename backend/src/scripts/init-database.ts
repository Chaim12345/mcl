import { execSync } from 'child_process';
import { config } from 'dotenv';
import { setupDatabase } from './setup-database.js';

// Load environment variables
config();

/**
 * Initialize the database by running migrations and seed scripts
 */
async function initDatabase() {
  try {
    console.log('🚀 Initializing database...');
    
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Test database connection
    await setupDatabase();
    
    // Run migrations
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate dev --name init --create-only', { stdio: 'inherit' });
    
    console.log('✅ Database initialization completed successfully!');
    console.log('ℹ️ You can now run migrations with: npm run db:migrate');
    console.log('ℹ️ And seed the database with: npm run db:seed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}

export { initDatabase };