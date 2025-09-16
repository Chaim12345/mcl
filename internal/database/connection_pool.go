package database

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	ErrPoolClosed     = errors.New("connection pool is closed")
	ErrInvalidConfig  = errors.New("invalid configuration")
	ErrTimeout        = errors.New("operation timeout")
	ErrMaxConnections = errors.New("maximum connections reached")
)

type PoolConfig struct {
	MaxConnections     int
	MinConnections     int
	MaxIdleTime        time.Duration
	MaxLifetime        time.Duration
	HealthCheckPeriod  time.Duration
	ConnectionTimeout  time.Duration
	MaxRetryAttempts   int
	RetryBackoffFactor float64
}

type ConnectionPool struct {
	client     *mongo.Client
	config     *PoolConfig
	mu         sync.RWMutex
	closed     bool
	stats      *PoolStats
	metrics    *PoolMetrics
	health     *HealthChecker
}

type PoolStats struct {
	ActiveConnections int
	IdleConnections   int
	TotalConnections  int
	WaitQueueSize     int
	mu                sync.RWMutex
}

type PoolMetrics struct {
	ConnectionsCreated   int64
	ConnectionsClosed    int64
	ConnectionsAcquired  int64
	ConnectionsReleased  int64
	ConnectionErrors     int64
	OperationErrors      int64
	RetryAttempts        int64
	mu                   sync.RWMutex
}

func NewConnectionPool(config *PoolConfig) (*ConnectionPool, error) {
	if config == nil {
		return nil, ErrInvalidConfig
	}

	// Apply defaults
	applyDefaults(config)

	// Validate configuration
	if err := validateConfig(config); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidConfig, err)
	}

	clientOptions := options.Client().
		ApplyURI("mongodb://localhost:27017").
		SetMaxPoolSize(uint64(config.MaxConnections)).
		SetMinPoolSize(uint64(config.MinConnections)).
		SetMaxConnIdleTime(config.MaxIdleTime).
		SetConnectTimeout(config.ConnectionTimeout).
		SetSocketTimeout(config.ConnectionTimeout)

	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping to verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	pool := &ConnectionPool{
		client:  client,
		config:  config,
		closed:  false,
		stats:   &PoolStats{},
		metrics: &PoolMetrics{},
		health:  NewHealthChecker(client),
	}

	// Start health checker
	go pool.health.Start(config.HealthCheckPeriod)

	// Start metrics collector
	go pool.collectMetrics()

	return pool, nil
}

func applyDefaults(config *PoolConfig) {
	if config.MaxConnections <= 0 {
		config.MaxConnections = 100
	}
	if config.MinConnections <= 0 {
		config.MinConnections = 10
	}
	if config.MaxIdleTime <= 0 {
		config.MaxIdleTime = 30 * time.Minute
	}
	if config.MaxLifetime <= 0 {
		config.MaxLifetime = 1 * time.Hour
	}
	if config.HealthCheckPeriod <= 0 {
		config.HealthCheckPeriod = 30 * time.Second
	}
	if config.ConnectionTimeout <= 0 {
		config.ConnectionTimeout = 10 * time.Second
	}
	if config.MaxRetryAttempts <= 0 {
		config.MaxRetryAttempts = 3
	}
	if config.RetryBackoffFactor <= 0 {
		config.RetryBackoffFactor = 2.0
	}
}

func validateConfig(config *PoolConfig) error {
	if config.MaxConnections < config.MinConnections {
		return errors.New("max connections must be greater than or equal to min connections")
	}
	if config.MaxIdleTime < 0 {
		return errors.New("max idle time must be non-negative")
	}
	if config.MaxLifetime < 0 {
		return errors.New("max lifetime must be non-negative")
	}
	return nil
}

func (cp *ConnectionPool) GetClient() *mongo.Client {
	cp.mu.RLock()
	defer cp.mu.RUnlock()

	if cp.closed {
		return nil
	}
	return cp.client
}

func (cp *ConnectionPool) Close() error {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	if cp.closed {
		return nil
	}

	cp.closed = true
	cp.health.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return cp.client.Disconnect(ctx)
}

