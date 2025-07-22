// Enum types
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum Status {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  MENTION = 'MENTION',
  ASSIGNMENT = 'ASSIGNMENT',
  COMMENT = 'COMMENT',
  DUE_DATE = 'DUE_DATE',
  INVITATION = 'INVITATION',
}

// Base model interfaces
export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: Date;
  updatedAt: Date;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardItem {
  id: string;
  title: string;
  description: string | null;
  order: number;
  boardId: string;
  columnId: string;
  dueDate: Date | null;
  priority: Priority;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  itemId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityId: string;
  entityType: string;
  itemId: string | null;
  userId: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  recipientId: string;
  senderId: string | null;
  entityId: string | null;
  entityType: string | null;
  createdAt: Date;
}