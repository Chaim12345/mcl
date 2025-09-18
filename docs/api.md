# Project Management Platform - API Documentation

## Overview

The Project Management Platform provides a comprehensive RESTful API built with Go and the Gin framework. The API follows REST principles with consistent response formats, comprehensive error handling, and robust security measures.

## Base Information

- **Base URL**: `http://localhost:8080/api` (development)
- **Protocol**: HTTP/HTTPS
- **Content Type**: `application/json`
- **Authentication**: Bearer token (JWT)
- **API Version**: v1 (implicit)

## Authentication

### Authentication Flow

The API uses JWT (JSON Web Token) based authentication with a dual-token system:

- **Access Token**: Short-lived (15 minutes) for API requests
- **Refresh Token**: Long-lived (7 days) for token renewal

### Authorization Header

```http
Authorization: Bearer <access_token>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "createdAt": "2024-01-01T12:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2024-01-01T12:15:00Z"
  }
}
```

### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** Same as registration response

### Refresh Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2024-01-01T12:15:00Z"
  }
}
```

### Logout User
```http
POST /api/auth/logout
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### Forgot Password
```http
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset Password
```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_here",
  "password": "NewSecurePassword123!"
}
```

### Verify Email
```http
POST /api/auth/verify-email
```

**Request Body:**
```json
{
  "token": "verification_token_here"
}
```

### Verify Authentication
```http
GET /api/auth/verify
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true
    }
  }
}
```

## Workspace Endpoints

### Create Workspace
```http
POST /api/workspaces
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "My Workspace",
  "description": "Description of the workspace"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "My Workspace",
    "description": "Description of the workspace",
    "ownerId": "507f1f77bcf86cd799439012",
    "members": [
      {
        "userId": "507f1f77bcf86cd799439012",
        "role": "admin",
        "joinedAt": "2024-01-01T12:00:00Z"
      }
    ],
    "settings": {
      "visibility": "private",
      "allowInvites": true
    },
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

