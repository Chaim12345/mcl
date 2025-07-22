import { createRequire } from 'module';
import * as bcryptjs from 'bcryptjs';

// Use createRequire to import PrismaClient in ESM context
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data
    await clearDatabase();

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: bcryptjs.hashSync('password123', 10),
        firstName: 'Admin',
        lastName: 'User',
      },
    });
    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create regular users
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const user = await prisma.user.create({
        data: {
          email: `user${i}@example.com`,
          password: bcryptjs.hashSync('password123', 10),
          firstName: `User`,
          lastName: `${i}`,
        },
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} regular users`);

    // Create workspaces
    const workspace1 = await prisma.workspace.create({
      data: {
        name: 'Marketing Team',
        description: 'Workspace for marketing team projects',
        owner: { connect: { id: adminUser.id } },
      },
    });

    const workspace2 = await prisma.workspace.create({
      data: {
        name: 'Development Team',
        description: 'Workspace for development team projects',
        owner: { connect: { id: users[0].id } },
      },
    });
    console.log(`✅ Created workspaces: ${workspace1.name}, ${workspace2.name}`);

    // Add members to workspaces
    for (let i = 0; i < 3; i++) {
      await prisma.workspaceMember.create({
        data: {
          workspace: { connect: { id: workspace1.id } },
          user: { connect: { id: users[i].id } },
          role: i === 0 ? 'ADMIN' : 'MEMBER',
        },
      });
    }

    for (let i = 2; i < 5; i++) {
      await prisma.workspaceMember.create({
        data: {
          workspace: { connect: { id: workspace2.id } },
          user: { connect: { id: users[i].id } },
          role: 'MEMBER',
        },
      });
    }

    // Add admin to development workspace
    await prisma.workspaceMember.create({
      data: {
        workspace: { connect: { id: workspace2.id } },
        user: { connect: { id: adminUser.id } },
        role: 'ADMIN',
      },
    });
    console.log('✅ Added members to workspaces');

    // Create boards
    const marketingBoard = await prisma.board.create({
      data: {
        name: 'Q3 Marketing Campaigns',
        description: 'Planning and tracking for Q3 marketing campaigns',
        workspace: { connect: { id: workspace1.id } },
      },
    });

    const devBoard = await prisma.board.create({
      data: {
        name: 'Product Roadmap',
        description: 'Development roadmap for the product',
        workspace: { connect: { id: workspace2.id } },
      },
    });
    console.log(`✅ Created boards: ${marketingBoard.name}, ${devBoard.name}`);

    // Create columns for marketing board
    const marketingColumns = [];
    const marketingColumnNames = ['Backlog', 'In Progress', 'Review', 'Complete'];
    for (let i = 0; i < marketingColumnNames.length; i++) {
      const column = await prisma.boardColumn.create({
        data: {
          name: marketingColumnNames[i],
          order: i,
          board: { connect: { id: marketingBoard.id } },
        },
      });
      marketingColumns.push(column);
    }

    // Create columns for dev board
    const devColumns = [];
    const devColumnNames = ['To Do', 'In Progress', 'Testing', 'Done'];
    for (let i = 0; i < devColumnNames.length; i++) {
      const column = await prisma.boardColumn.create({
        data: {
          name: devColumnNames[i],
          order: i,
          board: { connect: { id: devBoard.id } },
        },
      });
      devColumns.push(column);
    }
    console.log('✅ Created board columns');

    // Create items for marketing board
    await prisma.boardItem.create({
      data: {
        title: 'Social Media Campaign',
        description: 'Plan and execute social media campaign for product launch',
        order: 0,
        priority: 'HIGH',
        status: 'TODO',
        board: { connect: { id: marketingBoard.id } },
        column: { connect: { id: marketingColumns[0].id } },
      },
    });

    await prisma.boardItem.create({
      data: {
        title: 'Email Newsletter',
        description: 'Create monthly email newsletter',
        order: 0,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        board: { connect: { id: marketingBoard.id } },
        column: { connect: { id: marketingColumns[1].id } },
      },
    });

    // Create items for dev board
    const devItem1 = await prisma.boardItem.create({
      data: {
        title: 'User Authentication',
        description: 'Implement user authentication system',
        order: 0,
        priority: 'HIGH',
        status: 'TODO',
        board: { connect: { id: devBoard.id } },
        column: { connect: { id: devColumns[0].id } },
      },
    });

    await prisma.boardItem.create({
      data: {
        title: 'Dashboard UI',
        description: 'Design and implement dashboard UI',
        order: 0,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        board: { connect: { id: devBoard.id } },
        column: { connect: { id: devColumns[1].id } },
      },
    });
    console.log('✅ Created board items');

    // Create comments
    await prisma.comment.create({
      data: {
        content: 'We should prioritize this for the next sprint',
        item: { connect: { id: devItem1.id } },
        user: { connect: { id: adminUser.id } },
      },
    });

    await prisma.comment.create({
      data: {
        content: 'I can help with this task',
        item: { connect: { id: devItem1.id } },
        user: { connect: { id: users[2].id } },
      },
    });
    console.log('✅ Created comments');

    // Create activity logs
    await prisma.activityLog.create({
      data: {
        action: 'created',
        entityId: devItem1.id,
        entityType: 'BoardItem',
        user: { connect: { id: adminUser.id } },
        item: { connect: { id: devItem1.id } },
      },
    });
    console.log('✅ Created activity logs');

    // Create notifications
    await prisma.notification.create({
      data: {
        type: 'MENTION',
        title: 'You were mentioned in a comment',
        message: 'Admin User mentioned you in a comment',
        recipient: { connect: { id: users[2].id } },
        sender: { connect: { id: adminUser.id } },
        entityId: devItem1.id,
        entityType: 'Comment',
      },
    });

    await prisma.notification.create({
      data: {
        type: 'ASSIGNMENT',
        title: 'Task assigned to you',
        message: 'You have been assigned to User Authentication task',
        recipient: { connect: { id: users[2].id } },
        sender: { connect: { id: adminUser.id } },
        entityId: devItem1.id,
        entityType: 'BoardItem',
      },
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
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.boardItem.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });