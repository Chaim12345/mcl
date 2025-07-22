import { query } from './client.js';

async function resetDatabase() {
  try {
    console.log('🗑️ Dropping existing tables...');
    
    // Drop tables in reverse order to respect foreign key constraints
    await query('DROP TABLE IF EXISTS notifications CASCADE');
    await query('DROP TABLE IF EXISTS activity_logs CASCADE');
    await query('DROP TABLE IF EXISTS comments CASCADE');
    await query('DROP TABLE IF EXISTS board_items CASCADE');
    await query('DROP TABLE IF EXISTS board_columns CASCADE');
    await query('DROP TABLE IF EXISTS boards CASCADE');
    await query('DROP TABLE IF EXISTS workspace_members CASCADE');
    await query('DROP TABLE IF EXISTS workspaces CASCADE');
    await query('DROP TABLE IF EXISTS users CASCADE');
    
    // Drop enums
    await query('DROP TYPE IF EXISTS notification_type_enum CASCADE');
    await query('DROP TYPE IF EXISTS status_enum CASCADE');
    await query('DROP TYPE IF EXISTS priority_enum CASCADE');
    await query('DROP TYPE IF EXISTS role_enum CASCADE');
    
    // Drop migrations table to force re-running migrations
    await query('DROP TABLE IF EXISTS migrations CASCADE');
    
    console.log('✅ Database reset completed');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

resetDatabase();