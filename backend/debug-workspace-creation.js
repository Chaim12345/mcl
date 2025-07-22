const { Client } = require('pg');

async function testWorkspaceCreation() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'project_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if tables exist and their structure
    const tablesResult = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('workspaces', 'workspace_members', 'users')
      ORDER BY table_name, ordinal_position
    `);

    console.log('Database schema:');
    tablesResult.rows.forEach(row => {
      console.log(`${row.table_name}.${row.column_name} (${row.data_type})`);
    });

    // Check if there are any users
    const usersResult = await client.query('SELECT id, email FROM users LIMIT 5');
    console.log('\nExisting users:');
    console.log(usersResult.rows);

    // Try to create a test workspace
    if (usersResult.rows.length > 0) {
      const testUserId = usersResult.rows[0].id;
      console.log(`\nTrying to create workspace with user ID: ${testUserId}`);
      
      try {
        const workspaceResult = await client.query(
          `INSERT INTO workspaces (id, name, description, owner_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          ['test-workspace-123', 'Test Workspace', 'Test Description', testUserId, new Date(), new Date()]
        );
        console.log('Workspace created successfully:');
        console.log(workspaceResult.rows[0]);
        
        // Clean up
        await client.query('DELETE FROM workspaces WHERE id = $1', ['test-workspace-123']);
        console.log('Test workspace cleaned up');
      } catch (error) {
        console.error('Error creating workspace:', error.message);
      }
    }

  } catch (error) {
    console.error('Database connection error:', error.message);
  } finally {
    await client.end();
  }
}

testWorkspaceCreation();