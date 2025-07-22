// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Comment types
export interface Comment {
  id: string;
  content: string;
  itemId: string;
  userId: string;
  parentId: string | null;
  mentions: string[];
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  replies?: Comment[];
}

// Activity types
export interface Activity {
  id: string;
  action: string;
  entityId: string;
  entityType: string;
  itemId: string | null;
  userId: string;
  metadata: Record<string, any>;
  createdAt: string;
  formattedMessage: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  item?: {
    id: string;
    title: string;
  } | null;
}

export interface PaginatedActivities {
  activities: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'admin' | 'member';
  user?: User;
  joinedAt: string;
}

// Board types
export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items?: BoardItem[];
}

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  type: 'text' | 'status' | 'people' | 'date' | 'tags' | 'number';
  settings: Record<string, any>;
  position: number;
}

export interface BoardItem {
  id: string;
  boardId: string;
  name: string;
  position: number;
  fieldValues: ItemFieldValue[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFieldValue {
  id: string;
  itemId: string;
  columnId: string;
  value: any;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}