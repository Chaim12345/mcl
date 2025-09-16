# Item API Documentation

This document describes the REST API endpoints for item management in the Go/Vanilla port of the project management platform.

## Base URL
All endpoints are prefixed with `/api`

## Authentication
All endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Item Endpoints

### 1. Create Item
**POST** `/boards/{boardId}/items`

Creates a new item within a board.

**Path Parameters:**
- `boardId` (string, required): The ID of the board

**Request Body:**
```json
{
  "name": "Item name",
  "position": 0,
  "fieldValues": {
    "status": "To Do",
    "priority": "High",
    "dueDate": "2024-01-15T00:00:00Z"
  },
  "assignees": ["user_id_1", "user_id_2"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "name": "Item name",
    "boardId": "board_id",
    "position": 0,
    "fieldValues": {
      "status": "To Do",
      "priority": "High",
      "dueDate": "2024-01-15T00:00:00Z"
    },
    "assignees": ["user_id_1", "user_id_2"],
    "watchers": ["creator_user_id"],
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z",
    "createdBy": "creator_user_id"
  }
}
```

### 2. Get Board Items
**GET** `/boards/{boardId}/items`

Retrieves all items in a board, ordered by position.

**Path Parameters:**
- `boardId` (string, required): The ID of the board

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_id",
      "name": "Item name",
      "boardId": "board_id",
      "position": 0,
      "fieldValues": {},
      "assignees": [],
      "watchers": [],
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "createdBy": "creator_user_id"
    }
  ]
}
```

### 3. Get Item
**GET** `/items/{itemId}`

Retrieves a specific item by ID.

**Path Parameters:**
- `itemId` (string, required): The ID of the item

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "name": "Item name",
    "boardId": "board_id",
    "position": 0,
    "fieldValues": {},
    "assignees": [],
    "watchers": [],
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z",
    "createdBy": "creator_user_id"
  }
}
```

### 4. Update Item
**PUT** `/items/{itemId}`

Updates an existing item.

**Path Parameters:**
- `itemId` (string, required): The ID of the item

**Request Body:**
```json
{
  "name": "Updated item name",
  "position": 1,
  "fieldValues": {
    "status": "In Progress"
  },
  "assignees": ["user_id_1"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "name": "Updated item name",
    "boardId": "board_id",
    "position": 1,
    "fieldValues": {
      "status": "In Progress"
    },
    "assignees": ["user_id_1"],
    "watchers": [],
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:30:00Z",
    "createdBy": "creator_user_id"
  }
}
```

### 5. Delete Item
**DELETE** `/items/{itemId}`

Deletes an item.

**Path Parameters:**
- `itemId` (string, required): The ID of the item

**Response (204 No Content):**
```json
{
  "success": true
}
```

### 6. Move Item
**POST** `/items/{itemId}/move`

Moves an item to a new position within its board.

**Path Parameters:**
- `itemId` (string, required): The ID of the item

**Request Body:**
```json
{
  "position": 2
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "name": "Item name",
    "boardId": "board_id",
    "position": 2,
    "fieldValues": {},
    "assignees": [],
    "watchers": [],
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:45:00Z",
    "createdBy": "creator_user_id"
  }
}
```

### 7. Search Items
**GET** `/items/search`

Performs a text search across item titles and descriptions.

**Query Parameters:**
- `query` (string, required): The search query
- `limit` (integer, optional): Maximum number of results (default: 20)
- `skip` (integer, optional): Number of results to skip for pagination (default: 0)

**Example:** `/items/search?query=urgent&limit=10&skip=0`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_id",
      "name": "Urgent task",
      "boardId": "board_id",
      "position": 0,
      "fieldValues": {},
      "assignees": [],
      "watchers": [],
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "createdBy": "creator_user_id"
    }
  ]
}
```

### 8. Filter Items
**GET** `/items/filter`

Filters items by status, priority, and date ranges.

**Query Parameters:**
- `status` (string, optional): Filter by status
- `priority` (string, optional): Filter by priority
- `startDate` (string, optional): Filter by creation date (ISO 8601 format)
- `endDate` (string, optional): Filter by creation date (ISO 8601 format)
- `limit` (integer, optional): Maximum number of results (default: 20)
- `skip` (integer, optional): Number of results to skip for pagination (default: 0)

**Example:** `/items/filter?status=active&priority=high&limit=10`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_id",
      "name": "High priority item",
      "boardId": "board_id",
      "position": 0,
      "fieldValues": {
        "status": "active",
        "priority": "high"
      },
      "assignees": [],
      "watchers": [],
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "createdBy": "creator_user_id"
    }
  ]
}
```

