package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// CSRFToken represents a CSRF token with expiration
type CSRFToken struct {
	Token     string
	ExpiresAt time.Time
}

// CSRFStore manages CSRF tokens
type CSRFStore struct {
	tokens sync.Map
	mutex  sync.RWMutex
}

// NewCSRFStore creates a new CSRF token store
func NewCSRFStore() *CSRFStore {
	store := &CSRFStore{}
	
	// Start cleanup goroutine
	go store.cleanup()
	
	return store
}

// GenerateToken generates a new CSRF token
func (s *CSRFStore) GenerateToken(sessionID string) string {
	// Generate random token
	bytes := make([]byte, 32)
	rand.Read(bytes)
	token := base64.URLEncoding.EncodeToString(bytes)
	
	// Store token with expiration
	csrfToken := CSRFToken{
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	
	s.tokens.Store(sessionID, csrfToken)
	return token
}

// ValidateToken validates a CSRF token
func (s *CSRFStore) ValidateToken(sessionID, token string) bool {
	if sessionID == "" || token == "" {
		return false
	}
	
	value, exists := s.tokens.Load(sessionID)
	if !exists {
		return false
	}
	
	csrfToken, ok := value.(CSRFToken)
	if !ok {
		return false
	}
	
	// Check if token is expired
	if time.Now().After(csrfToken.ExpiresAt) {
		s.tokens.Delete(sessionID)
		return false
	}
	
	return csrfToken.Token == token
}

// cleanup removes expired tokens
func (s *CSRFStore) cleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	
	for range ticker.C {
		now := time.Now()
		s.tokens.Range(func(key, value interface{}) bool {
			if csrfToken, ok := value.(CSRFToken); ok {
				if now.After(csrfToken.ExpiresAt) {
					s.tokens.Delete(key)
				}
			}
			return true
		})
	}
}

var csrfStore = NewCSRFStore()

// CSRFMiddleware provides CSRF protection
func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip CSRF for safe methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}
		
		// Skip CSRF for API endpoints with proper authentication
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			// For API endpoints, we rely on JWT authentication
			// CSRF is mainly for browser-based form submissions
			c.Next()
			return
		}
		
		// Get session ID (you might want to use a proper session ID)
		sessionID := c.GetHeader("X-Session-ID")
		if sessionID == "" {
			// Use client IP as fallback session ID
			sessionID = c.ClientIP()
		}
		
		// Get CSRF token from header or form
		token := c.GetHeader("X-CSRF-Token")
		if token == "" {
			token = c.PostForm("_csrf_token")
		}
		
		// Validate token
		if !csrfStore.ValidateToken(sessionID, token) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "CSRF_TOKEN_INVALID",
					"message": "CSRF token validation failed",
				},
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// CSRFTokenHandler provides CSRF tokens to clients
func CSRFTokenHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID := c.GetHeader("X-Session-ID")
		if sessionID == "" {
			sessionID = c.ClientIP()
		}
		
		token := csrfStore.GenerateToken(sessionID)
		
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": map[string]interface{}{
				"csrf_token": token,
			},
		})
	}
}