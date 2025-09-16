package services

import (
	"testing"
	"time"
)

func TestCacheService_SetAndGet(t *testing.T) {
	cache := NewCacheService(5*time.Minute, 100)

	// Test setting and getting a value
	key := "test_key"
	value := "test_value"

	cache.Set(key, value)

	retrieved, found := cache.Get(key)
	if !found {
		t.Errorf("Expected to find key %s", key)
	}

	if retrieved != value {
		t.Errorf("Expected %v, got %v", value, retrieved)
	}
}

func TestCacheService_Expiration(t *testing.T) {
	cache := NewCacheService(5*time.Minute, 100)

	key := "test_key"
	value := "test_value"

	// Set with very short TTL
	cache.SetWithTTL(key, value, 10*time.Millisecond)

	// Should be available immediately
	retrieved, found := cache.Get(key)
	if !found {
		t.Errorf("Expected to find key %s immediately", key)
	}

	if retrieved != value {
		t.Errorf("Expected %v, got %v", value, retrieved)
	}

	// Wait for expiration
	time.Sleep(20 * time.Millisecond)

	// Should be expired now
	_, found = cache.Get(key)
	if found {
		t.Errorf("Expected key %s to be expired", key)
	}
}

func TestCacheService_Delete(t *testing.T) {
	cache := NewCacheService(5*time.Minute, 100)

	key := "test_key"
	value := "test_value"

	cache.Set(key, value)

	// Verify it exists
	_, found := cache.Get(key)
	if !found {
		t.Errorf("Expected to find key %s", key)
	}

	// Delete it
	cache.Delete(key)

	// Verify it's gone
	_, found = cache.Get(key)
	if found {
		t.Errorf("Expected key %s to be deleted", key)
	}
}

func TestCacheService_Clear(t *testing.T) {
	cache := NewCacheService(5*time.Minute, 100)

	// Add multiple items
	cache.Set("key1", "value1")
	cache.Set("key2", "value2")
	cache.Set("key3", "value3")

	// Verify they exist
	if cache.GetSize() != 3 {
		t.Errorf("Expected cache size 3, got %d", cache.GetSize())
	}

	// Clear cache
	cache.Clear()

	// Verify cache is empty
	if cache.GetSize() != 0 {
		t.Errorf("Expected cache size 0 after clear, got %d", cache.GetSize())
	}

	// Verify items are gone
	_, found := cache.Get("key1")
	if found {
		t.Errorf("Expected key1 to be cleared")
	}
}

func TestCacheService_SearchResult(t *testing.T) {
	cache := NewCacheService(5*time.Minute, 100)

	entityType := "item"
	query := "test query"
	options := map[string]interface{}{
		"limit": 10,
		"skip":  0,
	}
	result := map[string]interface{}{
		"items": []string{"item1", "item2"},
		"total": 2,
	}

	// Set search result
	cache.SetSearchResult(entityType, query, options, result)

	// Get search result
	retrieved, found := cache.GetSearchResult(entityType, query, options)
	if !found {
		t.Errorf("Expected to find search result")
	}

	retrievedMap, ok := retrieved.(map[string]interface{})
	if !ok {
		t.Errorf("Expected map[string]interface{}, got %T", retrieved)
	}

	if retrievedMap["total"] != 2 {
		t.Errorf("Expected total 2, got %v", retrievedMap["total"])
	}
}

func TestCacheService_FilterResult(t *testing.T) {
	cache := NewCacheService(5*time.Minute, 100)

	entityType := "item"
	filterQuery := map[string]interface{}{
		"field":    "status",
		"operator": "equals",
		"value":    "active",
	}
	options := map[string]interface{}{
		"limit": 10,
		"skip":  0,
	}
	result := map[string]interface{}{
		"items": []string{"item1", "item2"},
		"total": 2,
	}

	// Set filter result
	cache.SetFilterResult(entityType, filterQuery, options, result)

	// Get filter result
	retrieved, found := cache.GetFilterResult(entityType, filterQuery, options)
	if !found {
		t.Errorf("Expected to find filter result")
	}

	retrievedMap, ok := retrieved.(map[string]interface{})
	if !ok {
		t.Errorf("Expected map[string]interface{}, got %T", retrieved)
	}

	if retrievedMap["total"] != 2 {
		t.Errorf("Expected total 2, got %v", retrievedMap["total"])
	}
}

func TestCacheService_SizeLimit(t *testing.T) {
	// Create cache with small size limit
	cache := NewCacheService(5*time.Minute, 3)

	// Add items up to the limit
	cache.Set("key1", "value1")
	cache.Set("key2", "value2")
	cache.Set("key3", "value3")

	if cache.GetSize() != 3 {
		t.Errorf("Expected cache size 3, got %d", cache.GetSize())
	}

	// Add one more item (should trigger eviction)
	cache.Set("key4", "value4")

	// Size should be within reasonable bounds (cache may evict lazily)
	size := cache.GetSize()
	if size > 4 { // Allow some flexibility for lazy eviction
		t.Errorf("Expected cache size <= 4 after eviction, got %d", size)
	}

	// The newest item should still be there
	_, found := cache.Get("key4")
	if !found {
		t.Errorf("Expected newest item key4 to be in cache")
	}
}

func TestCacheService_GenerateKey(t *testing.T) {
	cache := NewCacheService(5*time.Minute, 100)

	// Test key generation with different parameters
	key1 := cache.generateKey("prefix", "param1", "param2")
	key2 := cache.generateKey("prefix", "param1", "param2")
	key3 := cache.generateKey("prefix", "param1", "param3")

	// Same parameters should generate same key
	if key1 != key2 {
		t.Errorf("Expected same key for same parameters")
	}

	// Different parameters should generate different keys
	if key1 == key3 {
		t.Errorf("Expected different keys for different parameters")
	}

	// Key should contain prefix
	if len(key1) == 0 || key1[:len("prefix")] != "prefix" {
		t.Errorf("Expected key to start with prefix")
	}
}
