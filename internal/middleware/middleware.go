package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sethvargo/go-limiter/memorystore"
	"github.com/sirupsen/logrus"

	"project-management-platform/internal/auth"
)

// AuthRateLimitConfig holds authentication rate limiting configuration
type AuthRateLimitConfig struct {
	RequestsPerMinute int
	BurstSize         int
}

// SecurityConfig holds security middleware configuration
type SecurityConfig struct {
	RateLimit AuthRateLimitConfig
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(config AuthRateLimitConfig) gin.HandlerFunc {
	// Create memory store for rate limiting
	store, err := memorystore.New(&memorystore.Config{
		Tokens:   uint64(config.RequestsPerMinute),
		Interval: time.Minute,
	})
	if err != nil {
		panic(fmt.Sprintf("Failed to create rate limiter: %v", err))
	}

	return func(c *gin.Context) {
		// Use client IP as the key
		key := c.ClientIP()

		// Check rate limit
		_, _, _, ok, err := store.Take(context.Background(), key)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "RATE_LIMIT_ERROR",
					"message": "Rate limiting error",
				},
			})
			c.Abort()
			return
		}

		if !ok {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests, please try again later",
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthRateLimitMiddleware creates a stricter rate limiting middleware for auth endpoints
func AuthRateLimitMiddleware() gin.HandlerFunc {
	// Stricter limits for authentication endpoints
	store, err := memorystore.New(&memorystore.Config{
		Tokens:   5, // 5 requests per minute
		Interval: time.Minute,
	})
	if err != nil {
		panic(fmt.Sprintf("Failed to create auth rate limiter: %v", err))
	}

	return func(c *gin.Context) {
		key := c.ClientIP()

		_, _, _, ok, err := store.Take(context.Background(), key)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "RATE_LIMIT_ERROR",
					"message": "Rate limiting error",
				},
			})
			c.Abort()
			return
		}

		if !ok {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "AUTH_RATE_LIMIT_EXCEEDED",
					"message": "Too many authentication attempts, please try again later",
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SecurityHeadersMiddleware adds security headers
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
		
		// Remove server information
		c.Header("Server", "")
		
		c.Next()
	}
}

// LoggingMiddleware creates a structured logging middleware
func LoggingMiddleware(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get client IP
		clientIP := c.ClientIP()

		// Get status code
		statusCode := c.Writer.Status()

		// Get request size
		bodySize := c.Writer.Size()

		// Build log entry
		entry := logger.WithFields(logrus.Fields{
			"status_code": statusCode,
			"latency":     latency,
			"client_ip":   clientIP,
			"method":      c.Request.Method,
			"path":        path,
			"raw_query":   raw,
			"body_size":   bodySize,
			"user_agent":  c.Request.UserAgent(),
		})

		// Log based on status code
		if statusCode >= 500 {
			entry.Error("Server error")
		} else if statusCode >= 400 {
			entry.Warn("Client error")
		} else {
			entry.Info("Request processed")
		}
	}
}

// AuthMiddleware creates JWT authentication middleware
func AuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "MISSING_TOKEN",
					"message": "Authorization token is required",
				},
			})
			c.Abort()
			return
		}

		// Extract token
		tokenString := auth.ExtractTokenFromHeader(authHeader)
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "INVALID_TOKEN_FORMAT",
					"message": "Invalid token format",
				},
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			var errorCode string
			switch err {
			case auth.ErrExpiredToken:
				errorCode = "TOKEN_EXPIRED"
			case auth.ErrInvalidToken:
				errorCode = "INVALID_TOKEN"
			default:
				errorCode = "TOKEN_VALIDATION_ERROR"
			}

			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    errorCode,
					"message": "Token validation failed",
				},
			})
			c.Abort()
			return
		}

		// Verify it's an access token
		if claims.TokenType != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "INVALID_TOKEN_TYPE",
					"message": "Access token required",
				},
			})
			c.Abort()
			return
		}

	// Store user info in context as AuthenticatedUser object
	authenticatedUser := &auth.AuthenticatedUser{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  claims.Role,
	}
	c.Set(auth.UserContextKey, authenticatedUser)
	c.Set("user_id", claims.UserID.Hex())
	c.Set("user_email", claims.Email)
	c.Set("user_role", claims.Role)
	c.Set("claims", claims)

		c.Next()
	}
}

// OptionalAuthMiddleware creates optional JWT authentication middleware
func OptionalAuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Extract token
		tokenString := auth.ExtractTokenFromHeader(authHeader)
		if tokenString == "" {
			c.Next()
			return
		}

		// Validate token
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			c.Next()
			return
		}

		// Verify it's an access token
		if claims.TokenType != "access" {
			c.Next()
			return
		}

		// Store user info in context as AuthenticatedUser object
		authenticatedUser := &auth.AuthenticatedUser{
			ID:    claims.UserID,
			Email: claims.Email,
			Role:  claims.Role,
		}
		c.Set(auth.UserContextKey, authenticatedUser)
		c.Set("user_id", claims.UserID.Hex())
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// ErrorHandlerMiddleware handles panics and errors
func ErrorHandlerMiddleware() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "INTERNAL_SERVER_ERROR",
					"message": "Internal server error",
					"details": err,
				},
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "INTERNAL_SERVER_ERROR",
					"message": "Internal server error",
				},
			})
		}
		c.Abort()
	})
}

// RequestIDMiddleware adds a unique request ID to each request
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := generateRequestID()
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}