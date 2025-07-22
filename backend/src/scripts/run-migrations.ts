import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Run database migrations
 * @param {string} name - Migration name
 */
async function runMigrations(name = 'migration') {
  try {
    console.log('🔄 Running database migrations...');
    
    // Run migrations
    execSync(`npx prisma migrate dev --name ${name}`, { stdio: 'inherit' });
    
    console.log('✅ Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Database migrations failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrationName = process.argv[2] || 'migration';
  runMigrations(migrationName);
}

export { runMigrations };