func (cp *ConnectionPool) GetStats() PoolStats {
	cp.stats.mu.RLock()
	defer cp.stats.mu.RUnlock()

	return *cp.stats
}

func (cp *ConnectionPool) GetMetrics() PoolMetrics {
	cp.metrics.mu.RLock()
	defer cp.metrics.mu.RUnlock()

	return *cp.metrics
}

func (cp *ConnectionPool) ExecuteWithRetry(maxRetries int, operation func(ctx context.Context) error) error {
	var lastErr error
	
	for attempt := 0; attempt <= maxRetries; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		err := operation(ctx)
		cancel()
		
		if err == nil {
			return nil
		}
		
		lastErr = err
		
		// Check if error is retryable
		if !isRetryableError(err) {
			return err
		}
		
		// Exponential backoff
		if attempt < maxRetries {
			backoff := time.Duration(float64(time.Second) * cp.config.RetryBackoffFactor * float64(attempt+1))
			time.Sleep(backoff)
		}
	}
	
	return fmt.Errorf("operation failed after %d retries: %w", maxRetries+1, lastErr)
}

func isRetryableError(err error) bool {
	// Check for network errors, timeout errors, etc.
	if err == nil {
		return false
	}
	
	// Network/connection errors
	if mongo.IsNetworkError(err) {
		return true
	}
	
	// Timeout errors
	if mongo.IsTimeout(err) {
		return true
	}
	
	// Server selection errors - checking if the error is a server selection error
	// by checking the error message or type
	if isServerSelectionError(err) {
		return true
	}
	
	// Command/operation errors
	var cmdErr mongo.CommandError
	if errors.As(err, &cmdErr) {
		// Retry on certain error codes
		switch cmdErr.Code {
		case 6,    // HostUnreachable
			7,     // HostNotFound
			89,    // NetworkTimeout
			91,    // ShutdownInProgress
			189,   // PrimarySteppedDown
			262,   // ExceededTimeLimit
			9001,  // SocketException
			11600, // InterruptedAtShutdown
			11602, // InterruptedDueToReplStateChange
			13435, // NotPrimaryError
			13436: // NotMasterOrSecondary
			return true
		}
	}
	
	return false
}

// isServerSelectionError checks if an error is a server selection error
func isServerSelectionError(err error) bool {
	if err == nil {
		return false
	}
	
	// Check if the error is a server selection error by examining its type or message
	// This is a simplified check - in a real implementation, you might want to be more specific
	return strings.Contains(err.Error(), "server selection error") ||
		   strings.Contains(err.Error(), "no servers available") ||
		   strings.Contains(err.Error(), "connection refused")
}

func (cp *ConnectionPool) collectMetrics() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if cp.health.IsHealthy() {
				cp.updateStats()
			}
		}
	}
}

func (cp *ConnectionPool) updateStats() {
	// This would be more sophisticated in a real implementation
	// For now, we'll just update basic metrics
	cp.stats.mu.Lock()
	defer cp.stats.mu.Unlock()

	// Placeholder - would normally get real stats from the driver
	cp.stats.ActiveConnections = 10
	cp.stats.IdleConnections = 5
	cp.stats.TotalConnections = 15
}

type HealthChecker struct {
	client    *mongo.Client
	running   bool
	mu        sync.RWMutex
	lastError error
}

func NewHealthChecker(client *mongo.Client) *HealthChecker {
	return &HealthChecker{
		client: client,
	}
}

func (hc *HealthChecker) Start(period time.Duration) {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	if hc.running {
		return
	}

	hc.running = true
	go hc.checkHealth(period)
}

func (hc *HealthChecker) Stop() {
	hc.mu.Lock()
	defer hc.mu.Unlock()
	hc.running = false
}

func (hc *HealthChecker) IsHealthy() bool {
	hc.mu.RLock()
	defer hc.mu.RUnlock()
	return hc.lastError == nil
}

func (hc *HealthChecker) checkHealth(period time.Duration) {
	ticker := time.NewTicker(period)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			err := hc.client.Ping(ctx, nil)
			cancel()
			
			hc.mu.Lock()
			hc.lastError = err
			hc.mu.Unlock()
			
			if err != nil {
				log.Printf("Health check failed: %v", err)
			}
		}
	}
}