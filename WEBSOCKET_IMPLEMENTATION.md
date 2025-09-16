# WebSocket Implementation Guide

## Overview
This document describes the WebSocket infrastructure implemented for the project management platform, providing real-time updates for boards, items, and comments.

## Architecture

### Components
1. **WebSocket Handler** (`internal/websocket/handler.go`): Main WebSocket connection handler with JWT authentication
2. **Hub** (`internal/websocket/hub.go`): Manages connections and message broadcasting
3. **Connection** (`internal/websocket/connection.go`): Individual WebSocket connection management
4. **Broadcaster** (`internal/websocket/broadcaster.go`): MongoDB change stream integration
5. **Types** (`internal/websocket/types.go`): Message structures and constants

### WebSocket Endpoints

| Endpoint | Description | Authentication |
|----------|-------------|----------------|
| `GET /ws` | General WebSocket endpoint | JWT Token |
| `GET /ws/board/:boardId` | Board-specific updates | JWT Token |
| `GET /ws/item/:itemId` | Item-specific updates | JWT Token |
| `GET /ws/comment/:commentId` | Comment-specific updates | JWT Token |
| `GET /ws/stats` | WebSocket statistics | JWT Token |

### Message Types

#### Client to Server
- `subscribe`: Subscribe to a room/room
- `unsubscribe`: Unsubscribe from a room/room
- `ping`: Connection health check

#### Server to Client
- `pong`: Response to ping
- `board_update`: Board changes
- `item_update`: Item changes
- `comment_update`: Comment changes
- `error`: Error messages

## Usage

### Client Connection
```javascript
// Connect to general WebSocket
const ws = new WebSocket('ws://localhost:8080/ws?token=YOUR_JWT_TOKEN');

// Connect to board-specific WebSocket
const ws = new WebSocket('ws://localhost:8080/ws/board/BOARD_ID?token=YOUR_JWT_TOKEN');
```

### Subscription Management
```javascript
// Subscribe to a board
ws.send(JSON.stringify({
  type: 'subscribe',
  room: 'board:BOARD_ID'
}));

// Subscribe to an item
ws.send(JSON.stringify({
  type: 'subscribe',
  room: 'item:ITEM_ID'
}));

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  room: 'board:BOARD_ID'
}));
```

### Receiving Updates
```javascript
ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  switch(data.type) {
    case 'board_update':
      handleBoardUpdate(data.data);
      break;
    case 'item_update':
      handleItemUpdate(data.data);
      break;
    case 'comment_update':
      handleCommentUpdate(data.data);
      break;
  }
};
```

## Room Structure

### Room Naming Convention
- **Boards**: `board:{board_id}`
- **Items**: `item:{item_id}`
- **Comments**: `comment:{comment_id}`
- **General**: `boards` (for all boards)

### Subscription Hierarchy
```
board:123
├── item:456 (item in board 123)
├── item:457 (another item in board 123)
└── comment:789 (comment on item 456)
```

## MongoDB Change Streams

The broadcaster automatically listens to changes in:
- **boards** collection → `board_update` events
- **items** collection → `item_update` events  
- **comments** collection → `comment_update` events

### Event Payload Structure

#### Board Update
```json
{
  "type": "board:update",
  "boardId": "BOARD_ID",
  "data": {
    "updatedFields": {"title": "New Title"},
    "removedFields": ["description"]
  }
}
```

#### Item Update
```json
{
  "type": "item:insert",
  "itemId": "ITEM_ID",
  "boardId": "BOARD_ID",
  "data": {
    "title": "New Item",
    "status": "todo"
  }
}
```

#### Comment Update
```json
{
  "type": "comment:delete",
  "commentId": "COMMENT_ID",
  "itemId": "ITEM_ID",
  "boardId": "BOARD_ID",
  "data": null
}
```

## Security

### Authentication
- All WebSocket connections require a valid JWT token
- Token can be provided via:
  - Query parameter: `?token=YOUR_JWT_TOKEN`
  - Authorization header: `Authorization: Bearer YOUR_JWT_TOKEN`

### Connection Management
- Automatic reconnection handling
- Ping/pong for connection health
- Rate limiting via middleware
- CORS protection

## Testing

### Development Tools
- **WebSocket Test Page**: `internal/websocket/test_websocket.html`
- **Browser Testing**: Open test page in browser
- **Manual Testing**: Use WebSocket clients like:
  - Chrome DevTools Network tab
  - Postman WebSocket client
  - WebSocket CLI tools

### Test Commands
```bash
# Start the server
go run cmd/server/main.go

# Test WebSocket connection
# Open internal/websocket/test_websocket.html in browser
```

## Configuration

### Environment Variables
The WebSocket system uses existing configuration:
- `JWT_SECRET`: For token validation
- `DATABASE_URI`: For MongoDB connection
- `SERVER_HOST`/`SERVER_PORT`: For WebSocket server binding

### Runtime Configuration
- **Read Buffer Size**: 1024 bytes
- **Write Buffer Size**: 1024 bytes
- **Ping Interval**: 54 seconds
- **Read Deadline**: 60 seconds
- **Write Deadline**: 10 seconds

## Performance Considerations

### Connection Limits
- **Per User**: Unlimited concurrent connections
- **Per Room**: Unlimited subscribers
- **Message Buffer**: 256 messages per connection

### Scalability
- Room-based broadcasting reduces unnecessary traffic
- Efficient connection management with maps
- Non-blocking message delivery

### Monitoring
- WebSocket stats available at `/ws/stats`
- Real-time connection counts
- Active room subscriptions

## Error Handling

### Client-Side
- Automatic reconnection on connection loss
- Heartbeat mechanism for connection health
- Error messages displayed to user

### Server-Side
- Comprehensive logging with logrus
- Graceful connection cleanup
- MongoDB connection error handling

## Integration with REST API

The WebSocket system runs alongside the existing REST API:
- **Backward Compatible**: All REST endpoints remain functional
- **Real-time Enhancement**: WebSocket provides real-time updates
- **Consistent Data**: Both REST and WebSocket use same data models

## Future Enhancements

- [ ] Presence indicators (user online status)
- [ ] Typing indicators
- [ ] File upload notifications
- [ ] Advanced filtering for subscriptions
- [ ] Rate limiting per user/room
- [ ] Message acknowledgments
- [ ] Connection pooling for MongoDB change streams