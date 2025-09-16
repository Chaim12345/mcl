/**
 * User Management Components - Index
 * Export all user management components
 */

export { userManagementService } from '../../services/userManagement.js';
export { UserList } from './UserList.js';
export { UserProfile } from './UserProfile.js';
export { UserInvite } from './UserInvite.js';
export { UserPermissions } from './UserPermissions.js';
export { UserActivity } from './UserActivity.js';
export { WorkspaceMemberManager } from './WorkspaceMemberManager.js';
export { UserSettings } from './UserSettings.js';
export { AdminDashboard } from './AdminDashboard.js';
export { UserSearch } from './UserSearch.js';

// Re-export EventEmitter for convenience
export { EventEmitter } from '../../utils/eventEmitter.js';