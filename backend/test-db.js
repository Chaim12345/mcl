import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/project_management'
});

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check users table structure
    const usersColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('Users table columns:', usersColumns.rows);
    
    // Check workspaces table structure
    const workspacesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workspaces'
      ORDER BY ordinal_position
    `);
    console.log('Workspaces table columns:', workspacesColumns.rows);
    
    // Test creating a user
    const userResult = await pool.query(`
      INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
      VALUES ('test-user-id', 'test@example.com', 'password', 'Test', 'User', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET "firstName" = 'Test'
      RETURNING id, email, "firstName", "lastName"
    `);
    console.log('Created/updated user:', userResult.rows[0]);
    
    // Test creating a workspace
    const workspaceResult = await pool.query(`
      INSERT INTO workspaces (id, name, description, owner_id, created_at, updated_at)
      VALUES ('test-workspace-id', 'Test Workspace', 'Test Description', 'test-user-id', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = 'Test Workspace'
      RETURNING id, name, description, owner_id
    `);
    console.log('Created/updated workspace:', workspaceResult.rows[0]);
    
    // Test the query that's failing
    const queryResult = await pool.query(`
      SELECT 
        w.id, w.name, w.description, w.logo, w.owner_id, w.created_at, w.updated_at,
        wm.id as member_id, wm.user_id, wm.role, wm.joined_at,
        u.email, u."firstName", u."lastName", u.avatar
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       LEFT JOIN users u ON wm.user_id = u.id
       WHERE w.id = $1
       ORDER BY wm.joined_at ASC
    `, ['test-workspace-id']);
    
    console.log('Query result:', queryResult.rows);
    
  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();