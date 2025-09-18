# Kirom - Project Management Platform
## Complete Application Documentation

### Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Getting Started](#getting-started)
5. [API Reference](#api-reference)
6. [Frontend Components](#frontend-components)
7. [Database Schema](#database-schema)
8. [Real-time Features](#real-time-features)
9. [Authentication & Security](#authentication--security)
10. [Deployment Guide](#deployment-guide)
11. [Development Guide](#development-guide)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## Overview

**Kirom** is a modern, full-stack project management platform built with Go (backend) and vanilla JavaScript (frontend). Designed as a Monday.com clone, it provides comprehensive project management capabilities with real-time collaboration features.

### Key Highlights
- **Backend**: Go 1.24+ with Gin web framework
- **Database**: MongoDB for document storage
- **Frontend**: Vanilla JavaScript with modular architecture
- **Real-time**: WebSocket integration for live updates
- **Authentication**: JWT-based secure authentication
- **Security**: Comprehensive middleware stack
- **Deployment**: Docker containerization with production-ready configuration

### Application URL
- **Development**: http://localhost:8080
- **Production**: Configurable via environment variables

---

## Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Frontend       │    │  Backend        │    │  Database       │
│  (Vanilla JS)   │◄──►│  (Go + Gin)     │◄──►│  (MongoDB)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              WebSocket
```

### Backend Architecture

#### Core Components
- **[`cmd/server/main.go`](cmd/server/main.go)**: Application entry point and server configuration
- **[`internal/handlers/`](internal/handlers/)**: HTTP request handlers for REST API endpoints
- **[`internal/services/`](internal/services/)**: Business logic layer
- **[`internal/repository/`](internal/repository/)**: Data access layer
- **[`internal/models/`](internal/models/)**: Data models and validation
- **[`internal/auth/`](internal/auth/)**: Authentication and JWT management
- **[`internal/websocket/`](internal/websocket/)**: Real-time communication
- **[`internal/middleware/`](internal/middleware/)**: Security and logging middleware

#### Middleware Stack
1. **Recovery Middleware**: Panic recovery
2. **Security Middleware**: HTTPS redirect, HSTS, security headers
3. **CORS Middleware**: Cross-origin resource sharing
4. **CSRF Middleware**: Cross-site request forgery protection
5. **Authentication Middleware**: JWT validation
6. **Rate Limiting**: Request throttling
7. **Logging Middleware**: Structured logging
8. **Metrics Middleware**: Performance monitoring

### Frontend Architecture

#### File Structure
```
frontend/vanilla/
├── index.html              # Landing page
├── board.html             # Main board interface
├── login.html             # Authentication pages
├── css/                   # Styling
│   ├── base.css          # Base styles
│   ├── board.css         # Board-specific styles
│   └── components.css    # Component styles
└── js/                    # JavaScript modules
    ├── services/         # API and data services
    ├── components/       # UI components
    └── utils/           # Utility functions
```

#### Key Frontend Services
- **[`boardService.js`](frontend/vanilla/js/services/boardService.js)**: Board management and API integration
- **[`itemService.js`](frontend/vanilla/js/services/itemService.js)**: Item CRUD operations
- **[`connectionManager.js`](frontend/vanilla/js/utils/connectionManager.js)**: WebSocket connection management
- **[`notificationSystem.js`](frontend/vanilla/js/utils/notificationSystem.js)**: User notifications

---

## Features

### Core Features

#### 1. Workspace Management
- **Multi-tenant workspaces** with role-based access control
- **Member management** with roles: Owner, Admin, Member, Viewer
- **Workspace switching** with persistent user preferences

#### 2. Board Management
- **Flexible board creation** with customizable columns
- **Multiple view modes**: Table, Kanban, Calendar
- **Column types**: Text, Status, Priority, Date, Number, Person
- **Board permissions** and sharing capabilities

#### 3. Item Management
- **Rich item creation** with field values and assignments
- **Drag-and-drop** interface for item movement
- **Bulk operations** for efficiency
- **Advanced filtering** and search capabilities
- **Item positioning** and ordering

#### 4. Real-time Collaboration
- **Live updates** via WebSocket connections
- **User presence** indication
- **Real-time notifications** for changes
- **Collaborative editing** with conflict resolution

#### 5. Comment System
- **Threaded comments** with replies
- **User mentions** with notifications
- **Rich text content** with markdown support
- **Attachment support** for files

#### 6. Advanced Search & Filtering
- **Global search** across items, comments, and boards
- **Advanced filters** with multiple operators
- **Saved filters** for reusable queries
- **Full-text search** with relevance scoring

### User Interface Features

#### Board Views
1. **Table View**: Traditional spreadsheet-like interface
2. **Kanban View**: Card-based workflow visualization
3. **Calendar View**: Timeline and deadline management

#### Interactive Elements
- **Drag-and-drop** for item management
- **Inline editing** for quick updates
- **Context menus** for actions
- **Keyboard shortcuts** for power users

---

## Getting Started

### Prerequisites
- **Go 1.24+** for backend development
- **MongoDB 6.0+** for database
- **Docker & Docker Compose** for containerized deployment
- **Git** for version control

### Quick Start (Docker)

1. **Clone the repository**:
```bash
git clone <repository-url>
cd kiromcl
```

2. **Start development environment**:
```bash
# Using Docker Compose
docker-compose -f docker-compose.dev.yml up

# Or using Makefile
make docker-dev
```

3. **Access the application**:
- **Main Application**: http://localhost:8080
- **Board Interface**: http://localhost:8080/board
- **API Health Check**: http://localhost:8080/health

### Manual Setup

1. **Backend Setup**:
```bash
# Install dependencies
go mod download

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start MongoDB
mongod --dbpath ./data/db

# Run application
go run cmd/server/main.go
```

2. **Access the application**: http://localhost:8080

---

## API Reference

### Base URL
- **Development**: `http://localhost:8080/api`
- **Production**: `https://your-domain.com/api`

### Authentication
All protected endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Authentication
```http
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/refresh      # Token refresh
POST /api/auth/logout       # User logout
GET  /api/auth/verify       # Token verification
```

#### Workspaces
```http
GET    /api/workspaces              # List user workspaces
POST   /api/workspaces              # Create workspace
GET    /api/workspaces/{id}         # Get workspace details
PUT    /api/workspaces/{id}         # Update workspace
DELETE /api/workspaces/{id}         # Delete workspace
```

#### Boards
```http
GET    /api/boards                  # List boards
POST   /api/boards                  # Create board
GET    /api/boards/{id}             # Get board with items
PUT    /api/boards/{id}             # Update board
DELETE /api/boards/{id}             # Delete board
```

#### Items
```http
GET    /api/boards/{id}/items       # Get board items
POST   /api/boards/{id}/items       # Create item
GET    /api/items/{id}              # Get item details
PUT    /api/items/{id}              # Update item
DELETE /api/items/{id}              # Delete item
POST   /api/items/{id}/move         # Move item
```

#### Comments
```http
POST   /api/items/{id}/comments     # Add comment
GET    /api/items/{id}/comments     # Get comments
PUT    /api/comments/{id}           # Update comment
DELETE /api/comments/{id}           # Delete comment
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Additional details"
  }
}
```

### Rate Limiting
- **General API**: 100 requests/minute per user
- **Authentication**: 5 requests/minute per IP
- **Search**: 50 requests/minute per user

---

## Frontend Components

### Architecture Pattern
The frontend uses a **modular component architecture** without frameworks:

#### Component Structure
```javascript
class ComponentName {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.state = {};
  }

  async init() {
    await this.render();
    this.attachEventListeners();
  }

  render() {
    // DOM manipulation and rendering
  }

  attachEventListeners() {
    // Event handling
  }

  destroy() {
    // Cleanup
  }
}
```

### Key Components

#### Board Components
- **[`BoardViewEnhanced.js`](frontend/vanilla/js/components/board/BoardViewEnhanced.js)**: Main board interface
- **[`KanbanView.js`](frontend/vanilla/js/components/board/KanbanView.js)**: Kanban board implementation
- **[`MondayStyleBoard.js`](frontend/vanilla/js/components/board/MondayStyleBoard.js)**: Table view implementation

#### Comment Components
- **[`CommentList.js`](frontend/vanilla/js/components/comments/CommentList.js)**: Comment display
- **[`CommentForm.js`](frontend/vanilla/js/components/comments/CommentForm.js)**: Comment creation
- **[`CommentItem.js`](frontend/vanilla/js/components/comments/CommentItem.js)**: Individual comment
- **[`CommentThread.js`](frontend/vanilla/js/components/comments/CommentThread.js)**: Threaded discussions

### Services Layer

#### Service Pattern
```javascript
class Service {
  constructor(apiClient, websocketService, eventBus) {
    this.apiClient = apiClient;
    this.websocketService = websocketService;
    this.eventBus = eventBus;
  }

  // API methods
  // WebSocket event handlers
  // State management
}
```

#### Key Services
- **BoardService**: Board management and real-time updates
- **ItemService**: Item CRUD operations
- **CommentService**: Comment system integration
- **ConnectionManager**: WebSocket connection management
- **NotificationSystem**: User notification handling

---

## Database Schema

### MongoDB Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  emailVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Workspaces Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  ownerId: ObjectId,
  members: [{
    userId: ObjectId,
    role: String, // "owner", "admin", "member", "viewer"
    joinedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### Boards Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  workspaceId: ObjectId,
  color: String,
  columns: [{
    id: String,
    name: String,
    type: String, // "text", "status", "date", "number", "person"
    settings: Object,
    position: Number,
    createdAt: Date,
    updatedAt: Date
  }],
  permissions: [{
    userId: ObjectId,
    permission: String, // "view", "edit", "admin"
    grantedBy: ObjectId,
    grantedAt: Date
  }],
  settings: {
    permissions: Object,
    notifications: Object
  },
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId
}
```

#### Items Collection
```javascript
{
  _id: ObjectId,
  name: String,
  boardId: ObjectId,
  position: Number,
  fieldValues: [{
    columnId: String,
    value: Mixed, // String, Number, Date, Array
    updatedAt: Date,
    updatedBy: ObjectId
  }],
  assignees: [ObjectId],
  watchers: [ObjectId],
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId
}
```

#### Comments Collection
```javascript
{
  _id: ObjectId,
  content: String,
  itemId: ObjectId,
  authorId: ObjectId,
  parentCommentId: ObjectId, // For replies
  mentions: [ObjectId],
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Database Indexes

#### Performance Optimization
```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true })

// Boards
db.boards.createIndex({ workspaceId: 1 })
db.boards.createIndex({ createdBy: 1 })

// Items
db.items.createIndex({ boardId: 1, position: 1 })
db.items.createIndex({ assignees: 1 })
db.items.createIndex({ watchers: 1 })

// Comments
db.comments.createIndex({ itemId: 1, createdAt: -1 })
db.comments.createIndex({ authorId: 1 })
```

---

## Real-time Features

### WebSocket Implementation

#### Architecture
```
Client ←→ WebSocket Handler ←→ Hub ←→ Broadcaster ←→ MongoDB Change Streams
```

#### Key Components
- **[`handler.go`](internal/websocket/handler.go)**: WebSocket connection management
- **[`hub.go`](internal/websocket/hub.go)**: Connection hub and message routing
- **[`broadcaster.go`](internal/websocket/broadcaster.go)**: Database change stream integration
- **[`connection.go`](internal/websocket/connection.go)**: Individual connection handling

#### Connection Management
```go
type Hub struct {
    connections map[*Connection]bool
    rooms      map[string]map[*Connection]bool
    register   chan *Connection
    unregister chan *Connection
    broadcast  chan []byte
    subscribe  chan *RoomSubscription
}
```

#### Message Types
```javascript
// Client to Server
{
  type: "subscribe",
  room: "board:123"
}

// Server to Client
{
  type: "board:update",
  action: "item_created",
  payload: { /* item data */ }
}
```

### Real-time Events

#### Board Events
- `board:update` - Board metadata changes
- `board:item_created` - New item added
- `board:item_updated` - Item modified
- `board:item_deleted` - Item removed
- `board:item_moved` - Item position changed

#### Comment Events
- `comment:created` - New comment added
- `comment:updated` - Comment modified
- `comment:deleted` - Comment removed

#### User Events
- `user:joined` - User connected to board
- `user:left` - User disconnected from board
- `user:typing` - User typing indicator

### Frontend Integration

#### WebSocket Service
```javascript
class WebSocketService {
  constructor(url, authToken) {
    this.url = url;
    this.authToken = authToken;
    this.ws = null;
    this.eventBus = new EventBus();
  }

  connect() {
    this.ws = new WebSocket(`${this.url}?token=${this.authToken}`);
    this.setupEventHandlers();
  }

  subscribe(room) {
    this.send({
      type: 'subscribe',
      room: room
    });
  }
}
```

---

## Authentication & Security

### JWT Authentication

#### Token Structure
```javascript
// Access Token (15 minutes)
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "user",
  "exp": 1640995200,
  "iat": 1640994300
}

// Refresh Token (7 days)
{
  "userId": "507f1f77bcf86cd799439011",
  "type": "refresh",
  "exp": 1641600000,
  "iat": 1640994300
}
```

#### Token Management
- **Access tokens**: Short-lived (15 minutes)
- **Refresh tokens**: Long-lived (7 days)
- **Automatic refresh**: Client-side token renewal
- **Secure storage**: HTTP-only cookies for refresh tokens

### Security Middleware

#### Implementation Stack
```go
// Security middleware chain
router.Use(middleware.HTTPSRedirectMiddleware())    // Force HTTPS
router.Use(middleware.HSTSMiddleware())             // HTTP Strict Transport Security
router.Use(middleware.CORSMiddleware())             // Cross-Origin Resource Sharing
router.Use(middleware.SecurityHeadersMiddleware())  // Security headers
router.Use(middleware.CSRFMiddleware())             // CSRF protection
router.Use(middleware.RateLimitMiddleware())        // Rate limiting
router.Use(middleware.AuthMiddleware())             // JWT validation
```

#### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Password Security
- **Bcrypt hashing** with cost factor 12
- **Password requirements**: Minimum 8 characters, mixed case, numbers, symbols
- **Rate limiting**: 5 failed attempts per minute per IP
- **Account lockout**: Temporary suspension after repeated failures

### Input Validation
- **Request validation**: JSON schema validation
- **SQL injection prevention**: Parameterized queries
- **XSS prevention**: Input sanitization and output encoding
- **Path traversal protection**: File access restrictions

---

## Deployment Guide

### Development Deployment

#### Using Docker Compose
```bash
# Clone repository
git clone <repository-url>
cd kiromcl

# Start development environment
docker-compose -f docker-compose.dev.yml up

# Access application
open http://localhost:8080
```

#### Manual Development Setup
```bash
# Start MongoDB
mongod --dbpath ./data/db

# Configure environment
cp .env.example .env

# Start Go application with hot reloading
go install github.com/cosmtrek/air@latest
air

# Or run directly
go run cmd/server/main.go
```

### Production Deployment

#### Environment Configuration
```bash
# Create production environment file
cat > .env << EOF
# Database
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DATABASE=project_management

# JWT
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=168h

# Email
SMTP_HOST=your.smtp.server.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
FROM_ADDRESS=noreply@yourdomain.com

# Server
ENVIRONMENT=production
EOF
```

#### Docker Production Deployment
```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
curl http://localhost/health
```

#### Production Architecture
```
Internet → Nginx (SSL/Proxy) → Go Application → MongoDB
                ↓
            Static Files
```

### Configuration Options

#### Server Configuration ([`config.yaml`](config.yaml))
```yaml
server:
  host: "0.0.0.0"
  port: "8080"
  read_timeout: "30s"
  write_timeout: "30s"

database:
  uri: mongodb://localhost:27017/pm_dev
  name: "project_management_dev"

jwt:
  secret: "your_super_secret_key"
  access_expiration: "15m"
  refresh_expiration: "168h"

email:
  smtp_host: "mail.example.com"
  smtp_port: 465
  smtp_user: "user@example.com"
  smtp_password: "password"
  from_address: "noreply@example.com"

environment: "development"
```

### Health Checks

#### Endpoints
- **Basic health**: `GET /health`
- **Readiness**: `GET /health/ready`
- **Liveness**: `GET /health/live`
- **Metrics**: `GET /metrics`

#### Docker Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

---

## Development Guide

### Project Structure
```
kiromcl/
├── cmd/server/           # Application entry point
├── internal/            # Private application code
│   ├── auth/           # Authentication logic
│   ├── handlers/       # HTTP handlers
│   ├── middleware/     # HTTP middleware
│   ├── models/         # Data models
│   ├── repository/     # Data access layer
│   ├── services/       # Business logic
│   └── websocket/      # WebSocket implementation
├── frontend/vanilla/    # Frontend application
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript modules
│   └── *.html         # HTML pages
├── docs/               # Documentation
├── scripts/            # Build and deployment scripts
├── config.yaml         # Application configuration
├── go.mod             # Go module definition
└── docker-compose.*.yml # Docker configurations
```

### Development Workflow

#### Backend Development
```bash
# Install dependencies
go mod download

# Run tests
go test ./...

# Run with hot reloading
air

# Format code
go fmt ./...

# Lint code
golangci-lint run
```

#### Frontend Development
```bash
# Install Playwright for testing
cd frontend
npm install
npx playwright install

# Run E2E tests
npx playwright test

# Serve files for development
# Files are served by Go backend at localhost:8080
```

### Code Standards

#### Go Code Style
- Follow **Go standard formatting** with `go fmt`
- Use **meaningful variable names**
- Write **comprehensive tests** for all functions
- Document **exported functions and types**
- Handle **errors appropriately**

#### JavaScript Code Style
- Use **ES6+ features** consistently
- Follow **modular architecture** patterns
- Write **JSDoc comments** for functions
- Use **async/await** for asynchronous operations
- Handle **errors gracefully**

### Testing Strategy

#### Backend Tests
```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package tests
go test ./internal/services

# Run benchmarks
go test -bench=. ./internal/services
```

#### Frontend Tests (Playwright)
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test basic.test.js

# Run tests in headed mode
npx playwright test --headed

# Generate test report
npx playwright test --reporter=html
```

---

## Testing

### Testing Architecture

#### Backend Testing
- **Unit tests**: Business logic and utilities
- **Integration tests**: Database and external services
- **Handler tests**: HTTP endpoint testing
- **Benchmark tests**: Performance testing

#### Frontend Testing
- **E2E tests**: Full user workflow testing with Playwright
- **Component tests**: Individual component testing
- **Integration tests**: Service layer testing

### Running Tests

#### Complete Test Suite
```bash
# Backend tests
go test ./...

# Frontend tests
cd frontend && npx playwright test

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

#### Test Configuration

#### Playwright Configuration ([`frontend/playwright.config.js`](frontend/playwright.config.js))
```javascript
module.exports = {
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  webServer: {
    command: 'go run ../cmd/server/main.go',
    port: 8080,
    reuseExistingServer: !process.env.CI
  }
};
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
**Symptoms**: Server fails to start, connection errors

**Solutions**:
```bash
# Check port availability
lsof -i :8080

# Verify MongoDB connection
mongosh mongodb://localhost:27017

# Check environment variables
cat .env

# Review logs
docker-compose logs app
```

#### 2. WebSocket Connection Failed
**Symptoms**: Real-time features not working

**Solutions**:
```bash
# Check WebSocket endpoint
curl -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     http://localhost:8080/ws

# Verify authentication
# Check browser developer console for errors
# Ensure JWT token is valid
```

#### 3. Database Connection Issues
**Symptoms**: MongoDB connection timeouts

**Solutions**:
```bash
# Start MongoDB manually
mongod --dbpath ./data/db

# Check MongoDB status
brew services list | grep mongodb

# Verify connection string
mongosh "mongodb://localhost:27017/project_management_dev"
```

#### 4. Static Files Not Loading
**Symptoms**: CSS/JS files return 404

**Solutions**:
```bash
# Check file existence
ls -la frontend/vanilla/css/
ls -la frontend/vanilla/js/

# Verify server static file configuration in main.go:
# router.Static("/css", "frontend/vanilla/css")
# router.Static("/js", "frontend/vanilla/js")

# Check file permissions
chmod -R 755 frontend/vanilla/
```

### Debugging Tools

#### Application Logs
```bash
# Development logs (JSON format)
tail -f logs/app.log

# Docker container logs
docker-compose logs -f app

# MongoDB logs
docker-compose logs -f mongodb
```

#### Database Debugging
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/project_management_dev

# Check collections
show collections

# Query items
db.items.find().pretty()

# Check indexes
db.items.getIndexes()
```

#### Performance Monitoring
```bash
# Check system resources
docker stats

# Monitor Go application
go tool pprof http://localhost:8080/debug/pprof/heap

# MongoDB performance
mongotop
mongostat
```

### Support Resources

#### Documentation
- **API Documentation**: [`docs/api/API_DOCUMENTATION.md`](docs/api/API_DOCUMENTATION.md)
- **Deployment Guide**: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- **Development Setup**: [`DEV_SETUP.md`](DEV_SETUP.md)

#### Community Support
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: This comprehensive guide
- **Code Examples**: See [`frontend/vanilla/`](frontend/vanilla/) directory

---

## Contributing

### Development Setup
1. Fork the repository
2. Clone your fork
3. Set up development environment
4. Create a feature branch
5. Make changes with tests
6. Submit pull request

### Code Style
- **Go**: Follow standard Go formatting
- **JavaScript**: Use ES6+ with consistent style
- **Documentation**: Update docs for new features
- **Tests**: Include tests for all changes

### Pull Request Process
1. Ensure all tests pass
2. Update documentation
3. Add changelog entry
4. Request code review
5. Address review feedback

---

## License

This project is licensed under the **MIT License**. See the LICENSE file for details.

---

## Appendix

### Key File References
- **Main Application**: [`cmd/server/main.go`](cmd/server/main.go:1)
- **Board Models**: [`internal/models/board.go`](internal/models/board.go:1)
- **Item Models**: [`internal/models/item.go`](internal/models/item.go:1)
- **WebSocket Handler**: [`internal/websocket/handler.go`](internal/websocket/handler.go:1)
- **Board Service**: [`frontend/vanilla/js/services/boardService.js`](frontend/vanilla/js/services/boardService.js:1)
- **Configuration**: [`config.yaml`](config.yaml:1)
- **API Documentation**: [`docs/api/API_DOCUMENTATION.md`](docs/api/API_DOCUMENTATION.md:1)

### Environment Variables Reference
```bash
# Required
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=your_password
JWT_SECRET=your_jwt_secret

# Optional
SERVER_PORT=8080
ENVIRONMENT=development
DATABASE_URI=mongodb://localhost:27017/pm_dev
```

### Quick Commands
```bash
# Start development
docker-compose -f docker-compose.dev.yml up

# Run tests
go test ./... && cd frontend && npx playwright test

# Build production
docker-compose -f docker-compose.prod.yml build

# View logs
docker-compose logs -f app

# Health check
curl http://localhost:8080/health
```

---

*Last updated: January 2024*
*Documentation version: 1.0.0*
*Application version: 1.0.0*