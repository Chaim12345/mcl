package services

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"path/filepath"
	"sync"
	"time"
)

// CacheItem represents a cached item with expiration
type CacheItem struct {
	Data      interface{}
	ExpiresAt time.Time
}

// IsExpired checks if the cache item has expired
func (ci *CacheItem) IsExpired() bool {
	return time.Now().After(ci.ExpiresAt)
}

// CacheService provides in-memory caching for search and filter results
type CacheService struct {
	cache   sync.Map
	defaultTTL time.Duration
	maxSize    int
	size       int64
	mu         sync.RWMutex
}

// NewCacheService creates a new cache service
func NewCacheService(defaultTTL time.Duration, maxSize int) *CacheService {
	service := &CacheService{
		defaultTTL: defaultTTL,
		maxSize:    maxSize,
	}

	// Start cleanup goroutine
	go service.cleanupExpired()

	return service
}

// generateKey creates a cache key from the provided parameters
func (cs *CacheService) generateKey(prefix string, params ...interface{}) string {
	data, _ := json.Marshal(params)
	hash := md5.Sum(data)
	return fmt.Sprintf("%s:%x", prefix, hash)
}

// Set stores a value in the cache with default TTL
func (cs *CacheService) Set(key string, value interface{}) {
	cs.SetWithTTL(key, value, cs.defaultTTL)
}

// SetWithTTL stores a value in the cache with custom TTL
func (cs *CacheService) SetWithTTL(key string, value interface{}, ttl time.Duration) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	// Check if we need to evict items due to size limit
	if cs.size >= int64(cs.maxSize) {
		cs.evictOldest()
	}

	item := &CacheItem{
		Data:      value,
		ExpiresAt: time.Now().Add(ttl),
	}

	cs.cache.Store(key, item)
	cs.size++
}

// Get retrieves a value from the cache
func (cs *CacheService) Get(key string) (interface{}, bool) {
	value, exists := cs.cache.Load(key)
	if !exists {
		return nil, false
	}

	item := value.(*CacheItem)
	if item.IsExpired() {
		cs.cache.Delete(key)
		cs.mu.Lock()
		cs.size--
		cs.mu.Unlock()
		return nil, false
	}

	return item.Data, true
}

// Delete removes a value from the cache
func (cs *CacheService) Delete(key string) {
	if _, exists := cs.cache.LoadAndDelete(key); exists {
		cs.mu.Lock()
		cs.size--
		cs.mu.Unlock()
	}
}

// Clear removes all items from the cache
func (cs *CacheService) Clear() {
	cs.cache.Range(func(key, value interface{}) bool {
		cs.cache.Delete(key)
		return true
	})
	cs.mu.Lock()
	cs.size = 0
	cs.mu.Unlock()
}// InvalidatePattern removes all cache entries that match a pattern
func (cs *CacheService) InvalidatePattern(pattern string) {
	cs.cache.Range(func(key, value interface{}) bool {
		keyStr := key.(string)
		if matched, _ := filepath.Match(pattern, keyStr); matched {
			cs.cache.Delete(key)
			cs.mu.Lock()
			cs.size--
			cs.mu.Unlock()
		}
		return true
	})
}

// GetSize returns the current number of items in the cache
func (cs *CacheService) GetSize() int64 {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return cs.size
}

// cleanupExpired removes expired items from the cache
func (cs *CacheService) cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute) // Cleanup every 5 minutes
	defer ticker.Stop()

	for range ticker.C {
		cs.cache.Range(func(key, value interface{}) bool {
			item := value.(*CacheItem)
			if item.IsExpired() {
				cs.cache.Delete(key)
				cs.mu.Lock()
				cs.size--
				cs.mu.Unlock()
			}
			return true
		})
	}
}

// evictOldest removes the oldest items from the cache (simple FIFO eviction)
func (cs *CacheService) evictOldest() {
	// This is a simple implementation - in production you might want LRU
	count := 0
	targetEvictions := cs.maxSize / 10 // Evict 10% of items

	cs.cache.Range(func(key, value interface{}) bool {
		if count >= targetEvictions {
			return false
		}
		cs.cache.Delete(key)
		cs.size--
		count++
		return true
	})
}

// Search-specific cache methods

// SetSearchResult caches a search result
func (cs *CacheService) SetSearchResult(entityType, query string, options interface{}, result interface{}) {
	key := cs.generateKey("search", entityType, query, options)
	cs.Set(key, result)
}

// GetSearchResult retrieves a cached search result
func (cs *CacheService) GetSearchResult(entityType, query string, options interface{}) (interface{}, bool) {
	key := cs.generateKey("search", entityType, query, options)
	return cs.Get(key)
}

// SetFilterResult caches a filter result
func (cs *CacheService) SetFilterResult(entityType string, filterQuery interface{}, options interface{}, result interface{}) {
	key := cs.generateKey("filter", entityType, filterQuery, options)
	cs.Set(key, result)
}

// GetFilterResult retrieves a cached filter result
func (cs *CacheService) GetFilterResult(entityType string, filterQuery interface{}, options interface{}) (interface{}, bool) {
	key := cs.generateKey("filter", entityType, filterQuery, options)
	return cs.Get(key)
}

// InvalidateEntityCache removes all cached results for a specific entity type
func (cs *CacheService) InvalidateEntityCache(entityType string) {
	cs.InvalidatePattern(fmt.Sprintf("search:%s:*", entityType))
	cs.InvalidatePattern(fmt.Sprintf("filter:%s:*", entityType))
}

// InvalidateWorkspaceCache removes all cached results for a specific workspace
func (cs *CacheService) InvalidateWorkspaceCache(workspaceID string) {
	cs.InvalidatePattern(fmt.Sprintf("*workspace*%s*", workspaceID))
}

// InvalidateBoardCache removes all cached results for a specific board
func (cs *CacheService) InvalidateBoardCache(boardID string) {
	cs.InvalidatePattern(fmt.Sprintf("*board*%s*", boardID))
}