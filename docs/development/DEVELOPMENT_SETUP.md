# Development Setup Guide

## Prerequisites

Before setting up the development environment, ensure you have the following installed:

### Required Software
- **Go 1.21+**: [Download Go](https://golang.org/dl/)
- **MongoDB 6.0+**: [Download MongoDB](https://www.mongodb.com/try/download/community)
- **Node.js 18+**: [Download Node.js](https://nodejs.org/) (for frontend tooling)
- **Git**: [Download Git](https://git-scm.com/downloads)
- **Docker & Docker Compose**: [Download Docker](https://www.docker.com/get-started) (optional, for containerized development)

### Development Tools (Recommended)
- **VS Code**: With Go and MongoDB extensions
- **MongoDB Compass**: GUI for MongoDB
- **Postman**: API testing
- **Git client**: GitKraken, SourceTree, or command line

## Project Structure

```
project-management-platform/
├── cmd/                    # Application entry points
│   ├── server/            # Main server application
│   └── migrate/           # Migration utilities
├── internal/              # Private application code
│   ├── handlers/          # HTTP handlers
│   ├── services/          # Business logic
│   ├── models/            # Data models
│   ├── repositories/      # Data access layer
│   ├── middleware/        # HTTP middleware
│   ├── auth/              # Authentication logic
│   ├── security/          # Security utilities
│   └── utils/             # Utility functions
├── frontend/              # Frontend application
│   └── vanilla/           # Vanilla JavaScript frontend
│       ├── css/           # Stylesheets
│       ├── js/            # JavaScript modules
│       └── index.html     # Main HTML file
├── docs/                  # Documentation
├── test/                  # Test files
├── docker/                # Docker configurations
├── scripts/               # Build and deployment scripts
├── go.mod                 # Go module definition
└── README.md              # Project overview
```

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/project-management-platform.git
cd project-management-platform
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Database Setup
```bash
# Start MongoDB (if not using Docker)
mongod --dbpath /path/to/your/db

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

### 4. Install Dependencies
```bash
# Go dependencies
go mod download

# Frontend dependencies (if any)
cd frontend/vanilla && npm install && cd ../..
```

### 5. Run the Application
```bash
# Development mode
go run cmd/server/main.go

# Or use the Makefile
make dev
```

The application will be available at:
- **Backend API**: http://localhost:8080
- **Frontend**: http://localhost:8080 (served by Go server)

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=8080
HOST=localhost
ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=project_management
MONGODB_TIMEOUT=10s

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@your-domain.com

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# File Upload
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads

# Cache Configuration
CACHE_TTL=5m
CACHE_CLEANUP_INTERVAL=10m
```

### Configuration Validation

The application validates configuration on startup. Required variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`

## Development Workflow

### 1. Code Organization

#### Backend (Go)
- **Handlers**: HTTP request handling (`internal/handlers/`)
- **Services**: Business logic (`internal/services/`)
- **Repositories**: Data access (`internal/repositories/`)
- **Models**: Data structures (`internal/models/`)
- **Middleware**: HTTP middleware (`internal/middleware/`)

#### Frontend (Vanilla JavaScript)
- **Components**: Reusable UI components (`frontend/vanilla/js/components/`)
- **Services**: API communication (`frontend/vanilla/js/services/`)
- **Utils**: Utility functions (`frontend/vanilla/js/utils/`)
- **Styles**: CSS with custom properties (`frontend/vanilla/css/`)

### 2. Development Commands

```bash
# Run in development mode with hot reload
make dev

# Run tests
make test

# Run tests with coverage
make test-coverage

# Build for production
make build

# Format code
make fmt

# Lint code
make lint

# Generate API documentation
make docs

# Clean build artifacts
make clean
```

### 3. Database Management

#### MongoDB Setup
```bash
# Start MongoDB
mongod --dbpath ./data/db

# Connect with MongoDB shell
mongosh

# Create database and user
use project_management
db.createUser({
  user: "pm_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

#### Database Migrations
```bash
# Run migrations
go run cmd/migrate/main.go up

# Rollback migrations
go run cmd/migrate/main.go down

# Create new migration
go run cmd/migrate/main.go create migration_name
```

### 4. Testing

#### Unit Tests
```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with detailed coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

#### Integration Tests
```bash
# Run integration tests
go test -tags=integration ./test/integration/...

# Run with test database
MONGODB_URI=mongodb://localhost:27017/test_db go test ./...
```

#### Frontend Tests
```bash
# Run frontend tests
cd frontend/vanilla
npm test

# Run with coverage
npm run test:coverage
```

### 5. API Development

#### Adding New Endpoints
1. **Define Model** (`internal/models/`)
2. **Create Repository** (`internal/repositories/`)
3. **Implement Service** (`internal/services/`)
4. **Add Handler** (`internal/handlers/`)
5. **Register Routes** (`cmd/server/main.go`)
6. **Write Tests**

#### Example: Adding a New Entity
```go
// 1. Model (internal/models/task.go)
type Task struct {
    ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Title       string            `bson:"title" json:"title"`
    Description string            `bson:"description" json:"description"`
    CreatedAt   time.Time         `bson:"created_at" json:"created_at"`
}

// 2. Repository (internal/repositories/task_repository.go)
type TaskRepository interface {
    Create(ctx context.Context, task *models.Task) error
    GetByID(ctx context.Context, id string) (*models.Task, error)
}

// 3. Service (internal/services/task_service.go)
type TaskService struct {
    repo repositories.TaskRepository
}

// 4. Handler (internal/handlers/task_handler.go)
func (h *TaskHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

## Frontend Development

### 1. Component Architecture

The frontend uses a component-based architecture without frameworks:

```javascript
// Base component class
class Component {
    constructor(element) {
        this.element = element;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.render();
    }
    
    bindEvents() {
        // Event binding
    }
    
    render() {
        // Rendering logic
    }
}

// Example component
class TaskList extends Component {
    constructor(element) {
        super(element);
        this.tasks = [];
    }
    
    async loadTasks() {
        this.tasks = await api.tasks.list();
        this.render();
    }
}
```

### 2. API Integration

```javascript
// API client usage
import { api } from './services/api.js';

// Authentication
await api.auth.login('user@example.com', 'password');

// CRUD operations
const tasks = await api.tasks.list();
const task = await api.tasks.create({ title: 'New Task' });
await api.tasks.update(task.id, { title: 'Updated Task' });
await api.tasks.delete(task.id);
```

### 3. State Management

```javascript
// Simple state management
class AppState {
    constructor() {
        this.state = {
            user: null,
            workspaces: [],
            currentWorkspace: null
        };
        this.listeners = [];
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }
    
    subscribe(listener) {
        this.listeners.push(listener);
    }
}

const appState = new AppState();
```

## Debugging

### 1. Backend Debugging

#### Using Delve (Go Debugger)
```bash
# Install Delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Debug the application
dlv debug cmd/server/main.go

# Set breakpoints and run
(dlv) break main.main
(dlv) continue
```

#### Logging
```go
// Use structured logging
import "github.com/sirupsen/logrus"

log := logrus.WithFields(logrus.Fields{
    "user_id": userID,
    "action": "create_task",
})
log.Info("Creating new task")
```

### 2. Frontend Debugging

#### Browser DevTools
- **Console**: `console.log()`, `console.error()`
- **Network**: Monitor API requests
- **Sources**: Set breakpoints in JavaScript
- **Application**: Inspect localStorage, sessionStorage

#### Debug Mode
```javascript
// Enable debug mode
localStorage.setItem('debug', 'true');

// Debug logging
if (localStorage.getItem('debug')) {
    console.log('Debug info:', data);
}
```

## Performance Optimization

### 1. Backend Performance

#### Database Optimization
```go
// Use indexes for frequent queries
db.collection.createIndex({ "user_id": 1, "created_at": -1 })

// Use aggregation pipelines for complex queries
pipeline := []bson.M{
    {"$match": bson.M{"workspace_id": workspaceID}},
    {"$group": bson.M{"_id": "$status", "count": bson.M{"$sum": 1}}},
}
```

#### Caching
```go
// Implement caching for expensive operations
func (s *TaskService) GetTasks(ctx context.Context, workspaceID string) ([]*models.Task, error) {
    cacheKey := fmt.Sprintf("tasks:%s", workspaceID)
    
    // Try cache first
    if cached, found := s.cache.Get(cacheKey); found {
        return cached.([]*models.Task), nil
    }
    
    // Fetch from database
    tasks, err := s.repo.GetByWorkspace(ctx, workspaceID)
    if err != nil {
        return nil, err
    }
    
    // Cache the result
    s.cache.Set(cacheKey, tasks, 5*time.Minute)
    return tasks, nil
}
```

### 2. Frontend Performance

#### Lazy Loading
```javascript
// Lazy load components
const loadComponent = async (componentName) => {
    const module = await import(`./components/${componentName}.js`);
    return module.default;
};
```

#### Virtual Scrolling
```javascript
// Implement virtual scrolling for large lists
class VirtualList {
    constructor(container, itemHeight, items) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.items = items;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.init();
    }
    
    render() {
        // Only render visible items
        const visibleItems = this.items.slice(this.visibleStart, this.visibleEnd);
        // Render logic
    }
}
```

## Security Considerations

### 1. Backend Security

#### Input Validation
```go
// Validate all inputs
func validateCreateTaskRequest(req *CreateTaskRequest) error {
    if req.Title == "" {
        return errors.New("title is required")
    }
    if len(req.Title) > 200 {
        return errors.New("title too long")
    }
    return nil
}
```

#### Authentication Middleware
```go
// Protect routes with authentication
func (m *AuthMiddleware) RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := extractToken(r)
        if token == "" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        
        user, err := m.validateToken(token)
        if err != nil {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
        
        ctx := context.WithValue(r.Context(), "user", user)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 2. Frontend Security

#### XSS Prevention
```javascript
// Sanitize user input
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Use textContent instead of innerHTML
element.textContent = userInput;
```

#### CSRF Protection
```javascript
// Include CSRF token in requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

fetch('/api/tasks', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify(data)
});
```

## Deployment

### 1. Local Deployment

#### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f
```

### 2. Production Deployment

#### Build for Production
```bash
# Build Go binary
CGO_ENABLED=0 GOOS=linux go build -o bin/server cmd/server/main.go

# Build Docker image
docker build -t project-management-platform .

# Push to registry
docker tag project-management-platform your-registry/project-management-platform:latest
docker push your-registry/project-management-platform:latest
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```bash
# Check MongoDB status
systemctl status mongod

# Check connection
mongosh --eval "db.adminCommand('ismaster')"

# Check logs
tail -f /var/log/mongodb/mongod.log
```

#### 2. Port Already in Use
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

#### 3. Go Module Issues
```bash
# Clean module cache
go clean -modcache

# Tidy dependencies
go mod tidy

# Verify dependencies
go mod verify
```

#### 4. Frontend Issues
```bash
# Clear browser cache
# Check browser console for errors
# Verify API endpoints are accessible
curl http://localhost:8080/health
```

### Debug Checklist

1. **Environment Variables**: Verify all required variables are set
2. **Database Connection**: Ensure MongoDB is running and accessible
3. **Port Conflicts**: Check if ports are available
4. **Dependencies**: Verify all dependencies are installed
5. **Permissions**: Check file and directory permissions
6. **Logs**: Review application logs for errors
7. **Network**: Verify network connectivity and firewall settings

## Contributing

### 1. Code Style

#### Go Code Style
- Follow `gofmt` formatting
- Use meaningful variable names
- Add comments for exported functions
- Handle errors explicitly

#### JavaScript Code Style
- Use ES6+ features
- Follow consistent naming conventions
- Add JSDoc comments for functions
- Use async/await for promises

### 2. Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create pull request
git push origin feature/new-feature
```

### 3. Testing Requirements

- All new features must include tests
- Maintain minimum 80% code coverage
- Integration tests for API endpoints
- Frontend tests for components

## Resources

### Documentation
- [Go Documentation](https://golang.org/doc/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JavaScript MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI
- [VS Code](https://code.visualstudio.com/) - Code editor

### Community
- [Go Community](https://golang.org/help/)
- [MongoDB Community](https://www.mongodb.com/community/)
- [Stack Overflow](https://stackoverflow.com/) - Q&A

## Support

For development support:
- **Documentation**: This guide and API documentation
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: dev-support@your-domain.com