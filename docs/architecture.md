# Project Management Platform - Architecture

## System Architecture Overview

The project management platform follows a **layered monolithic architecture** with clear separation between presentation, business logic, and data layers. The system is designed for scalability, maintainability, and security.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end
    
    subgraph "Load Balancer/Proxy"
        Nginx[Nginx Reverse Proxy]
    end
    
    subgraph "Application Layer"
        GinRouter[Gin HTTP Router]
        Middleware[Middleware Stack]
        Handlers[HTTP Handlers]
        Services[Business Services]
        Repositories[Repository Layer]
    end
    
    subgraph "Real-time Layer"
        WSHandler[WebSocket Handler]
        WSHub[WebSocket Hub]
        Broadcaster[Event Broadcaster]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB Database)]
        Cache[In-Memory Cache]
    end
    
    subgraph "External Services"
        SMTP[SMTP Email Server]
        Monitoring[Monitoring/Metrics]
    end
    
    Browser --> Nginx
    Mobile --> Nginx
    Nginx --> GinRouter
    GinRouter --> Middleware
    Middleware --> Handlers
    Handlers --> Services
    Services --> Repositories
    Repositories --> MongoDB
    Services --> Cache
    
    GinRouter --> WSHandler
    WSHandler --> WSHub
    WSHub --> Broadcaster
    Broadcaster --> MongoDB
    
    Services --> SMTP
    Middleware --> Monitoring
```

## Layer Responsibilities

### 1. Presentation Layer (HTTP Handlers)

**Location**: `internal/handlers/`

Responsibilities:
- HTTP request/response handling
- Input validation and sanitization
- Authentication/authorization checks
- Response formatting
- Error handling and status codes

Key handlers:
- `AuthHandler` - Authentication operations
- `BoardHandler` - Board management
- `ItemHandler` - Item CRUD operations
- `WorkspaceHandler` - Workspace management
- `CommentHandler` - Comments and discussions

### 2. Business Logic Layer (Services)

**Location**: `internal/services/`

Responsibilities:
- Core business logic implementation
- Data validation and transformation
- Inter-service communication
- Transaction management
- Business rule enforcement

Key services:
- `AuthService` - User authentication and JWT management
- `BoardService` - Board operations and permissions
- `ItemService` - Item lifecycle management
- `WorkspaceService` - Workspace operations
- `EmailService` - Email notifications
- `SearchService` - Full-text search functionality
- `FilterService` - Advanced filtering logic

### 3. Data Access Layer (Repositories)

**Location**: `internal/repository/`

Responsibilities:
- Database query abstraction
- Data mapping and transformation
- Connection pool management
- Query optimization
- Database-specific logic

Key repositories:
- `UserRepository` - User data operations
- `BoardRepository` - Board persistence
- `ItemRepository` - Item data access
- `WorkspaceRepository` - Workspace data
- `CommentRepository` - Comment storage
- `ActivityRepository` - Activity logging

## Middleware Stack

The application uses a comprehensive middleware stack for cross-cutting concerns:

```mermaid
graph TD
    Request[HTTP Request] --> Recovery[Panic Recovery]
    Recovery --> Security[Security Headers]
    Security --> CORS[CORS Handling]
    CORS --> CSRF[CSRF Protection]
    CSRF --> RateLimit[Rate Limiting]
    RateLimit --> Auth[Authentication]
    Auth --> Logging[Request Logging]
    Logging --> Metrics[Metrics Collection]
    Metrics --> Validation[Input Validation]
    Validation --> Handler[Route Handler]
```

### Middleware Components

1. **Security Middleware**
   - HTTPS redirect (production)
   - HSTS headers
   - Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
   - Content Security Policy
   - Input sanitization

2. **Authentication Middleware**
   - JWT token validation
   - User context injection
   - Permission checking
   - Session management

3. **Rate Limiting Middleware**
   - Per-IP rate limiting
   - Per-user rate limiting
   - Endpoint-specific limits
   - Burst capacity handling

4. **Monitoring Middleware**
   - Request ID generation
   - Structured logging
   - Performance metrics
   - Error tracking

## Data Flow Architecture

### 1. Request Processing Flow

```mermaid
sequenceDiagram
    participant Client
    participant Nginx
    participant Gin
    participant Middleware
    participant Handler
    participant Service
    participant Repository
    participant MongoDB
    
    Client->>Nginx: HTTP Request
    Nginx->>Gin: Forward Request
    Gin->>Middleware: Apply Middleware Stack
    Middleware->>Handler: Route to Handler
    Handler->>Service: Call Business Logic
    Service->>Repository: Data Access
    Repository->>MongoDB: Database Query
    MongoDB-->>Repository: Query Result
    Repository-->>Service: Domain Objects
    Service-->>Handler: Processed Data
    Handler-->>Gin: HTTP Response
    Gin-->>Nginx: Response
    Nginx-->>Client: Final Response
```

### 2. WebSocket Real-time Flow

```mermaid
sequenceDiagram
    participant Client
    participant WSHandler
    participant Hub
    participant Broadcaster
    participant MongoDB
    participant OtherClients
    
    Client->>WSHandler: WebSocket Connection
    WSHandler->>Hub: Register Client
    
    Note over Client,MongoDB: Data Change Event
    Client->>WSHandler: Update Message
    WSHandler->>Broadcaster: Broadcast Event
    Broadcaster->>MongoDB: Persist Change
    Broadcaster->>Hub: Notify All Clients
    Hub->>OtherClients: Real-time Update
