# internal/database/client.go

## File Overview

MongoDB client initialization module that handles database connection setup, URI validation, connection testing, and automatic index creation for core collections. This module ensures proper database connectivity and prepares the database with essential indexes for optimal performance.

## Key Components

### Client Creation Function
```go
func NewClient(uri string) (*mongo.Client, error)
```
- **Purpose**: Creates and configures MongoDB client with validation and index initialization
- **Validation**: URI format and scheme validation
- **Connection Testing**: Verifies connectivity before returning client
- **Index Initialization**: Creates essential indexes on core collections

### Connection Process
1. **URI Validation**: Ensures valid MongoDB connection string
2. **Temporary Connection**: Creates temporary client for index initialization
3. **Index Creation**: Sets up indexes on all core collections
4. **Fresh Client**: Returns new client instance for application use
5. **Connection Verification**: Pings database to ensure connectivity

## Dependencies

### External Libraries
- `go.mongodb.org/mongo-driver/mongo` - MongoDB driver
- `go.mongodb.org/mongo-driver/mongo/options` - Connection options
- `go.mongodb.org/mongo-driver/bson` - BSON document handling

### Standard Libraries
- `context` - Request context and timeouts
- `fmt` - Error formatting
- `net/url` - URI parsing and validation
- `time` - Timeout configuration

## Data Flow

### Client Initialization Process
```mermaid
sequenceDiagram
    participant App
    participant Client
    participant TempClient
    participant MongoDB
    
    App->>Client: NewClient(uri)
    Client->>Client: Validate URI
    Client->>TempClient: Create Temporary Client
    TempClient->>MongoDB: Connect & Ping
    TempClient->>MongoDB: Create Indexes
    TempClient->>TempClient: Disconnect
    Client->>MongoDB: Create Fresh Client
    MongoDB-->>Client: Connection Established
    Client-->>App: Return Client
```

## Interactions

### URI Validation
```go
u, err := url.Parse(uri)
if err != nil {
    return nil, fmt.Errorf("invalid MongoDB URI: %w", err)
}
if u.Scheme != "mongodb" && u.Scheme != "mongodb+srv" {
    return nil, fmt.Errorf("invalid MongoDB URI: %s", uri)
}
```
- **Scheme Validation**: Ensures URI uses `mongodb://` or `mongodb+srv://`
- **Format Checking**: Validates URI structure using Go's url package
- **Error Handling**: Provides descriptive error messages for invalid URIs

### Index Initialization
```go
// Initialize default indexes on test database
db := tempClient.Database("test_project_management_init")
indexModel := mongo.IndexModel{Keys: bson.D{{Key: "createdAt", Value: 1}}}
collections := []string{"users", "workspaces", "boards", "items", "comments", "activities", "notifications"}
for _, coll := range collections {
    if _, err := db.Collection(coll).Indexes().CreateOne(tempCtx, indexModel); err != nil {
        return nil, fmt.Errorf("failed to create index for %s: %w", coll, err)
    }
}
```
- **Temporary Database**: Uses test database for index initialization
- **Standard Index**: Creates `createdAt` ascending index on all collections
- **Collection Coverage**: Covers all core application collections
- **Error Handling**: Fails fast if index creation fails

### Connection Management
```go
// Temporary client for index initialization
tempCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
tempClient, err := mongo.Connect(tempCtx, opts)
// ... use temporary client ...
defer tempClient.Disconnect(tempCtx)

// Return fresh client for application use
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
client, err := mongo.Connect(ctx, opts)
```
- **Timeout Management**: 10-second timeout for all operations
- **Resource Cleanup**: Proper cleanup of temporary connections
- **Fresh Instance**: Returns clean client instance for application

## Example Usage

### Basic Connection
```go
// Connect to local MongoDB
client, err := database.NewClient("mongodb://localhost:27017")
if err != nil {
    log.Fatalf("Failed to connect to MongoDB: %v", err)
}
defer client.Disconnect(context.Background())

// Use the client
db := client.Database("project_management")
collection := db.Collection("users")
```

### Production Connection with Authentication
```go
// Connect to authenticated MongoDB
uri := "mongodb://user:password@localhost:27017/project_management?authSource=admin"
client, err := database.NewClient(uri)
if err != nil {
    log.Fatalf("Failed to connect to MongoDB: %v", err)
}
defer client.Disconnect(context.Background())
```

### MongoDB Atlas Connection
```go
// Connect to MongoDB Atlas
uri := "mongodb+srv://user:password@cluster.mongodb.net/project_management"
client, err := database.NewClient(uri)
if err != nil {
    log.Fatalf("Failed to connect to MongoDB Atlas: %v", err)
}
defer client.Disconnect(context.Background())
```

