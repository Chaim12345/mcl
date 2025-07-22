import { query } from './client.js';

/**
 * Set up the database schema for testing
 */
export async function setupDatabase() {
  try {
    console.log('🔄 Setting up database schema...');
    
    // Create enums first
    await query(`
      DO $$ BEGIN
        CREATE TYPE role_enum AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE status_enum AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE notification_type_enum AS ENUM ('SYSTEM', 'MENTION', 'ASSIGNMENT', 'COMMENT', 'DUE_DATE', 'INVITATION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255),
        "lastName" VARCHAR(255),
        avatar VARCHAR(255),
        "isActive" BOOLEAN DEFAULT TRUE,
        "lastLogin" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create workspaces table
    await query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        logo VARCHAR(255),
        owner_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create workspace_members table
    await query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role role_enum DEFAULT 'MEMBER',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (workspace_id, user_id)
      )
    `);

    // Create boards table
    await query(`
      CREATE TABLE IF NOT EXISTS boards (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        workspace_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);

    // Create board_columns table
    await query(`
      CREATE TABLE IF NOT EXISTS board_columns (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "order" INTEGER NOT NULL,
        board_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )
    `);

    // Create board_items table
    await query(`
      CREATE TABLE IF NOT EXISTS board_items (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "order" INTEGER NOT NULL,
        board_id VARCHAR(255) NOT NULL,
        column_id VARCHAR(255) NOT NULL,
        due_date TIMESTAMP,
        priority priority_enum DEFAULT 'MEDIUM',
        status status_enum DEFAULT 'TODO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
      )
    `);

    // Create comments table
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES board_items(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create activity_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(255) PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255) NOT NULL,
        item_id VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES board_items(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        type notification_type_enum NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        recipient_id VARCHAR(255) NOT NULL,
        sender_id VARCHAR(255),
        entity_id VARCHAR(255),
        entity_type VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create update timestamp function
    await query(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers for updated_at timestamps
    const tables = ['users', 'workspaces', 'workspace_members', 'boards', 'board_columns', 'board_items', 'comments'];
    
    for (const table of tables) {
      await query(`
        DROP TRIGGER IF EXISTS update_${table}_timestamp ON ${table};
        CREATE TRIGGER update_${table}_timestamp
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
      `);
    }

    console.log('✅ Database schema setup completed successfully!');
  } catch (error) {
    console.error('❌ Database schema setup failed:', error);
    throw error;
  }
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test data...');
    
    // Clean up in reverse order to respect foreign key constraints
    await query('DELETE FROM notifications WHERE 1=1');
    await query('DELETE FROM activity_logs WHERE 1=1');
    await query('DELETE FROM comments WHERE 1=1');
    await query('DELETE FROM board_items WHERE 1=1');
    await query('DELETE FROM board_columns WHERE 1=1');
    await query('DELETE FROM boards WHERE 1=1');
    await query('DELETE FROM workspace_members WHERE 1=1');
    await query('DELETE FROM workspaces WHERE 1=1');
    await query('DELETE FROM users WHERE email LIKE \'%test%\' OR email LIKE \'%other%\'');
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    throw error;
  }
}