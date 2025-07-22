import { config } from 'dotenv';
import { query } from './client.js';
import { generateId } from '../utils/id.js';
import { Priority, Role, Status, NotificationType } from '../models/types.js';
import bcrypt from 'bcryptjs';

// Hash password using bcrypt
function hashPassword(password: string): string {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

// Load environment variables
config();

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        console.log('DEBUG: Inside seedDatabase function');

        // Clear existing data
        await clearDatabase();

        // Create admin user
        const adminId = generateId();
        const adminUser = await createUser({
            id: adminId,
            email: 'admin@example.com',
            password: hashPassword('password123'),
            firstName: 'Admin',
            lastName: 'User',
        });
        console.log(`✅ Created admin user: ${adminUser.email}`);

        // Create regular users
        const users = [];
        for (let i = 1; i <= 5; i++) {
            const user = await createUser({
                id: generateId(),
                email: `user${i}@example.com`,
                password: hashPassword('password123'),
                firstName: `User`,
                lastName: `${i}`,
            });
            users.push(user);
        }
        console.log(`✅ Created ${users.length} regular users`);

        // Create workspaces
        const workspace1Id = generateId();
        const workspace1 = await createWorkspace({
            id: workspace1Id,
            name: 'Marketing Team',
            description: 'Workspace for marketing team projects',
            ownerId: adminId,
        });

        const workspace2Id = generateId();
        const workspace2 = await createWorkspace({
            id: workspace2Id,
            name: 'Development Team',
            description: 'Workspace for development team projects',
            ownerId: users[0].id,
        });
        console.log(`✅ Created workspaces: ${workspace1.name}, ${workspace2.name}`);

        // Add members to workspaces
        for (let i = 0; i < 3; i++) {
            await createWorkspaceMember({
                id: generateId(),
                workspaceId: workspace1Id,
                userId: users[i].id,
                role: i === 0 ? Role.ADMIN : Role.MEMBER,
                joinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        for (let i = 2; i < 5; i++) {
            await createWorkspaceMember({
                id: generateId(),
                workspaceId: workspace2Id,
                userId: users[i].id,
                role: Role.MEMBER,
                joinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        // Add admin to development workspace
        await createWorkspaceMember({
            id: generateId(),
            workspaceId: workspace2Id,
            userId: adminId,
            role: Role.ADMIN,
            joinedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        console.log('✅ Added members to workspaces');

        // Create boards
        const marketingBoardId = generateId();
        const marketingBoard = await createBoard({
            id: marketingBoardId,
            name: 'Q3 Marketing Campaigns',
            description: 'Planning and tracking for Q3 marketing campaigns',
            workspaceId: workspace1Id,
        });

        const devBoardId = generateId();
        const devBoard = await createBoard({
            id: devBoardId,
            name: 'Product Roadmap',
            description: 'Development roadmap for the product',
            workspaceId: workspace2Id,
        });
        console.log(`✅ Created boards: ${marketingBoard.name}, ${devBoard.name}`);

        // Create columns for marketing board
        const marketingColumns = [];
        const marketingColumnNames = ['Backlog', 'In Progress', 'Review', 'Complete'];
        for (let i = 0; i < marketingColumnNames.length; i++) {
            const columnName = marketingColumnNames[i];
            if (columnName) {
                const column = await createBoardColumn({
                    id: generateId(),
                    name: columnName,
                    order: i,
                    boardId: marketingBoardId,
                });
                marketingColumns.push(column);
            }
        }

        // Create columns for dev board
        const devColumns = [];
        const devColumnNames = ['To Do', 'In Progress', 'Testing', 'Done'];
        for (let i = 0; i < devColumnNames.length; i++) {
            const columnName = devColumnNames[i];
            if (columnName) {
                const column = await createBoardColumn({
                    id: generateId(),
                    name: columnName,
                    order: i,
                    boardId: devBoardId,
                });
                devColumns.push(column);
            }
        }
        console.log('✅ Created board columns');

        // Create items for marketing board
        await createBoardItem({
            id: generateId(),
            title: 'Social Media Campaign',
            description: 'Plan and execute social media campaign for product launch',
            order: 0,
            boardId: marketingBoardId,
            columnId: marketingColumns[0].id,
            priority: Priority.HIGH,
            status: Status.TODO,
        });

        await createBoardItem({
            id: generateId(),
            title: 'Email Newsletter',
            description: 'Create monthly email newsletter',
            order: 0,
            boardId: marketingBoardId,
            columnId: marketingColumns[1].id,
            priority: Priority.MEDIUM,
            status: Status.IN_PROGRESS,
        });

        // Create items for dev board
        const devItem1Id = generateId();
        await createBoardItem({
            id: devItem1Id,
            title: 'User Authentication',
            description: 'Implement user authentication system',
            order: 0,
            boardId: devBoardId,
            columnId: devColumns[0].id,
            priority: Priority.HIGH,
            status: Status.TODO,
        });

        await createBoardItem({
            id: generateId(),
            title: 'Dashboard UI',
            description: 'Design and implement dashboard UI',
            order: 0,
            boardId: devBoardId,
            columnId: devColumns[1].id,
            priority: Priority.MEDIUM,
            status: Status.IN_PROGRESS,
        });
        console.log('✅ Created board items');

        // Create comments
        await createComment({
            id: generateId(),
            content: 'We should prioritize this for the next sprint',
            itemId: devItem1Id,
            userId: adminId,
        });

        await createComment({
            id: generateId(),
            content: 'I can help with this task',
            itemId: devItem1Id,
            userId: users[2].id,
        });
        console.log('✅ Created comments');

        // Create activity logs
        await createActivityLog({
            id: generateId(),
            action: 'created',
            entityId: devItem1Id,
            entityType: 'BoardItem',
            userId: adminId,
            itemId: devItem1Id,
        });
        console.log('✅ Created activity logs');

        // Create notifications
        await createNotification({
            id: generateId(),
            type: NotificationType.MENTION,
            title: 'You were mentioned in a comment',
            message: 'Admin User mentioned you in a comment',
            recipientId: users[2].id,
            senderId: adminId,
            entityId: devItem1Id,
            entityType: 'Comment',
        });

        await createNotification({
            id: generateId(),
            type: NotificationType.ASSIGNMENT,
            title: 'Task assigned to you',
            message: 'You have been assigned to User Authentication task',
            recipientId: users[2].id,
            senderId: adminId,
            entityId: devItem1Id,
            entityType: 'BoardItem',
        });
        console.log('✅ Created notifications');

        console.log('✅ Database seeding completed successfully');
    } catch (error) {
        console.error('❌ Error during database seeding:', error);
        throw error;
    }
}

/**
 * Clear all data from the database
 */
async function clearDatabase() {
    console.log('🧹 Clearing existing data...');

    // Delete in order to respect foreign key constraints
    await query('DELETE FROM notifications');
    await query('DELETE FROM activity_logs');
    await query('DELETE FROM comments');
    await query('DELETE FROM board_items');
    await query('DELETE FROM board_columns');
    await query('DELETE FROM boards');
    await query('DELETE FROM workspace_members');
    await query('DELETE FROM workspaces');
    await query('DELETE FROM users');

    console.log('✅ Database cleared');
}

/**
 * Create a user
 */
async function createUser(data: {
    id: string;
    email: string;
    password: string;
    firstName: string | null;
    lastName: string | null;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [data.id, data.email, data.password, data.firstName, data.lastName, now, now]
    );
    return rows[0];
}

/**
 * Create a workspace
 */
async function createWorkspace(data: {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO workspaces (id, name, description, "ownerId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [data.id, data.name, data.description, data.ownerId, now, now]
    );
    return rows[0];
}

/**
 * Create a workspace member
 */
async function createWorkspaceMember(data: {
    id: string;
    workspaceId: string;
    userId: string;
    role: Role;
    joinedAt: string | Date;
    updatedAt: string | Date;
}) {
    const joinedAtStr = data.joinedAt instanceof Date ? data.joinedAt.toISOString() : data.joinedAt;
    const updatedAtStr = data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt;
    
    const { rows } = await query(
        `INSERT INTO workspace_members (id, "workspaceId", "userId", role, "joinedAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [data.id, data.workspaceId, data.userId, data.role, joinedAtStr, updatedAtStr]
    );
    return rows[0];
}

/**
 * Create a board
 */
async function createBoard(data: {
    id: string;
    name: string;
    description: string | null;
    workspaceId: string;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO boards (id, name, description, "workspaceId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [data.id, data.name, data.description, data.workspaceId, now, now]
    );
    return rows[0];
}

/**
 * Create a board column
 */
async function createBoardColumn(data: {
    id: string;
    name: string;
    order: number;
    boardId: string;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO board_columns (id, name, "order", "boardId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [data.id, data.name, data.order, data.boardId, now, now]
    );
    return rows[0];
}

/**
 * Create a board item
 */
async function createBoardItem(data: {
    id: string;
    title: string;
    description: string | null;
    order: number;
    boardId: string;
    columnId: string;
    priority: Priority;
    status: Status;
    dueDate?: Date | null;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO board_items (id, title, description, "order", "boardId", "columnId", priority, status, "dueDate", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
        [data.id, data.title, data.description, data.order, data.boardId, data.columnId, data.priority, data.status, data.dueDate || null, now, now]
    );
    return rows[0];
}

/**
 * Create a comment
 */
async function createComment(data: {
    id: string;
    content: string;
    itemId: string;
    userId: string;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO comments (id, content, "itemId", "userId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [data.id, data.content, data.itemId, data.userId, now, now]
    );
    return rows[0];
}

/**
 * Create an activity log
 */
async function createActivityLog(data: {
    id: string;
    action: string;
    entityId: string;
    entityType: string;
    userId: string;
    itemId: string | null;
    metadata?: Record<string, unknown> | null;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO activity_logs (id, action, "entityId", "entityType", "userId", "itemId", metadata, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
        [data.id, data.action, data.entityId, data.entityType, data.userId, data.itemId, data.metadata ? JSON.stringify(data.metadata) : null, now]
    );
    return rows[0];
}

/**
 * Create a notification
 */
async function createNotification(data: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    recipientId: string;
    senderId: string | null;
    entityId: string | null;
    entityType: string | null;
}) {
    const now = new Date();
    const { rows } = await query(
        `INSERT INTO notifications (id, type, title, message, "recipientId", "senderId", "entityId", "entityType", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
        [data.id, data.type, data.title, data.message, data.recipientId, data.senderId, data.entityId, data.entityType, now]
    );
    return rows[0];
}

// Run seeding regardless of how the script is invoked
console.log('DEBUG: Starting seed process');
seedDatabase()
    .then(() => {
        console.log('DEBUG: Seed completed successfully');
        if (import.meta.url === `file://${process.argv[1]}`) {
            process.exit(0);
        }
    })
    .catch((_error) => {
        console.error('DEBUG: Seed failed');
        if (import.meta.url === `file://${process.argv[1]}`) {
            process.exit(1);
        }
    });

export { seedDatabase };