### Connection with Configuration
```go
// In main.go
cfg, err := config.Load()
if err != nil {
    log.Fatalf("Failed to load configuration: %v", err)
}

client, err := database.NewClient(cfg.Database.URI)
if err != nil {
    log.Fatalf("Failed to connect to MongoDB: %v", err)
}
defer func() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := client.Disconnect(ctx); err != nil {
        log.Printf("Failed to disconnect from MongoDB: %v", err)
    }
}()

db := client.Database(cfg.Database.Name)
```

## Error Handling

### Connection Errors
```go
// URI validation errors
if uri == "" {
    return nil, fmt.Errorf("MongoDB URI is required")
}

// URI parsing errors
u, err := url.Parse(uri)
if err != nil {
    return nil, fmt.Errorf("invalid MongoDB URI: %w", err)
}

// Scheme validation errors
if u.Scheme != "mongodb" && u.Scheme != "mongodb+srv" {
    return nil, fmt.Errorf("invalid MongoDB URI: %s", uri)
}

// Connection errors
if err := mongo.Connect(ctx, opts); err != nil {
    return nil, fmt.Errorf("failed to connect: %w", err)
}

// Ping errors
if err := client.Ping(ctx, nil); err != nil {
    return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
}
```

### Index Creation Errors
```go
// Index creation failure
if _, err := db.Collection(coll).Indexes().CreateOne(tempCtx, indexModel); err != nil {
    return nil, fmt.Errorf("failed to create index for %s: %w", coll, err)
}
```

### Error Recovery
- **Temporary Client Cleanup**: Ensures temporary client is always disconnected
- **Context Timeout**: Prevents hanging connections
- **Descriptive Errors**: Provides clear error messages for debugging

## Performance Considerations

### Connection Optimization
- **Connection Pooling**: MongoDB driver automatically manages connection pools
- **Timeout Configuration**: 10-second timeout prevents hanging connections
- **Resource Cleanup**: Proper cleanup prevents resource leaks

### Index Strategy
- **Essential Indexes**: Creates commonly used `createdAt` index
- **Lazy Loading**: Additional indexes created by specific repositories
- **Test Database**: Uses separate database for initialization to avoid conflicts

### Memory Management
```go
// Proper resource cleanup
defer tempClient.Disconnect(tempCtx)

// Context timeout management
tempCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
```

## Production Considerations

### Connection String Security
```go
// Environment variable configuration
uri := os.Getenv("MONGODB_URI")
if uri == "" {
    uri = "mongodb://localhost:27017" // Development fallback
}
```

### Connection Pool Configuration
```go
// Custom connection options for production
opts := options.Client().
    ApplyURI(uri).
    SetMaxPoolSize(100).
    SetMinPoolSize(10).
    SetMaxConnIdleTime(30 * time.Second)
```

### Monitoring and Logging
```go
// Add connection monitoring
opts := options.Client().
    ApplyURI(uri).
    SetMonitor(&event.CommandMonitor{
        Started: func(_ context.Context, evt *event.CommandStartedEvent) {
            log.Printf("MongoDB command started: %s", evt.CommandName)
        },
        Succeeded: func(_ context.Context, evt *event.CommandSucceededEvent) {
            log.Printf("MongoDB command succeeded: %s (%dms)", 
                evt.CommandName, evt.DurationNanos/1000000)
        },
        Failed: func(_ context.Context, evt *event.CommandFailedEvent) {
            log.Printf("MongoDB command failed: %s - %s", 
                evt.CommandName, evt.Failure)
        },
    })
```

### Health Checks
```go
// Health check function
func (c *Client) HealthCheck(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    return c.Ping(ctx, nil)
}
```

### Graceful Shutdown
```go
// In main.go shutdown handler
defer func() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := client.Disconnect(ctx); err != nil {
        logger.Error("Failed to disconnect from MongoDB", "error", err)
    } else {
        logger.Info("Disconnected from MongoDB")
    }
}()
```

## Testing Considerations

### Test Database Connection
```go
// Use separate database for tests
func NewTestClient() (*mongo.Client, error) {
    uri := "mongodb://localhost:27017"
    if testURI := os.Getenv("TEST_MONGODB_URI"); testURI != "" {
        uri = testURI
    }
    return NewClient(uri)
}

// Test cleanup
func CleanupTestDatabase(client *mongo.Client, dbName string) error {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    return client.Database(dbName).Drop(ctx)
}
```

### Integration Testing
```go
func TestDatabaseConnection(t *testing.T) {
    client, err := database.NewClient("mongodb://localhost:27017")
    if err != nil {
        t.Fatalf("Failed to connect: %v", err)
    }
    defer client.Disconnect(context.Background())
    
    // Test ping
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    if err := client.Ping(ctx, nil); err != nil {
        t.Fatalf("Failed to ping: %v", err)
    }
}
```

This database client module provides a robust, production-ready foundation for MongoDB connectivity with proper error handling, resource management, and performance optimization.
