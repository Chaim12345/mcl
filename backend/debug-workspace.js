import { query } from './src/db/client.js';
import { generateId } from './src/utils/id.js';

async function debugWorkspace() {
  try {
    // Clean up
    await query('DELETE FROM workspace_members WHERE 1=1');
    await query('DELETE FROM workspaces WHERE 1=1');
    await query('DELETE FROM users WHERE email LIKE \'%test%\'');

    // Create test user
    const userResult = await query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'test@example.com', 'hashedpassword', 'John', 'Doe', NOW(), NOW())
       RETURNING id`
    );
    const userId = userResult.rows[0].id;
    console.log('Created user:', userId);

    // Create workspace
    const workspaceId = generateId();
    const memberId = generateId();
    const now = new Date();

    await query(
      `INSERT INTO workspaces (id, name, description, logo, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [workspaceId, 'Test Workspace', 'A test workspace', null, userId, now, now]
    );
    console.log('Created workspace:', workspaceId);

    // Add member
    await query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [memberId, workspaceId, userId, 'OWNER', now, now]
    );
    console.log('Added member:', memberId);

    // Try to get workspace
    const result = await query(
      `SELECT 
        w.id, w.name, w.description, w.logo, w.owner_id, w.created_at, w.updated_at,
        wm.id as member_id, wm.user_id, wm.role, wm.joined_at,
        u.email, u."firstName", u."lastName", u.avatar
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       LEFT JOIN users u ON wm.user_id = u.id
       WHERE w.id = $1
       ORDER BY wm.joined_at ASC`,
      [workspaceId]
    );

    console.log('Query result:', result.rows);
    console.log('Row count:', result.rows.length);

    if (result.rows.length > 0) {
      console.log('First row:', result.rows[0]);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugWorkspace();