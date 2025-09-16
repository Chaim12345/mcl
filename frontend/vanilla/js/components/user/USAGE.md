# User Management Components Usage Guide

## Quick Start

### 1. Initialize User Management Service
```javascript
import { userManagementService } from './services/userManagement.js';

await userManagementService.init();
```

### 2. Basic User List
```javascript
import { UserList } from './components/user/UserList.js';

const container = document.getElementById('user-list');
const userList = new UserList(container, {
  mode: 'workspace', // 'workspace' or 'system'
  workspaceId: 'workspace-123',
  showRoles: true,
  showActions: true
});
```

### 3. User Profile Management
```javascript
import { UserProfile } from './components/user/UserProfile.js';

const container = document.getElementById('user-profile');
const profile = new UserProfile(container, userData, {
  mode: 'edit', // 'view', 'edit', 'admin'
  showPreferences: true,
  showSecurity: true
});
```

### 4. Workspace Member Management
```javascript
import { WorkspaceMemberManager } from './components/user/WorkspaceMemberManager.js';

const container = document.getElementById('member-manager');
const manager = new WorkspaceMemberManager(container, 'workspace-123', {
  showInvitations: true,
  showBulkOperations: true
});
```

### 5. Admin Dashboard
```javascript
import { AdminDashboard } from './components/user/AdminDashboard.js';

const container = document.getElementById('admin-dashboard');
const dashboard = new AdminDashboard(container, {
  showSystemStats: true,
  showUserList: true
});
```

### 6. User Search with Autocomplete
```javascript
import { UserSearch } from './components/user/UserSearch.js';

const input = document.getElementById('user-search');
const search = new UserSearch(input, {
  placeholder: 'Search users...',
  includeRoles: true,
  maxResults: 10
});

search.on('userSelected', (user) => {
  console.log('Selected user:', user);
});
```

## Integration Examples

### Workspace Invitation Flow
```javascript
// Setup invitation interface
const inviteContainer = document.getElementById('invite-section');
const invite = new UserInvite(inviteContainer, 'workspace-123');

invite.on('invitationsSent', (invitations) => {
  console.log('Invitations sent:', invitations);
  // Refresh member list
  userList.refresh();
});

// Listen for user updates
userManagementService.on('userUpdated', (user) => {
  console.log('User updated:', user);
  // Refresh relevant components
});
```

### Permission Management
```javascript
const permissionsContainer = document.getElementById('permissions');
const permissions = new UserPermissions(permissionsContainer, 'user-123', 'workspace-123');

permissions.on('permissionsUpdated', (data) => {
  console.log('Permissions changed:', data);
});
```

## CSS Styling

Add these CSS classes for styling:

```css
/* User List Styles */
.user-list-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Search Dropdown */
.user-search-dropdown {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  max-height: 300px;
  overflow-y: auto;
}

.user-suggestion {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.user-suggestion:hover,
.user-suggestion.selected {
  background-color: #f8f9fa;
}
```

## API Integration

All components use the `userManagementService` which integrates with your backend:

- **GET /api/v1/users** - List all users
- **GET /api/v1/users/:id** - Get user details
- **PUT /api/v1/users/:id** - Update user
- **POST /api/v1/workspaces/:id/invitations** - Send invitations
- **GET /api/v1/users/search** - Search users
- **GET /api/v1/users/:id/activity** - Get user activity

## Responsive Design

All components are mobile-responsive with:
- Flexible grid layouts
- Touch-friendly interactions
- Collapsible navigation on mobile
- Responsive tables and cards

## Event Handling

All components extend EventEmitter and emit events:

```javascript
// Common events
component.on('userSelected', (user) => {})
component.on('userUpdated', (user) => {})
component.on('permissionsUpdated', (data) => {})
component.on('invitationsSent', (invitations) => {})
component.on('error', (error) => {})
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Dependencies

- Vanilla JS (no external frameworks)
- WebSocketService for real-time updates
- EventEmitter for component communication
- Debounce utility for search optimization