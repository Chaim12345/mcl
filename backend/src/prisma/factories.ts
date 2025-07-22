// Import types directly to avoid dependency on generated Prisma client
import * as bcryptjs from 'bcryptjs';

// Define types manually to avoid dependency on generated Prisma client
type PrismaUserCreateInput = {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  isActive?: boolean;
  lastLogin?: Date | null;
  [key: string]: any;
};

type PrismaWorkspaceCreateInput = {
  name: string;
  description?: string | null;
  logo?: string | null;
  owner: { connect: { id: string } };
  [key: string]: any;
};

type PrismaBoardCreateInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  workspace: { connect: { id: string } };
  [key: string]: any;
};

type PrismaBoardColumnCreateInput = {
  name: string;
  order: number;
  board: { connect: { id: string } };
  [key: string]: any;
};

type PrismaBoardItemCreateInput = {
  title: string;
  description?: string | null;
  order: number;
  board: { connect: { id: string } };
  column: { connect: { id: string } };
  dueDate?: Date | null;
  priority?: string;
  status?: string;
  [key: string]: any;
};

/**
 * Factory functions for generating test data
 */

/**
 * Create a user object with default values
 * @param overrides - Override default values
 * @returns User object
 */
export function createUser(overrides: Partial<PrismaUserCreateInput> = {}): PrismaUserCreateInput {
  const defaultPassword = bcryptjs.hashSync('password123', 10);
  
  return {
    email: `user_${Date.now()}@example.com`,
    password: defaultPassword,
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };
}

/**
 * Create a workspace object with default values
 * @param owner - User who owns the workspace
 * @param overrides - Override default values
 * @returns Workspace object
 */
export function createWorkspace(
  owner: { id: string },
  overrides: Partial<Omit<PrismaWorkspaceCreateInput, 'owner'>> = {}
): PrismaWorkspaceCreateInput {
  return {
    name: `Workspace ${Date.now()}`,
    description: 'A test workspace',
    owner: {
      connect: { id: owner.id },
    },
    ...overrides,
  };
}

/**
 * Create a board object with default values
 * @param workspace - Workspace the board belongs to
 * @param overrides - Override default values
 * @returns Board object
 */
export function createBoard(
  workspace: { id: string },
  overrides: Partial<Omit<PrismaBoardCreateInput, 'workspace'>> = {}
): PrismaBoardCreateInput {
  return {
    name: `Board ${Date.now()}`,
    description: 'A test board',
    workspace: {
      connect: { id: workspace.id },
    },
    ...overrides,
  };
}

/**
 * Create a board column object with default values
 * @param board - Board the column belongs to
 * @param order - Order of the column
 * @param overrides - Override default values
 * @returns BoardColumn object
 */
export function createBoardColumn(
  board: { id: string },
  order: number,
  overrides: Partial<Omit<PrismaBoardColumnCreateInput, 'board' | 'order'>> = {}
): PrismaBoardColumnCreateInput {
  return {
    name: `Column ${order}`,
    order,
    board: {
      connect: { id: board.id },
    },
    ...overrides,
  };
}

/**
 * Create a board item object with default values
 * @param board - Board the item belongs to
 * @param column - Column the item belongs to
 * @param order - Order of the item
 * @param overrides - Override default values
 * @returns BoardItem object
 */
export function createBoardItem(
  board: { id: string },
  column: { id: string },
  order: number,
  overrides: Partial<Omit<PrismaBoardItemCreateInput, 'board' | 'column' | 'order'>> = {}
): PrismaBoardItemCreateInput {
  return {
    title: `Item ${order}`,
    description: 'A test item',
    order,
    board: {
      connect: { id: board.id },
    },
    column: {
      connect: { id: column.id },
    },
    ...overrides,
  };
}