### 9. Get My Items
**GET** `/items/my`

Retrieves items assigned to the current user.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_id",
      "name": "My assigned item",
      "boardId": "board_id",
      "position": 0,
      "fieldValues": {},
      "assignees": ["current_user_id"],
      "watchers": [],
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "createdBy": "creator_user_id"
    }
  ]
}
```

## Bulk Operations

### 10. Bulk Create Items
**POST** `/boards/{boardId}/items/bulk`

Creates multiple items in a single request.

**Path Parameters:**
- `boardId` (string, required): The ID of the board

**Request Body:**
```json
{
  "items": [
    {
      "name": "Item 1",
      "fieldValues": {
        "status": "To Do"
      }
    },
    {
      "name": "Item 2",
      "fieldValues": {
        "status": "In Progress"
      }
    }
  ]
}
```

**Response (201 Created / 207 Multi-Status):**
```json
{
  "success": true,
  "data": {
    "success": [
      {
        "id": "item_id_1",
        "data": {
          "id": "item_id_1",
          "name": "Item 1",
          "boardId": "board_id",
          "position": 0,
          "fieldValues": {
            "status": "To Do"
          },
          "assignees": [],
          "watchers": [],
          "createdAt": "2024-01-01T12:00:00Z",
          "updatedAt": "2024-01-01T12:00:00Z",
          "createdBy": "creator_user_id"
        }
      }
    ],
    "errors": [
      {
        "id": "item_1",
        "error": "Validation failed: name is required"
      }
    ]
  }
}
```

### 11. Bulk Update Items
**PUT** `/items/bulk`

Updates multiple items in a single request.

**Request Body:**
```json
{
  "items": [
    {
      "id": "item_id_1",
      "data": {
        "name": "Updated Item 1",
        "fieldValues": {
          "status": "Done"
        }
      }
    },
    {
      "id": "item_id_2",
      "data": {
        "name": "Updated Item 2"
      }
    }
  ]
}
```

**Response (200 OK / 207 Multi-Status):**
```json
{
  "success": true,
  "data": {
    "success": [
      {
        "id": "item_id_1",
        "data": {
          "id": "item_id_1",
          "name": "Updated Item 1",
          "boardId": "board_id",
          "position": 0,
          "fieldValues": {
            "status": "Done"
          },
          "assignees": [],
          "watchers": [],
          "createdAt": "2024-01-01T12:00:00Z",
          "updatedAt": "2024-01-01T12:30:00Z",
          "createdBy": "creator_user_id"
        }
      }
    ],
    "errors": [
      {
        "id": "item_id_2",
        "error": "Item not found"
      }
    ]
  }
}
```

### 12. Bulk Delete Items
**DELETE** `/items/bulk`

Deletes multiple items in a single request.

**Request Body:**
```json
{
  "itemIds": ["item_id_1", "item_id_2", "item_id_3"]
}
```

**Response (200 OK / 207 Multi-Status):**
```json
{
  "success": true,
  "data": {
    "success": [
      {
        "id": "item_id_1"
      },
      {
        "id": "item_id_2"
      }
    ],
    "errors": [
      {
        "id": "item_id_3",
        "error": "Item not found"
      }
    ]
  }
}
```

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request body"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User not authenticated"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Access denied: user is not a member of the workspace containing this board"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Item not found"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

## Authorization

All item operations require board-level authorization:

1. **Board Access**: User must be a member of the workspace containing the board
2. **Item Operations**: Users can perform operations on items within boards they have access to
3. **Bulk Operations**: Each item in bulk operations is individually authorized

## Rate Limiting

All endpoints are subject to rate limiting:
- 100 requests per minute per user
- Burst size of 10 requests

## Pagination

Search and filter endpoints support pagination:
- `limit`: Maximum number of results (default: 20, max: 100)
- `skip`: Number of results to skip (default: 0)

## Field Values

Items support custom field values with different types:
- **Text**: String values
- **Status**: Predefined status options
- **Priority**: Priority levels (Low, Medium, High, Critical)
- **Date**: ISO 8601 formatted dates
- **Number**: Numeric values
- **Array**: Array of values for multi-select fields

## Bulk Operation Limits

- Maximum 100 items per bulk operation
- Operations are processed individually
- Partial success is supported (some items succeed, others fail)
- Response includes both successful operations and errors