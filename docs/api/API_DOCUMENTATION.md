# API Documentation - Project Management Platform

## Overview

This document provides comprehensive API documentation for the Project Management Platform built with Go and vanilla JavaScript. The API follows RESTful principles and uses JSON for data exchange.

## Base URL

- **Development**: `http://localhost:8080`
- **Production**: `https://your-domain.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

#### POST /api/auth/login
Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/logout
Invalidate current session and tokens.

**Headers:** `Authorization: Bearer <token>`

## Workspace Management

### GET /api/workspaces
Get all workspaces for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "My Workspace",
      "description": "Main workspace for projects",
      "owner_id": "507f1f77bcf86cd799439012",
      "members": [
        {
          "user_id": "507f1f77bcf86cd799439012",
          "role": "owner",
          "joined_at": "2024-01-01T12:00:00Z"
        }
      ],
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### POST /api/workspaces
Create a new workspace.

**Request Body:**
```json
{
  "name": "New Workspace",
  "description": "Description of the workspace"
}
```

### GET /api/workspaces/{workspaceId}
Get a specific workspace by ID.

### PUT /api/workspaces/{workspaceId}
Update workspace details.

### DELETE /api/workspaces/{workspaceId}
Delete a workspace and all its contents.

## Board Management

### GET /api/boards
Get boards for a workspace.

**Query Parameters:**
- `workspace_id` (required): Workspace ID
- `page` (optional): Page number
- `limit` (optional): Items per page

### POST /api/boards
Create a new board.

**Request Body:**
```json
{
  "name": "Project Board",
  "description": "Main project tracking board",
  "workspace_id": "507f1f77bcf86cd799439011",
  "columns": ["To Do", "In Progress", "Done"]
}
```

### GET /api/boards/{boardId}
Get a specific board with its items.

### PUT /api/boards/{boardId}
Update board details.

### DELETE /api/boards/{boardId}
Delete a board and all its items.

## Item Management

### GET /api/items
Get items with filtering and pagination.

**Query Parameters:**
- `board_id` (optional): Filter by board
- `status` (optional): Filter by status
- `assignee_id` (optional): Filter by assignee
- `priority` (optional): Filter by priority (low, medium, high, urgent)
- `search` (optional): Search in titles and descriptions
- `page` (optional): Page number
- `limit` (optional): Items per page

### POST /api/items
Create a new item.

**Request Body:**
```json
{
  "name": "New Task",
  "description": "Task description with details",
  "board_id": "507f1f77bcf86cd799439011",
  "status": "To Do",
  "priority": "medium",
  "assignee_id": "507f1f77bcf86cd799439012",
  "due_date": "2024-12-31T23:59:59Z",
  "tags": ["feature", "frontend"]
}
```

### GET /api/items/{itemId}
Get a specific item with comments.

### PUT /api/items/{itemId}
Update item details.

### DELETE /api/items/{itemId}
Delete an item and all its comments.

## Comment System

### POST /api/comments
Add a comment to an item.

**Request Body:**
```json
{
  "content": "This is a comment with @user@example.com mention",
  "item_id": "507f1f77bcf86cd799439011"
}
```

### PUT /api/comments/{commentId}
Update comment content.

### DELETE /api/comments/{commentId}
Delete a comment.

## Search and Filtering

### GET /api/search
Global search across items, comments, and boards.

**Query Parameters:**
- `q` (required): Search query
- `type` (optional): Entity type (items, comments, boards, all)
- `workspace_id` (optional): Limit to workspace
- `board_id` (optional): Limit to board
- `page` (optional): Page number
- `limit` (optional): Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "comments": [...],
    "boards": [...],
    "total": 25,
    "query": "search term",
    "execution_time": "15ms"
  }
}
```

### POST /api/filters
Apply complex filters to items.

**Request Body:**
```json
{
  "filters": [
    {
      "field": "status",
      "operator": "equals",
      "value": "In Progress"
    },
    {
      "field": "priority",
      "operator": "in",
      "value": ["high", "urgent"]
    },
    {
      "field": "due_date",
      "operator": "less_than",
      "value": "2024-12-31T23:59:59Z"
    }
  ],
  "logic": "AND",
  "workspace_id": "507f1f77bcf86cd799439011"
}
```

### GET /api/saved-filters
Get user's saved filters.

### POST /api/saved-filters
Save a filter configuration.

### DELETE /api/saved-filters/{filterId}
Delete a saved filter.

## Health and Monitoring

### GET /health
Basic health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "uptime": "2h30m15s"
}
```

### GET /health/ready
Readiness check for load balancers.

### GET /health/live
Liveness check for container orchestration.

### GET /metrics
Prometheus metrics endpoint.

## Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": {...}
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {...}
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

API requests are rate limited to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **Authentication endpoints**: 5 requests per minute per IP
- **Search endpoints**: 50 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Window reset time (Unix timestamp)

## Data Models

### User
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "avatar_url": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Workspace
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "owner_id": "string",
  "members": [
    {
      "user_id": "string",
      "role": "owner|admin|member|viewer",
      "joined_at": "datetime"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Board
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "workspace_id": "string",
  "columns": ["string"],
  "created_by": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Item
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "board_id": "string",
  "status": "string",
  "priority": "low|medium|high|urgent",
  "assignee_id": "string",
  "assignee": "User",
  "created_by": "string",
  "due_date": "datetime",
  "tags": ["string"],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Comment
```json
{
  "id": "string",
  "content": "string",
  "item_id": "string",
  "author_id": "string",
  "author": "User",
  "mentions": ["string"],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## SDK and Client Libraries

### JavaScript/Node.js
```javascript
import { ProjectManagementAPI } from '@your-org/pm-api-client';

const api = new ProjectManagementAPI({
  baseURL: 'https://api.your-domain.com',
  apiKey: 'your-api-key'
});

// Login
const { data } = await api.auth.login('user@example.com', 'password');

// Get workspaces
const workspaces = await api.workspaces.list();

// Create item
const item = await api.items.create({
  name: 'New Task',
  board_id: 'board-id',
  status: 'To Do'
});
```

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

**Get Workspaces:**
```bash
curl -X GET http://localhost:8080/api/workspaces \
  -H "Authorization: Bearer <token>"
```

**Create Item:**
```bash
curl -X POST http://localhost:8080/api/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Task",
    "board_id": "507f1f77bcf86cd799439011",
    "status": "To Do",
    "priority": "medium"
  }'
```

## Webhooks

The API supports webhooks for real-time notifications:

### Webhook Events
- `item.created`
- `item.updated`
- `item.deleted`
- `comment.created`
- `workspace.member.added`
- `board.created`

### Webhook Payload
```json
{
  "event": "item.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "item": {...},
    "workspace_id": "string",
    "board_id": "string",
    "user_id": "string"
  }
}
```

## Testing

### Test Environment
- **Base URL**: `http://localhost:8080`
- **Test Database**: Isolated MongoDB instance
- **Authentication**: Use test credentials

### Postman Collection
Import the Postman collection for easy API testing:
```
docs/api/postman_collection.json
```

### API Testing Tools
- **Postman**: GUI-based API testing
- **curl**: Command-line testing
- **HTTPie**: User-friendly command-line tool
- **Insomnia**: Alternative GUI client

## Versioning

The API uses semantic versioning:
- **Current Version**: v1.0.0
- **Version Header**: `API-Version: 1.0`
- **Deprecation**: 6 months notice for breaking changes

## Support

For API support and questions:
- **Documentation**: This document
- **Issues**: GitHub Issues
- **Email**: api-support@your-domain.com
- **Status Page**: https://status.your-domain.com