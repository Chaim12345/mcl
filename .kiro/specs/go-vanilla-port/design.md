# Design Document

## Overview

This document outlines the technical design for porting the project management platform from Node.js/React to Go backend with vanilla HTML/JavaScript/CSS frontend. The design prioritizes simplicity, performance, and maintainability while preserving core functionality.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Go Backend    │    │    MongoDB      │
│                 │    │                 │    │   Database      │
│ HTML/CSS/JS     │◄──►│ REST API        │◄──►│                 │
│ Vanilla Frontend│    │ JWT Auth        │    │ Document Store  │
│                 │    │ Static Files    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   SMTP Server   │
                       │ Email Delivery  │
                       └─────────────────┘
```

### Technology Stack

**Backend:**
- **Language:** Go 1.21+
- **Web Framework:** Gin (lightweight HTTP framework)
- **Database:** MongoDB with official Go driver
- **Authentication:** JWT tokens with golang-jwt
- **Email:** SMTP with net/smtp
- **Configuration:** Viper for config management
- **Logging:** Structured logging with slog
- **Testing:** Go standard testing package

**Frontend:**
- **Core:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling:** CSS Grid/Flexbox with CSS custom properties
- **HTTP Client:** Fetch API
- **State Management:** Simple JavaScript modules
- **Build:** No build process - direct file serving
- **Icons:** SVG icons or icon fonts

**Database:**
- **Primary:** MongoDB 6.0+
- **Migrations:** MongoDB migration scripts with Go
- **Connection:** Connection pooling with MongoDB Go driver

## Components and Interfaces

### Backend Components

#### 1. HTTP Server and Routing
```go
// Server structure
type Server struct {
    router   *gin.Engine
    db       *mongo.Client
    config   *Config
    logger   *slog.Logger
}

