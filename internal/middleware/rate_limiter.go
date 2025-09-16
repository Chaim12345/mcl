
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-redis/redis/v8"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	RedisClient    *redis.Client
	Prefix         string
	DefaultLimit   int64
	DefaultWindow  time.Duration
	ByIP           bool
	ByUserID       bool
	ByEndpoint     bool
	SkipSuccessful bool
	Headers        RateLimitHeaders
}

// RateLimitHeaders defines the response headers for rate limiting
type RateLimitHeaders struct {
	Limit      string
	Remaining  string
	Reset      string
	RetryAfter string
}

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	config *RateLimitConfig
	cache  map[string]*RateLimitEntry
	mu     sync.RWMutex
}

// RateLimitEntry stores rate limit information for a key
type RateLimitEntry struct {
	Count      int64
	Limit      int64
	Window     time.Duration
	ResetTime  time.Time
	LastAccess time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(config *RateLimitConfig) *RateLimiter {
	if config == nil {
		config = &RateLimitConfig{
			Prefix:        "rate_limit",
			DefaultLimit:  100,
			DefaultWindow: time.Minute,
			ByIP:          true,
			Headers: RateLimitHeaders{
				Limit:      "X-RateLimit-Limit",
				Remaining:  "X-RateLimit-Remaining",
				Reset:      "X-RateLimit-Reset",
				RetryAfter: "Retry-After",
			},
		}
	}

	return &RateLimiter{
		config: config,
		cache:  make(map[string]*RateLimitEntry),
	}
}

// Middleware returns the rate limiting middleware
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := rl.getRateLimitKey(r)
		limit := rl.getLimit(r)
		window := rl.getWindow(r)

		// Try Redis first, fallback to memory
		allowed, remaining, resetTime, err := rl.checkLimitRedis(r.Context(), key, limit, window)
		if err != nil {
			allowed, remaining, resetTime = rl.checkLimitMemory(key, limit, window)
		}

		// Set rate limit headers
		w.Header().Set(rl.config.Headers.Limit, strconv.FormatInt(limit, 10))
		w.Header().Set(rl.config.Headers.Remaining, strconv.FormatInt(remaining, 10))
		w.Header().Set(rl.config.Headers.Reset, strconv.FormatInt(resetTime.Unix(), 10))

		if !allowed {
			retryAfter := int(resetTime.Sub(time.Now()).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			w.Header().Set(rl.config.Headers.RetryAfter, strconv.Itoa(retryAfter))
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getRateLimitKey generates the rate limit key based on configuration
func (rl *RateLimiter) getRateLimitKey(r *http.Request) string {
	var parts []string

	if rl.config.Prefix != "" {
		parts = append(parts, rl.config.Prefix)
	}

	if rl.config.ByEndpoint {
		routePattern := chi.RouteContext(r.Context()).RoutePattern()
		if routePattern != "" {
			parts = append(parts, routePattern)
		}
	}

	if rl.config.ByIP {
		ip := rl.getClientIP(r)
		parts = append(parts, ip)
	}

	if rl.config.ByUserID {
		if userID := rl.getUserID(r); userID != "" {
			parts = append(parts, userID)
		}
	}

	return strings.Join(parts, ":")
}

// getClientIP extracts the client IP address
func (rl *RateLimiter) getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ips := strings.Split(forwarded, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}

	// Fallback to RemoteAddr
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// getUserID extracts user ID from request (customize as needed)
func (rl *RateLimiter) getUserID(r *http.Request) string {
	// This is a placeholder - implement based on your authentication
	// You might get this from JWT claims or session
	return ""
}

// getLimit gets the rate limit for the request
func (rl *RateLimiter) getLimit(r *http.Request) int64 {
	// Check for custom limits based on route or user
	route := chi.RouteContext(r.Context())
	if route != nil {
		routePattern := route.RoutePattern()
		// Implement custom limits based on route pattern
		switch {
		case strings.Contains(routePattern, "/api/workspaces"):
			return 50
		case strings.Contains(routePattern, "/api/boards"):
			return 100
		case strings.Contains(routePattern, "/api/items"):
			return 200
		case strings.Contains(routePattern, "/api/auth"):
			return 10
		}
	}

	return rl.config.DefaultLimit
}

// getWindow gets the rate limit window for the request
func (rl *RateLimiter) getWindow(r *http.Request) time.Duration {
	// You can customize this based on route or user
	return rl.config.DefaultWindow
}

// checkLimitRedis checks rate limit using Redis
func (rl *RateLimiter) checkLimitRedis(ctx context.Context, key string, limit int64, window time.Duration) (bool, int64, time.Time, error) {
	if rl.config.RedisClient == nil {
		return false, 0, time.Time{}, fmt.Errorf("redis client not configured")
	}

	script := `
		local key = KEYS[1]
		local limit = tonumber(ARGV[1])
		local window = tonumber(ARGV[2])
		local now = tonumber(ARGV[3])
		
		redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
		local count = redis.call('ZCARD', key)
		
		if count >= limit then
			return {0, limit - count, now + window}
		end
		
		redis.call('ZADD', key, now, now)
		redis.call('EXPIRE', key, window)
		
		return {1, limit - count - 1, now + window}
	`

	now := time.Now().Unix()
	result, err := rl.config.RedisClient.Eval(ctx, script, []string{key}, limit, int64(window.Seconds()), now).Result()
	if err != nil {
		return false, 0, time.Time{}, err
	}

	values := result.([]interface{})
	allowed := values[0].(int64) == 1
	remaining := values[1].(int64)
	resetTime := time.Unix(values[2].(int64), 0)

	return allowed, remaining, resetTime, nil
}

// checkLimitMemory checks rate limit using memory cache (fallback)
func (rl *RateLimiter) checkLimitMemory(key string, limit int64, window time.Duration) (bool, int64, time.Time) {
	rl.mu.RLock()
	entry, exists := rl.cache[key]
	rl.mu.RUnlock()

	now := time.Now()
	
	if !exists || now.After(entry.ResetTime) {
		// Create new entry
		rl.mu.Lock()
		entry = &RateLimitEntry{
			Count:      0,
			Limit:      limit,
			Window:     window,
			ResetTime:  now.Add(window),
			LastAccess: now,
		}
		rl.cache[key] = entry
		rl.mu.Unlock()
	}

	// Check if we're over the limit
	if entry.Count >= entry.Limit {
		return false, entry.Limit - entry.Count, entry.ResetTime
	}

	// Increment count
	rl.mu.Lock()
	entry.Count++
	entry.LastAccess = now
	rl.mu.Unlock()

	return true, entry.Limit - entry.Count, entry.ResetTime
}

// CleanupOldEntries removes old cache entries
func (rl *RateLimiter) CleanupOldEntries() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
}