### Get User Workspaces
```http
GET /api/workspaces
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "My Workspace",
      "description": "Description of the workspace",
      "ownerId": "507f1f77bcf86cd799439012",
      "memberCount": 5,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get Workspace
```http
GET /api/workspaces/{workspaceId}
```
*Requires authentication*

### Update Workspace
```http
PUT /api/workspaces/{workspaceId}
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "Updated Workspace Name",
  "description": "Updated description"
}
```

### Delete Workspace
```http
DELETE /api/workspaces/{workspaceId}
```
*Requires authentication*

### Add Member to Workspace
```http
POST /api/workspaces/{workspaceId}/members
```
*Requires authentication*

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

### Remove Member from Workspace
```http
DELETE /api/workspaces/{workspaceId}/members/{userId}
```
*Requires authentication*

### Update Member Role
```http
PUT /api/workspaces/{workspaceId}/members/{userId}/role
```
*Requires authentication*

**Request Body:**
```json
{
  "role": "admin"
}
```

### Get Workspace Members
```http
GET /api/workspaces/{workspaceId}/members
```
*Requires authentication*

## Board Endpoints

### Create Board
```http
POST /api/boards
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "Project Board",
  "description": "Board for managing project tasks",
  "workspaceId": "507f1f77bcf86cd799439011",
  "color": "#4CAF50"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "name": "Project Board",
    "description": "Board for managing project tasks",
    "workspaceId": "507f1f77bcf86cd799439011",
    "color": "#4CAF50",
    "columns": [
      {
        "id": "col_1",
        "name": "Status",
        "type": "status",
        "position": 0,
        "settings": {
          "options": ["To Do", "In Progress", "Done"]
        }
      }
    ],
    "createdAt": "2024-01-01T12:00:00Z",
    "createdBy": "507f1f77bcf86cd799439012"
  }
}
```

### Get User Boards
```http
GET /api/boards
```
*Requires authentication*

### Get Workspace Boards
```http
GET /api/workspaces/{workspaceId}/boards
```
*Requires authentication*

### Get Board
```http
GET /api/boards/{boardId}
```
*Requires authentication*

### Update Board
```http
PUT /api/boards/{boardId}
```
*Requires authentication*

### Delete Board
```http
DELETE /api/boards/{boardId}
```
*Requires authentication*

### Add Column to Board
```http
POST /api/boards/{boardId}/columns
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "Priority",
  "type": "status",
  "settings": {
    "options": ["High", "Medium", "Low"]
  }
}
```

### Update Column
```http
PUT /api/boards/{boardId}/columns/{columnId}
```
*Requires authentication*

### Reorder Columns
```http
PUT /api/boards/{boardId}/columns/reorder
```
*Requires authentication*

**Request Body:**
```json
{
  "columns": [
    {
      "id": "col_1",
      "position": 0
    },
    {
      "id": "col_2", 
      "position": 1
    }
  ]
}
```

### Remove Column
```http
DELETE /api/boards/{boardId}/columns/{columnId}
```
*Requires authentication*

### Share Board
```http
POST /api/boards/{boardId}/share
```
*Requires authentication*

**Request Body:**
```json
{
  "email": "user@example.com",
  "permission": "write"
}
```

### Update Board Permissions
```http
PUT /api/boards/{boardId}/permissions
```
*Requires authentication*

### Get Board Permissions
```http
GET /api/boards/{boardId}/permissions
```
*Requires authentication*

## Item Endpoints

### Create Item
```http
POST /api/boards/{boardId}/items
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "New Task",
  "fieldValues": [
    {
      "columnId": "col_status",
      "value": "To Do"
    },
    {
      "columnId": "col_priority",
      "value": "High"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "name": "New Task",
    "boardId": "507f1f77bcf86cd799439013",
    "position": 0,
    "fieldValues": [
      {
        "columnId": "col_status",
        "value": "To Do",
        "updatedAt": "2024-01-01T12:00:00Z",
        "updatedBy": "507f1f77bcf86cd799439012"
      }
    ],
    "assignees": [],
    "watchers": ["507f1f77bcf86cd799439012"],
    "createdAt": "2024-01-01T12:00:00Z",
    "createdBy": "507f1f77bcf86cd799439012"
  }
}
```

### Get Board Items
```http
GET /api/boards/{boardId}/items
```
*Requires authentication*

**Query Parameters:**
- `limit` (optional): Number of items to return (default: 50)
- `skip` (optional): Number of items to skip (default: 0)

### Get Item
```http
GET /api/items/{itemId}
```
*Requires authentication*

### Update Item
```http
PUT /api/items/{itemId}
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "Updated Task Name",
  "fieldValues": [
    {
      "columnId": "col_status",
      "value": "In Progress"
    }
  ]
}
```

### Delete Item
```http
DELETE /api/items/{itemId}
```
*Requires authentication*

### Move Item
```http
POST /api/items/{itemId}/move
```
*Requires authentication*

**Request Body:**
```json
{
  "position": 2
}
```

### Get My Items
```http
GET /api/items/my
```
*Requires authentication*

### Bulk Create Items
```http
POST /api/boards/{boardId}/items/bulk
```
*Requires authentication*

**Request Body:**
```json
{
  "items": [
    {
      "name": "Task 1",
      "fieldValues": []
    },
    {
      "name": "Task 2", 
      "fieldValues": []
    }
  ]
}
```

### Bulk Update Items
```http
PUT /api/items/bulk
```
*Requires authentication*

### Bulk Delete Items
```http
DELETE /api/items/bulk
```
*Requires authentication*

**Request Body:**
```json
{
  "itemIds": ["507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
}
```

## Comment Endpoints

### Create Comment
```http
POST /api/items/{itemId}/comments
```
*Requires authentication*

**Request Body:**
```json
{
  "content": "This is a comment on the item"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439016",
    "content": "This is a comment on the item",
    "itemId": "507f1f77bcf86cd799439014",
    "authorId": "507f1f77bcf86cd799439012",
    "mentions": [],
    "attachments": [],
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

### Get Item Comments
```http
GET /api/items/{itemId}/comments
```
*Requires authentication*

### Get Threaded Comments
```http
GET /api/items/{itemId}/comments/threaded
```
*Requires authentication*

### Get Comment
```http
GET /api/comments/{commentId}
```
*Requires authentication*

### Update Comment
```http
PUT /api/comments/{commentId}
```
*Requires authentication*

**Request Body:**
```json
{
  "content": "Updated comment content"
}
```

### Delete Comment
```http
DELETE /api/comments/{commentId}
```
*Requires authentication*

### Create Reply
```http
POST /api/comments/{commentId}/replies
```
*Requires authentication*

**Request Body:**
```json
{
  "content": "This is a reply to the comment"
}
```

### Get Replies
```http
GET /api/comments/{commentId}/replies
```
*Requires authentication*

### Add Mention
```http
POST /api/comments/{commentId}/mentions
```
*Requires authentication*

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439017"
}
```

### Remove Mention
```http
DELETE /api/comments/{commentId}/mentions/{userId}
```
*Requires authentication*

### Add Attachment
```http
POST /api/comments/{commentId}/attachments
```
*Requires authentication*

**Content-Type:** `multipart/form-data`

### Remove Attachment
```http
DELETE /api/comments/{commentId}/attachments/{filename}
```
*Requires authentication*

## Activity Endpoints

### Get User Activity
```http
GET /api/activity
```
*Requires authentication*

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 50)
- `skip` (optional): Number of activities to skip (default: 0)

### Get Activity Timeline
```http
GET /api/activity/timeline
```
*Requires authentication*

### Get Recent Activity
```http
GET /api/activity/recent
```
*Requires authentication*

### Get Activity Stats
```http
GET /api/activity/stats
```
*Requires authentication*

### Get Activity
```http
GET /api/activity/{activityId}
```
*Requires authentication*

### Get Item Activity
```http
GET /api/items/{itemId}/activity
```
*Requires authentication*

### Get Board Activity
```http
GET /api/boards/{boardId}/activity
```
*Requires authentication*

### Get Workspace Activity
```http
GET /api/workspaces/{workspaceId}/activity
```
*Requires authentication*

## Search and Filter Endpoints

### Search Items
```http
GET /api/items/search
```
*Requires authentication*

**Query Parameters:**
- `query` (required): Search query string
- `limit` (optional): Number of results to return (default: 20)
- `skip` (optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439014",
        "name": "Matching Task Name",
        "boardId": "507f1f77bcf86cd799439013",
        "fieldValues": [],
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "total": 1,
    "query": "Matching"
  }
}
```

### Filter Items
```http
GET /api/items/filter
```
*Requires authentication*

**Query Parameters:**
- `boardId` (optional): Filter by board ID
- `assignee` (optional): Filter by assignee user ID
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `createdBy` (optional): Filter by creator user ID
- `dateFrom` (optional): Filter by creation date from
- `dateTo` (optional): Filter by creation date to
- `limit` (optional): Number of results (default: 50)
- `skip` (optional): Number to skip (default: 0)

### Create Saved Filter
```http
POST /api/filters
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "High Priority Items",
  "description": "Items with high priority",
  "entityType": "item",
  "workspaceId": "507f1f77bcf86cd799439011",
  "query": {
    "logic": "AND",
    "conditions": [
      {
        "field": "priority",
        "operator": "equals",
        "value": "High"
      }
    ]
  },
  "isPublic": false
}
```

### Get Saved Filters
```http
GET /api/filters
```
*Requires authentication*

**Query Parameters:**
- `workspaceId` (required): Workspace ID
- `entityType` (optional): Entity type to filter by

### Get Saved Filter
```http
GET /api/filters/{filterId}
```
*Requires authentication*

### Update Saved Filter
```http
PUT /api/filters/{filterId}
```
*Requires authentication*

### Delete Saved Filter
```http
DELETE /api/filters/{filterId}
```
*Requires authentication*

## Health Check Endpoints

### Basic Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0"
}
```

### Readiness Check
```http
GET /health/ready
```

### Liveness Check
```http
GET /health/live
```

### Metrics
```http
GET /metrics
```

### Prometheus Metrics
```http
GET /metrics/prometheus
```

## Error Codes

### Authentication Errors
- `UNAUTHORIZED` - Authentication required
- `INVALID_CREDENTIALS` - Invalid email or password
- `TOKEN_EXPIRED` - Access token has expired
- `INVALID_TOKEN` - Invalid or malformed token
- `INVALID_TOKEN_TYPE` - Wrong token type (refresh vs access)

### Validation Errors
- `VALIDATION_ERROR` - Request validation failed
- `INVALID_REQUEST` - Malformed request body
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `EMAIL_ALREADY_EXISTS` - Email already registered

### Authorization Errors
- `FORBIDDEN` - Insufficient permissions
- `ACCESS_DENIED` - Access denied to resource

### Resource Errors
- `NOT_FOUND` - Resource not found
- `ALREADY_EXISTS` - Resource already exists
- `CONFLICT` - Resource conflict

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Too many requests

### Server Errors
- `INTERNAL_ERROR` - Internal server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

## Rate Limits

### Authentication Endpoints
- **Rate Limit**: 10 requests per minute per IP
- **Burst Size**: 3 requests
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### General API Endpoints
- **Rate Limit**: 100 requests per minute per user
- **Burst Size**: 10 requests

## Pagination

Most list endpoints support pagination using query parameters:

- `limit`: Number of items to return (default varies by endpoint)
- `skip`: Number of items to skip (default: 0)

**Example:**
```http
GET /api/items?limit=20&skip=40
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

