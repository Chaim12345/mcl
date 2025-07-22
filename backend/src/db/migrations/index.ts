import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, transaction } from '../client.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all migrations in order
 */
export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    console.log('DEBUG: Starting migration process');
    
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    // Get applied migrations
    const { rows: appliedMigrations } = await query('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map((m: any) => m.name);
    
    // Run migrations that haven't been applied yet
    for (const file of migrationFiles) {
      if (!appliedMigrationNames.includes(file)) {
        console.log(`🔄 Running migration: ${file}`);
        
        // Read migration file
        const migrationPath = path.join(__dirname, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        // Run migration in a transaction
        await transaction(async (client: any) => {
          await client.query(migrationSql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        });
        
        console.log(`✅ Migration applied: ${file}`);
      } else {
        console.log(`⏭️ Migration already applied: ${file}`);
      }
    }
    
    console.log('✅ Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Database migrations failed:', error);
    throw error;
  }
}

// Run migrations regardless of how the script is invoked
console.log('DEBUG: Running migrations');
runMigrations()
  .then(() => {
    console.log('DEBUG: Migrations completed successfully');
    if (import.meta.url === `file://${process.argv[1]}`) {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('DEBUG: Migration failed with error:', error);
    if (import.meta.url === `file://${process.argv[1]}`) {
      process.exit(1);
    }
  });