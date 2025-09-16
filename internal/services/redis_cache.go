
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// Cacheable represents any type that can be cached
type Cacheable interface {
	GetCacheKey() string
	GetTTL() time.Duration
}

// CacheConfig holds configuration for cache operations
type CacheConfig struct {
	DefaultTTL    time.Duration
	RedisAddr     string
	RedisPassword string
	RedisDB       int
	MaxRetries    int
}

// RedisCache provides a unified interface for Redis caching
type RedisCache struct {
	client *redis.Client
	config *CacheConfig
	ctx    context.Context
	mu     sync.RWMutex
	stats  *CacheStats
}

// CacheStats holds cache performance metrics
type CacheStats struct {
	Hits        int64
	Misses      int64
	Evictions   int64
	Errors      int64
	mu          sync.RWMutex
}

// CacheResult represents the result of a cache operation
type CacheResult struct {
	Data      interface{}
	Hit       bool
	FromCache bool
	Error     error
}

// NewRedisCache creates a new Redis cache instance
func NewRedisCache(config *CacheConfig) (*RedisCache, error) {
	if config == nil {
		config = &CacheConfig{
			DefaultTTL: 5 * time.Minute,
			MaxRetries: 3,
		}
	}

	ctx := context.Background()
	client := redis.NewClient(&redis.Options{
		Addr:     config.RedisAddr,
		Password: config.RedisPassword,
		DB:       config.RedisDB,
		MaxRetries: config.MaxRetries,
	})

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	cache := &RedisCache{
		client: client,
		config: config,
		ctx:    ctx,
		stats:  &CacheStats{},
	}

	// Start metrics collection
	go cache.collectMetrics()

	return cache, nil
}

// Get retrieves data from cache
func (rc *RedisCache) Get(key string, dest interface{}) (*CacheResult, error) {
	rc.stats.mu.RLock()
	rc.stats.Misses++
	rc.stats.mu.RUnlock()

	val, err := rc.client.Get(rc.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return &CacheResult{Hit: false, FromCache: false}, nil
		}
		
		rc.stats.mu.Lock()
		rc.stats.Errors++
		rc.stats.mu.Unlock()
		
		return &CacheResult{Hit: false, FromCache: false, Error: err}, err
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		rc.stats.mu.Lock()
		rc.stats.Errors++
		rc.stats.mu.Unlock()
		
		return &CacheResult{Hit: false, FromCache: false, Error: err}, err
	}

	rc.stats.mu.Lock()
	rc.stats.Hits++
	rc.stats.Misses--
	rc.stats.mu.Unlock()

	return &CacheResult{
		Data:      dest,
		Hit:       true,
		FromCache: true,
	}, nil
}

// Set stores data in cache with TTL
func (rc *RedisCache) Set(key string, value interface{}, ttl time.Duration) error {
	if ttl == 0 {
		ttl = rc.config.DefaultTTL
	}

	data, err := json.Marshal(value)
	if err != nil {
		rc.stats.mu.Lock()
		rc.stats.Errors++
		rc.stats.mu.Unlock()
		return err
	}

	err = rc.client.Set(rc.ctx, key, data, ttl).Err()
	if err != nil {
		rc.stats.mu.Lock()
		rc.stats.Errors++
		rc.stats.mu.Unlock()
		return err
	}

	return nil
}

// SetWithTTL stores data in cache with custom TTL
func (rc *RedisCache) SetWithTTL(key string, value interface{}, ttl time.Duration) error {
	return rc.Set(key, value, ttl)
}

// Delete removes data from cache
func (rc *RedisCache) Delete(key string) error {
	return rc.client.Del(rc.ctx, key).Err()
}

// DeletePattern removes all keys matching a pattern
func (rc *RedisCache) DeletePattern(pattern string) (int64, error) {
	keys, err := rc.client.Keys(rc.ctx, pattern).Result()
	if err != nil {
		return 0, err
	}

	if len(keys) > 0 {
		return rc.client.Del(rc.ctx, keys...).Result()
	}

	return 0, nil
}

// Exists checks if a key exists in cache
func (rc *RedisCache) Exists(key string) (bool, error) {
	count, err := rc.client.Exists(rc.ctx, key).Result()
	return count > 0, err
}

// GetOrSet gets data from cache or sets it if not found
func (rc *RedisCache) GetOrSet(key string, factory func() (interface{}, error), ttl time.Duration) (*CacheResult, error) {
	var result interface{}
	
	cacheResult, err := rc.Get(key, &result)
	if err != nil {
		return cacheResult, err
	}
	
	if cacheResult.Hit {
		return cacheResult, nil
	}

	// Data not in cache, generate it
	newData, err := factory()
	if err != nil {
		return &CacheResult{Hit: false, FromCache: false, Error: err}, err
	}

	// Cache the new data
	if err := rc.Set(key, newData, ttl); err != nil {
		log.Printf("Failed to cache data: %v", err)
	}

	return &CacheResult{
		Data:      newData,
		Hit:       false,
		FromCache: false,
	}, nil
}

// GetStats returns cache performance statistics
func (rc *RedisCache) GetStats() CacheStats {
	rc.stats.mu.RLock()
	defer rc.stats.mu.RUnlock()
	return *rc.stats
}

// ResetStats resets cache statistics
func (rc *RedisCache) ResetStats() {
	rc.stats.mu.Lock()
	defer rc.stats.mu.Unlock()
	rc.stats = &CacheStats{}
}

// InvalidateNamespace invalidates all keys in a namespace
func (rc *RedisCache) InvalidateNamespace(namespace string) (int64, error) {
	pattern := fmt.Sprintf("%s:*", namespace)
	return rc.DeletePattern(pattern)
}

// InvalidateRelated invalidates related cache keys
func (rc *RedisCache) InvalidateRelated(relatedKeys []string) (int64, error) {
	var totalDeleted int64
	
	for _, key := range relatedKeys {
		deleted, err := rc.DeletePattern(fmt.Sprintf("*%s*", key))
		if err != nil {
			return 0, err
		}
		totalDeleted += deleted
	}
	
	return totalDeleted, nil
}

// collectMetrics collects cache metrics periodically
func (rc *RedisCache) collectMetrics() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rc.stats.mu.Lock()
			// Here you would collect and log metrics, e.g., cache hits/misses
			log.Printf("Cache Stats - Hits: %d, Misses: %d, Errors: %d", rc.stats.Hits, rc.stats.Misses, rc.stats.Errors)
			rc.stats.mu.Unlock()
		}
	}
}

// Increment increments a numeric value in cache
func (rc *RedisCache) Increment(key string, delta int64) (int64, error) {
	return rc.client.IncrBy(rc.ctx, key, delta).Result()
}

// Decrement decrements a numeric value in cache
func (rc *RedisCache) Decrement(key string, delta int64) (int64, error) {
	return rc.client.DecrBy(rc.ctx, key, delta).Result()
}