**Filtering:**
```http
GET /api/items?status=In Progress&assignee=507f1f77bcf86cd799439012
```

**Sorting:**
```http
GET /api/items?sort=createdAt&order=desc
```

## WebSocket Endpoints

### Connect to WebSocket
```
ws://localhost:8080/ws?token=<access_token>
```

### WebSocket Events

#### Item Updates
```json
{
  "type": "item_updated",
  "data": {
    "itemId": "507f1f77bcf86cd799439014",
    "boardId": "507f1f77bcf86cd799439013",
    "changes": {
      "name": "Updated Task Name"
    }
  }
}
```

#### New Comments
```json
{
  "type": "comment_created",
  "data": {
    "commentId": "507f1f77bcf86cd799439016",
    "itemId": "507f1f77bcf86cd799439014",
    "authorId": "507f1f77bcf86cd799439012",
    "content": "New comment content"
  }
}
```

#### Board Changes
```json
{
  "type": "board_updated",
  "data": {
    "boardId": "507f1f77bcf86cd799439013",
    "changes": {
      "columns": [...]
    }
  }
}
```

## SDKs and Libraries

### cURL Examples

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Create workspace
curl -X POST http://localhost:8080/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"My Workspace","description":"Description"}'

# Get items
curl -X GET http://localhost:8080/api/boards/507f1f77bcf86cd799439013/items \
  -H "Authorization: Bearer <token>"
```

### JavaScript/Node.js Example

```javascript
const API_BASE = 'http://localhost:8080/api';

class ProjectManagementAPI {
  constructor(token) {
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: data ? JSON.stringify(data) : null
    });

    return response.json();
  }

  async createWorkspace(name, description) {
    return this.request('POST', '/workspaces', { name, description });
  }

  async getWorkspaces() {
    return this.request('GET', '/workspaces');
  }

  async createBoard(workspaceId, name, description) {
    return this.request('POST', '/boards', { 
      workspaceId, name, description 
    });
  }
}

// Usage
const api = new ProjectManagementAPI('your-access-token');
const workspaces = await api.getWorkspaces();
```

This API documentation provides comprehensive coverage of all endpoints with examples, error handling, and integration guidance for building client applications.