// Main routes
/api/auth/*     - Authentication endpoints
/api/workspaces/* - Workspace management
/api/boards/*   - Board operations
/api/items/*    - Item management
/api/comments/* - Comment system
/api/activities/* - Activity tracking
/static/*       - Static file serving
```

#### 2. Authentication Middleware
```go
type AuthMiddleware struct {
    jwtSecret []byte
    logger    *slog.Logger
}

// JWT Claims structure
type Claims struct {
    UserID    string `json:"user_id"`
    Email     string `json:"email"`
    Role      string `json:"role"`
    jwt.RegisteredClaims
}
```

#### 3. Database Layer
```go
// Repository pattern for data access with MongoDB
type UserRepository interface {
    Create(ctx context.Context, user *User) (*mongo.InsertOneResult, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
    GetByID(ctx context.Context, id primitive.ObjectID) (*User, error)
    Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
    Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
}

type WorkspaceRepository interface {
    Create(ctx context.Context, workspace *Workspace) (*mongo.InsertOneResult, error)
    GetByUserID(ctx context.Context, userID primitive.ObjectID) ([]*Workspace, error)
    GetByID(ctx context.Context, id primitive.ObjectID) (*Workspace, error)
    Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
    Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
    AddMember(ctx context.Context, workspaceID, userID primitive.ObjectID, role string) error
    RemoveMember(ctx context.Context, workspaceID, userID primitive.ObjectID) error
}
```

#### 4. Service Layer
```go
type AuthService struct {
    userRepo UserRepository
    hasher   PasswordHasher
    jwt      JWTManager
    email    EmailService
}

type WorkspaceService struct {
    workspaceRepo WorkspaceRepository
    memberRepo    MemberRepository
    loggster   chan *Client
    unregister chan *Client
    rooms      map[string]map[*Client]bool
}

type Client struct {
    hub      *Hub
    conn     *websocket.Conn
    send     chan []byte
    userID   string
    rooms    map[string]bool
}

type Message struct {
    Type      string      `json:"type"`
    Room      string      `json:"room"`
    Data      interface{} `json:"data"`
    UserID    string      `json:"userId"`
    Timestamp time.Time   `json:"timestamp"`
}
```

#### 5. Middleware
```go
func AuthMiddleware(authService AuthService) gin.HandlerFunc
func CORSMiddleware() gin.HandlerFunc
func RateLimitMiddleware() gin.HandlerFunc
func LoggingMiddleware(logger *logrus.Logger) gin.HandlerFunc
func ErrorHandlingMiddleware() gin.HandlerFunc
```

### Frontend Components

#### 1. Application Structure
```
frontend/
├── index.html              # Main HTML file
├── css/
│   ├── main.css           # Global styles
│   ├── components.css     # Component styles
│   └── themes.css         # Theme variables
├── js/
│   ├── app.js             # Application entry point
│   ├── api/
│   │   ├── client.js      # HTTP client wrapper
│   │   └── websocket.js   # WebSocket client
│   ├── components/
│   │   ├── base.js        # Base component class
│   │   ├── workspace.js   # Workspace components
│   │   ├── board.js       # Board components
│   │   └── auth.js        # Authentication components
│   ├── services/
│   │   ├── auth.js        # Authentication service
│   │   ├── workspace.js   # Workspace service
│   │   └── board.js       # Board service
│   ├── utils/
│   │   ├── dom.js         # DOM utilities
│   │   ├── storage.js     # Local storage wrapper
│   │   └── validation.js  # Form validation
│   └── state/
│       ├── store.js       # Global state management
│       └── actions.js     # State actions
└── assets/
    ├── icons/             # SVG icons
    └── images/            # Images and logos
```

#### 2. Component System
```javascript
// Base component class
class Component {
    constructor(element, props = {}) {
        this.element = element;
        this.props = props;
        this.state = {};
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
    }
    
    render() {
        // Override in subclasses
    }
    
    bindEvents() {
        // Override in subclasses
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }
}

// Example workspace component
class WorkspaceList extends Component {
    async init() {
        this.workspaces = await workspaceService.getAll();
        super.init();
    }
    
    render() {
        this.element.innerHTML = `
            <div class="workspace-list">
                ${this.workspaces.map(ws => `
                    <div class="workspace-card" data-id="${ws.id}">
                        <h3>${ws.name}</h3>
                        <p>${ws.description}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    bindEvents() {
        this.element.addEventListener('click', (e) => {
            const card = e.target.closest('.workspace-card');
            if (card) {
                const workspaceId = card.dataset.id;
                router.navigate(`/workspace/${workspaceId}`);
            }
        });
    }
}
```

#### 3. State Management
```javascript
class Store {
    constructor() {
        this.state = {
            user: null,
            currentWorkspace: null,
            currentBoard: null,
            notifications: []
        };
        this.listeners = [];
    }
    
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    dispatch(action) {
        const newState = this.reducer(this.state, action);
        if (newState !== this.state) {
            this.state = newState;
            this.listeners.forEach(listener => listener(this.state));
        }
    }
    
    reducer(state, action) {
        switch (action.type) {
            case 'SET_USER':
                return { ...state, user: action.payload };
            case 'SET_WORKSPACE':
                return { ...state, currentWorkspace: action.payload };
            default:
                return state;
        }
    }
}
```

## Data Models

### MongoDB Document Schemas

#### User Document
```javascript
{
  _id: ObjectId,
  email: String,
  password: String, // bcrypt hashed
  firstName: String,
  lastName: String,
  avatar: String,
  emailVerified: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  preferences: {
    theme: String,
    notifications: {
      email: Boolean,
      push: Boolean,
      mentions: Boolean
    }
  }
}
```

#### Workspace Document
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  logo: String,
  ownerId: ObjectId,
  members: [{
    userId: ObjectId,
    role: String, // 'admin', 'member'
    joinedAt: Date
  }],
  settings: {
    visibility: String, // 'private', 'public'
    allowInvites: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Board Document
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
    type: String, // 'text', 'status', 'date', 'number', 'person'
    settings: Object,
    position: Number
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

#### Item Document
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

#### Comment Document
```javascript
{
  _id: ObjectId,
  content: String,
  itemId: ObjectId,
  parentId: ObjectId, // for threaded comments
  authorId: ObjectId,
  mentions: [ObjectId],
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  editHistory: [{
    content: String,
    editedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### Activity Document
```javascript
{
  _id: ObjectId,
  type: String, // 'item_created', 'item_updated', 'comment_added', etc.
  entityType: String, // 'item', 'board', 'workspace'
  entityId: ObjectId,
  userId: ObjectId,
  data: Object, // action-specific data
  workspaceId: ObjectId,
  boardId: ObjectId,
  itemId: ObjectId,
  createdAt: Date
}
```

#### Notification Document
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String,
  title: String,
  message: String,
  data: Object,
  read: Boolean,
  readAt: Date,
  channels: {
    inApp: Boolean,
    email: Boolean,
    emailSentAt: Date
  },
  createdAt: Date
}
```

## Error Handling

### Backend Error Handling
```go
type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
}

// Error types
var (
    ErrNotFound      = &APIError{Code: "NOT_FOUND", Message: "Resource not found"}
    ErrUnauthorized  = &APIError{Code: "UNAUTHORIZED", Message: "Authentication required"}
    ErrForbidden     = &APIError{Code: "FORBIDDEN", Message: "Access denied"}
    ErrValidation    = &APIError{Code: "VALIDATION_ERROR", Message: "Invalid input"}
    ErrInternal      = &APIError{Code: "INTERNAL_ERROR", Message: "Internal server error"}
)

func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        if len(c.Errors) > 0 {
            err := c.Errors.Last()
            
            var apiErr *APIError
            if errors.As(err.Err, &apiErr) {
                c.JSON(getStatusCode(apiErr), APIResponse{
                    Success: false,
                    Error:   apiErr,
                })
            } else {
                c.JSON(500, APIResponse{
                    Success: false,
                    Error:   ErrInternal,
                })
            }
        }
    }
}
```

### Frontend Error Handling
```javascript
class APIClient {
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`,
                    ...options.headers
                }
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new APIError(data.error.code, data.error.message);
            }
            
            return data.data;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError('NETWORK_ERROR', 'Network request failed');
        }
    }
}

class APIError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'APIError';
    }
}

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (event.reason instanceof APIError) {
        showNotification(event.reason.message, 'error');
    }
});
```

## Testing Strategy

### Backend Testing
```go
// Unit tests
func TestUserService_Create(t *testing.T) {
    // Setup test MongoDB database
    client := setupTestMongoDB(t)
    defer cleanupTestMongoDB(t, client)
    
    db := client.Database("test_project_management")
    userRepo := repository.NewUserRepository(db)
    userService := service.NewUserService(userRepo)
    
    // Test cases
    tests := []struct {
        name    string
        input   service.CreateUserRequest
        wantErr bool
    }{
        {
            name: "valid user",
            input: service.CreateUserRequest{
                Email:     "test@example.com",
                Password:  "password123",
                FirstName: "John",
                LastName:  "Doe",
            },
            wantErr: false,
        },
        // More test cases...
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            user, err := userService.Create(context.Background(), tt.input)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, user)
            }
        })
    }
}

// Integration tests
func TestWorkspaceAPI(t *testing.T) {
    server := setupTestServer(t)
    defer server.Close()
    
    // Test workspace creation
    resp := httptest.NewRecorder()
    req := httptest.NewRequest("POST", "/api/workspaces", strings.NewReader(`{
        "name": "Test Workspace",
        "description": "Test description"
    }`))
    req.Header.Set("Authorization", "Bearer "+getTestToken())
    
    server.ServeHTTP(resp, req)
    
    assert.Equal(t, 201, resp.Code)
    // More assertions...
}
```

### Frontend Testing
```javascript
// Component tests
describe('WorkspaceList Component', () => {
    let container;
    
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });
    
    afterEach(() => {
        document.body.removeChild(container);
    });
    
    test('renders workspace list', async () => {
        // Mock API response
        jest.spyOn(workspaceService, 'getAll').mockResolvedValue([
            { id: '1', name: 'Workspace 1', description: 'Description 1' }
        ]);
        
        const component = new WorkspaceList(container);
        await component.init();
        
        expect(container.querySelector('.workspace-card')).toBeTruthy();
        expect(container.textContent).toContain('Workspace 1');
    });
});

// API integration tests
describe('API Client', () => {
    test('handles authentication errors', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Token expired' }
            })
        });
        
        const client = new APIClient();
        
        await expect(client.get('/api/workspaces')).rejects.toThrow('Token expired');
    });
});
```

## Performance Optimizations

### Backend Optimizations
1. **Database Indexing:**
   ```javascript
   // MongoDB indexes
   db.users.createIndex({ email: 1 }, { unique: true })
   db.workspaces.createIndex({ "members.userId": 1 })
   db.boards.createIndex({ workspaceId: 1 })
   db.items.createIndex({ boardId: 1, position: 1 })
   db.activities.createIndex({ workspaceId: 1, createdAt: -1 })
   db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 })
   ```

2. **Connection Pooling:**
   ```go
   clientOptions := options.Client().
       ApplyURI(mongoURI).
       SetMaxPoolSize(100).
       SetMinPoolSize(10).
       SetMaxConnIdleTime(30 * time.Second)
   ```

3. **Caching Strategy:**
   ```go
   type CacheService interface {
       Get(key string, dest interface{}) error
       Set(key string, value interface{}, ttl time.Duration) error
       Delete(key string) error
   }
   
   // Cache frequently accessed data
   func (s *WorkspaceService) GetByID(ctx context.Context, id string) (*Workspace, error) {
       cacheKey := fmt.Sprintf("workspace:%s", id)
       
       var workspace Workspace
       if err := s.cache.Get(cacheKey, &workspace); err == nil {
           return &workspace, nil
       }
       
       // Fetch from database and cache
       workspace, err := s.repo.FindByID(ctx, id)
       if err != nil {
           return nil, err
       }
       
       s.cache.Set(cacheKey, workspace, 5*time.Minute)
       return workspace, nil
   }
   ```

### Frontend Optimizations
1. **Lazy Loading:**
   ```javascript
   class Router {
       async loadRoute(path) {
           const routeModule = await import(`./routes/${path}.js`);
           return routeModule.default;
       }
   }
   ```

2. **Virtual Scrolling for Large Lists:**
   ```javascript
   class VirtualList {
       constructor(container, itemHeight, renderItem) {
           this.container = container;
           this.itemHeight = itemHeight;
           this.renderItem = renderItem;
           this.visibleStart = 0;
           this.visibleEnd = 0;
           this.init();
       }
       
       render(items) {
           const containerHeight = this.container.clientHeight;
           const visibleCount = Math.ceil(containerHeight / this.itemHeight);
           
           this.visibleStart = Math.floor(this.container.scrollTop / this.itemHeight);
           this.visibleEnd = Math.min(this.visibleStart + visibleCount, items.length);
           
           const visibleItems = items.slice(this.visibleStart, this.visibleEnd);
           
           this.container.innerHTML = visibleItems
               .map((item, index) => this.renderItem(item, this.visibleStart + index))
               .join('');
       }
   }
   ```

3. **Debounced Search:**
   ```javascript
   function debounce(func, wait) {
       let timeout;
       return function executedFunction(...args) {
           const later = () => {
               clearTimeout(timeout);
               func(...args);
           };
           clearTimeout(timeout);
           timeout = setTimeout(later, wait);
       };
   }
   
   const debouncedSearch = debounce(async (query) => {
       const results = await searchService.search(query);
       displaySearchResults(results);
   }, 300);
   ```

This design provides a solid foundation for the Go/Vanilla port while maintaining all existing functionality and improving performance through modern Go practices and lightweight frontend architecture.       
 = jest.fn();
        
        // Test successful API call
        const result = await api.get('/test');
        expect(result).toBeDefined();
    }
}
```

## Security Considerations

### Authentication & Authorization
- JWT tokens with short expiration (15 minutes) and refresh tokens (7 days)
- Password hashing using bcrypt with salt rounds of 12
- CORS configuration to restrict origins
- Rate limiting on authentication endpoints
- Input validation and sanitization on all endpoints

### Data Protection
- Parameterized queries to prevent SQL injection
- XSS protection through proper output encoding
- CSRF protection for state-changing operations
- Secure headers (HSTS, CSP, X-Frame-Options)
- Environment-based configuration for secrets

### Database Security
```sql
-- Row-level security example
CREATE POLICY workspace_access ON workspaces
    FOR ALL TO authenticated_user
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspaces.id 
            AND user_id = current_user_id()
        )
    );
```

## Performance Optimizations

### Backend Optimizations
- Connection pooling for database connections
- Prepared statements for frequent queries
- Proper database indexing strategy
- Response compression (gzip)
- Static file caching with appropriate headers
- Graceful shutdown handling

### Frontend Optimizations
- Lazy loading of components and data
- Debounced search and input handling
- Local storage for user preferences
- Efficient DOM manipulation
- Image optimization and lazy loading
- Service worker for offline capabilities (future enhancement)

### Database Indexing Strategy
```javascript
// Essential indexes for performance
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ "emailVerified": 1 })

db.workspaces.createIndex({ "ownerId": 1 })
db.workspaces.createIndex({ "members.userId": 1 })
db.workspaces.createIndex({ "createdAt": -1 })

db.boards.createIndex({ "workspaceId": 1 })
db.boards.createIndex({ "workspaceId": 1, "createdAt": -1 })
db.boards.createIndex({ "createdBy": 1 })

db.items.createIndex({ "boardId": 1 })
db.items.createIndex({ "boardId": 1, "position": 1 })
db.items.createIndex({ "assignees": 1 })
db.items.createIndex({ "createdBy": 1 })

db.comments.createIndex({ "itemId": 1, "createdAt": -1 })
db.comments.createIndex({ "authorId": 1 })
db.comments.createIndex({ "mentions": 1 })

db.activities.createIndex({ "workspaceId": 1, "createdAt": -1 })
db.activities.createIndex({ "entityId": 1, "entityType": 1 })
db.activities.createIndex({ "userId": 1, "createdAt": -1 })

db.notifications.createIndex({ "userId": 1, "read": 1, "createdAt": -1 })
db.notifications.createIndex({ "userId": 1, "type": 1 })
```

## Deployment Architecture

### Single Binary Deployment
```dockerfile
# Multi-stage Docker build
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/migrations ./migrations
CMD ["./main"]
```

### Configuration Management
```go
type Config struct {
    Server struct {
        Port         string `mapstructure:"port"`
        Host         string `mapstructure:"host"`
        ReadTimeout  time.Duration `mapstructure:"read_timeout"`
        WriteTimeout time.Duration `mapstructure:"write_timeout"`
    } `mapstructure:"server"`
    
    Database struct {
        URI          string `mapstructure:"uri"`
        Name         string `mapstructure:"name"`
        MaxPoolSize  uint64 `mapstructure:"max_pool_size"`
        MinPoolSize  uint64 `mapstructure:"min_pool_size"`
        MaxConnIdleTime time.Duration `mapstructure:"max_conn_idle_time"`
    } `mapstructure:"database"`
    
    JWT struct {
        Secret           string        `mapstructure:"secret"`
        AccessExpiration time.Duration `mapstructure:"access_expiration"`
        RefreshExpiration time.Duration `mapstructure:"refresh_expiration"`
    } `mapstructure:"jwt"`
    
    Email struct {
        SMTPHost     string `mapstructure:"smtp_host"`
        SMTPPort     int    `mapstructure:"smtp_port"`
        SMTPUser     string `mapstructure:"smtp_user"`
        SMTPPassword string `mapstructure:"smtp_password"`
        FromAddress  string `mapstructure:"from_address"`
    } `mapstructure:"email"`
}
```

## Migration Strategy

### Database Migration System
```go
type Migration struct {
    Version     int
    Description string
    Up          func(*mongo.Database) error
    Down        func(*mongo.Database) error
}

type Migrator struct {
    db         *mongo.Database
    migrations []Migration
}

func (m *Migrator) Migrate() error {
    // Create migrations collection if not exists
    // Get current version from migrations collection
    // Apply pending migrations
    // Update version tracking in migrations collection
}

// Example migration
func CreateIndexesMigration(db *mongo.Database) error {
    // Create indexes for users collection
    _, err := db.Collection("users").Indexes().CreateOne(
        context.Background(),
        mongo.IndexModel{
            Keys:    bson.D{{Key: "email", Value: 1}},
            Options: options.Index().SetUnique(true),
        },
    )
    return err
}
```

### Data Migration from Node.js
```go
// Migration utility to convert existing PostgreSQL data to MongoDB
type DataMigrator struct {
    sourceDB *sql.DB // PostgreSQL from Node.js app
    targetDB *mongo.Database // MongoDB for Go app
}

func (dm *DataMigrator) MigrateUsers() error {
    // Read users from PostgreSQL
    rows, err := dm.sourceDB.Query("SELECT id, email, password, first_name, last_name, created_at FROM users")
    if err != nil {
        return err
    }
    defer rows.Close()
    
    var users []interface{}
    for rows.Next() {
        var user bson.M
        var id, email, password, firstName, lastName string
        var createdAt time.Time
        
        err := rows.Scan(&id, &email, &password, &firstName, &lastName, &createdAt)
        if err != nil {
            return err
        }
        
        // Transform to MongoDB document format
        user = bson.M{
            "_id":         primitive.NewObjectID(),
            "email":       email,
            "password":    password,
            "firstName":   firstName,
            "lastName":    lastName,
            "createdAt":   createdAt,
            "updatedAt":   createdAt,
            "emailVerified": false,
        }
        users = append(users, user)
    }
    
    // Bulk insert into MongoDB
    _, err = dm.targetDB.Collection("users").InsertMany(context.Background(), users)
    return err
}

func (dm *DataMigrator) MigrateWorkspaces() error {
    // Similar pattern for workspaces, handling member relationships
    // Convert relational workspace_members table to embedded members array
}
```

## Monitoring and Logging

### Structured Logging
```go
func setupLogger() *slog.Logger {
    opts := &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }
    
    handler := slog.NewJSONHandler(os.Stdout, opts)
    return slog.New(handler)
}

// Usage in handlers
func (h *AuthHandler) Login(c *gin.Context) {
    h.logger.Info("login attempt", 
        "email", email,
        "ip", c.ClientIP(),
        "user_agent", c.GetHeader("User-Agent"))
}
```

### Health Checks
```go
func (s *Server) healthCheck(c *gin.Context) {
    health := map[string]interface{}{
        "status":    "healthy",
        "timestamp": time.Now(),
        "version":   s.config.Version,
    }
    
    // Check MongoDB connectivity
    if err := s.db.Ping(c.Request.Context(), readpref.Primary()); err != nil {
        health["status"] = "unhealthy"
        health["database"] = "disconnected"
        c.JSON(503, health)
        return
    }
    
    health["database"] = "connected"
    c.JSON(200, health)
}
```

## Development Workflow

### Project Structure
```
project-management-go/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── auth/
│   ├── workspace/
│   ├── board/
│   ├── item/
│   └── common/
├── pkg/
│   ├── database/
│   ├── email/
│   └── logger/
├── frontend/
│   ├── css/
│   ├── js/
│   └── index.html
├── migrations/
├── docker/
├── scripts/
├── go.mod
├── go.sum
├── Dockerfile
└── README.md
```

### Development Commands
```makefile
# Makefile for development
.PHONY: build run test migrate

build:
	go build -o bin/server ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

migrate:
	go run ./cmd/migrate

dev:
	air # Live reload tool

docker-build:
	docker build -t project-management .

docker-run:
	docker-compose up
```

This design provides a solid foundation for porting the project management platform to Go and vanilla JavaScript while maintaining the core functionality and improving performance and deployment simplicity.