```

## Database Architecture

### MongoDB Collections Structure

```mermaid
erDiagram
    USERS ||--o{ WORKSPACES : creates
    USERS ||--o{ BOARDS : owns
    USERS ||--o{ ITEMS : assigned
    USERS ||--o{ COMMENTS : writes
    USERS ||--o{ ACTIVITIES : generates
    
    WORKSPACES ||--o{ BOARDS : contains
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : has
    
    BOARDS ||--o{ ITEMS : contains
    BOARDS ||--o{ COLUMNS : has
    BOARDS ||--o{ BOARD_PERMISSIONS : has
    
    ITEMS ||--o{ COMMENTS : receives
    ITEMS ||--o{ ACTIVITIES : generates
    ITEMS ||--o{ ITEM_ASSIGNMENTS : has
    
    COMMENTS ||--o{ COMMENT_REPLIES : has
    COMMENTS ||--o{ COMMENT_MENTIONS : contains
    
    USERS ||--o{ SAVED_FILTERS : creates
    USERS ||--o{ NOTIFICATIONS : receives
```

### Collection Indexes

Key indexes for performance optimization:

1. **Users Collection**
   - `email` (unique)
   - `username` (unique)
   - `created_at`

2. **Boards Collection**
   - `workspace_id`
   - `owner_id`
   - `created_at`
   - `updated_at`

3. **Items Collection**
   - `board_id`
   - `assigned_to`
   - `status`
   - `priority`
   - `created_at`
   - Text index on `title` and `description`

4. **Activities Collection**
   - `user_id`
   - `board_id`
   - `item_id`
   - `created_at`
   - Compound index on `board_id` + `created_at`

## Security Architecture

### Authentication & Authorization

```mermaid
graph TD
    Login[User Login] --> Validate[Validate Credentials]
    Validate --> Generate[Generate JWT Tokens]
    Generate --> Access[Access Token - 15min]
    Generate --> Refresh[Refresh Token - 7 days]
    
    Request[API Request] --> Extract[Extract Access Token]
    Extract --> Verify[Verify Token]
    Verify --> Context[Inject User Context]
    Context --> Authorize[Check Permissions]
    Authorize --> Process[Process Request]
    
    Expired[Token Expired] --> RefreshFlow[Refresh Token Flow]
    RefreshFlow --> NewTokens[Generate New Tokens]
```

### Security Layers

1. **Transport Security**
   - HTTPS enforcement
   - TLS 1.2+ requirement
   - HSTS headers

2. **Input Security**
   - Input validation
   - SQL injection prevention
   - XSS protection
   - CSRF tokens

3. **Authentication Security**
   - JWT with short expiration
   - Refresh token rotation
   - Password hashing (bcrypt)
   - Rate limiting on auth endpoints

4. **Authorization Security**
   - Role-based access control
   - Resource-level permissions
   - Workspace isolation
   - API endpoint protection

## Scalability Considerations

### Current Architecture Scalability

1. **Horizontal Scaling**
   - Stateless application design
   - Session-less JWT authentication
   - Database connection pooling
   - Load balancer ready

2. **Vertical Scaling**
   - Efficient memory usage
   - Connection pool optimization
   - Query optimization
   - Caching strategies

3. **Database Scaling**
   - MongoDB replica sets
   - Read preference configuration
   - Index optimization
   - Sharding preparation

### Future Scaling Strategies

1. **Microservices Migration**
   - Service extraction by domain
   - API gateway implementation
   - Service mesh adoption
   - Distributed tracing

2. **Caching Layer**
   - Redis integration
   - Application-level caching
   - Database query caching
   - CDN for static assets

3. **Message Queue Integration**
   - Asynchronous processing
   - Event-driven architecture
   - Background job processing
   - Real-time event streaming

## Monitoring & Observability

### Metrics Collection

```mermaid
graph LR
    App[Application] --> Metrics[Metrics Collector]
    Metrics --> Prometheus[Prometheus]
    Prometheus --> Grafana[Grafana Dashboard]
    
    App --> Logs[Structured Logs]
    Logs --> ELK[ELK Stack]
    
    App --> Traces[Distributed Tracing]
    Traces --> Jaeger[Jaeger]
    
    App --> Alerts[Alert Manager]
    Alerts --> Notification[Notification Channels]
```

### Key Metrics

1. **Application Metrics**
   - Request rate and latency
   - Error rates by endpoint
   - Active user sessions
   - WebSocket connections

2. **Business Metrics**
   - User registrations
   - Board creations
   - Item completions
   - Collaboration events

3. **Infrastructure Metrics**
   - CPU and memory usage
   - Database connection pool
   - Response times
   - Error rates

## Development Architecture

### Local Development Setup

```mermaid
graph TD
    Developer[Developer Machine] --> Docker[Docker Compose]
    Docker --> MongoDB[MongoDB Container]
    Docker --> App[Application Container]
    Docker --> Frontend[Static File Serving]
    
    Developer --> IDE[IDE/Editor]
    IDE --> GoTools[Go Tools]
    IDE --> Debugger[Debugger]
    
    Developer --> Testing[Testing Tools]
    Testing --> GoTest[Go Test]
    Testing --> Playwright[Playwright E2E]
```

### CI/CD Pipeline Architecture

```mermaid
graph LR
    Git[Git Repository] --> CI[CI Pipeline]
    CI --> Build[Build & Test]
    Build --> Security[Security Scan]
    Security --> Package[Container Build]
    Package --> Registry[Container Registry]
    Registry --> Deploy[Deployment]
    Deploy --> Production[Production Environment]
```

This architecture provides a solid foundation for a scalable, maintainable, and secure project management platform while maintaining simplicity and developer productivity.
