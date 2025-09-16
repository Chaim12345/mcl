package auth

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserContextKey is the key used to store user information in the request context
const UserContextKey = "user"

// AuthenticatedUser represents the authenticated user information stored in context
type AuthenticatedUser struct {
	ID    primitive.ObjectID `json:"id"`
	Email string             `json:"email"`
	Role  string             `json:"role,omitempty"`
}

// AuthMiddleware handles JWT authentication for protected routes
type AuthMiddleware struct {
	jwtManager *JWTManager
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(jwtManager *JWTManager) *AuthMiddleware {
	return &AuthMiddleware{
		jwtManager: jwtManager,
	}
}

// RequireAuth is a middleware that requires valid JWT authentication
func (am *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := am.extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authentication token required",
				},
			})
			c.Abort()
			return
		}

		claims, err := am.jwtManager.ValidateToken(token)
		if err != nil {
			var statusCode int
			var errorCode string
			var message string

			switch err {
			case ErrExpiredToken:
				statusCode = http.StatusUnauthorized
				errorCode = "TOKEN_EXPIRED"
				message = "Authentication token has expired"
			case ErrInvalidToken, ErrTokenClaims:
				statusCode = http.StatusUnauthorized
				errorCode = "INVALID_TOKEN"
				message = "Invalid authentication token"
			default:
				statusCode = http.StatusInternalServerError
				errorCode = "AUTH_ERROR"
				message = "Authentication error"
			}

			c.JSON(statusCode, gin.H{
				"success": false,
				"error": gin.H{
					"code":    errorCode,
					"message": message,
				},
			})
			c.Abort()
			return
		}

		// Verify it's an access token
		if claims.TokenType != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_TOKEN_TYPE",
					"message": "Access token required",
				},
			})
			c.Abort()
			return
		}

		// Store user information in context
		user := &AuthenticatedUser{
			ID:    claims.UserID,
			Email: claims.Email,
			Role:  claims.Role,
		}

		c.Set(UserContextKey, user)
		c.Next()
	}
}

// RequireRole is a middleware that requires a specific role
func (am *AuthMiddleware) RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := am.GetAuthenticatedUser(c)
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authentication required",
				},
			})
			c.Abort()
			return
		}

		if user.Role != requiredRole {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "Insufficient permissions",
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyRole is a middleware that requires any of the specified roles
func (am *AuthMiddleware) RequireAnyRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := am.GetAuthenticatedUser(c)
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authentication required",
				},
			})
			c.Abort()
			return
		}

		hasRole := false
		for _, role := range roles {
			if user.Role == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "Insufficient permissions",
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth is a middleware that extracts user information if present but doesn't require it
func (am *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := am.extractToken(c)
		if token == "" {
			c.Next()
			return
		}

		claims, err := am.jwtManager.ValidateToken(token)
		if err != nil {
			// Don't abort for optional auth, just continue without user context
			c.Next()
			return
		}

		// Verify it's an access token
		if claims.TokenType != "access" {
			c.Next()
			return
		}

		// Store user information in context
		user := &AuthenticatedUser{
			ID:    claims.UserID,
			Email: claims.Email,
			Role:  claims.Role,
		}

		c.Set(UserContextKey, user)
		c.Next()
	}
}

// GetAuthenticatedUser retrieves the authenticated user from the request context
func (am *AuthMiddleware) GetAuthenticatedUser(c *gin.Context) *AuthenticatedUser {
	if user, exists := c.Get(UserContextKey); exists {
		if authenticatedUser, ok := user.(*AuthenticatedUser); ok {
			return authenticatedUser
		}
	}
	return nil
}

// GetUserID is a convenience method to get the user ID from context
func (am *AuthMiddleware) GetUserID(c *gin.Context) (primitive.ObjectID, bool) {
	user := am.GetAuthenticatedUser(c)
	if user != nil {
		return user.ID, true
	}
	return primitive.NilObjectID, false
}

// GetUserEmail is a convenience method to get the user email from context
func (am *AuthMiddleware) GetUserEmail(c *gin.Context) (string, bool) {
	user := am.GetAuthenticatedUser(c)
	if user != nil {
		return user.Email, true
	}
	return "", false
}

// GetUserRole is a convenience method to get the user role from context
func (am *AuthMiddleware) GetUserRole(c *gin.Context) (string, bool) {
	user := am.GetAuthenticatedUser(c)
	if user != nil {
		return user.Role, true
	}
	return "", false
}

// extractToken extracts the JWT token from the request
func (am *AuthMiddleware) extractToken(c *gin.Context) string {
	// Try Authorization header first
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		token := ExtractTokenFromHeader(authHeader)
		if token != "" {
			return token
		}
	}

	// Try query parameter as fallback (for WebSocket connections, etc.)
	token := c.Query("token")
	if token != "" {
		return token
	}

	// Try cookie as another fallback
	cookie, err := c.Cookie("auth_token")
	if err == nil && cookie != "" {
		return cookie
	}

	return ""
}

// WithUserContext adds user information to a standard context.Context
func WithUserContext(ctx context.Context, user *AuthenticatedUser) context.Context {
	return context.WithValue(ctx, UserContextKey, user)
}

// UserFromContext retrieves user information from a standard context.Context
func UserFromContext(ctx context.Context) (*AuthenticatedUser, bool) {
	user, ok := ctx.Value(UserContextKey).(*AuthenticatedUser)
	return user, ok
}

// CORS middleware for handling cross-origin requests
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// SecurityHeaders middleware adds security headers to responses
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'self'")
		c.Next()
	}
}

// RateLimitInfo represents rate limiting information
type RateLimitInfo struct {
	Limit     int `json:"limit"`
	Remaining int `json:"remaining"`
	Reset     int `json:"reset"`
}

// Simple in-memory rate limiter (in production, use Redis or similar)
type RateLimiter struct {
	requests map[string][]int64
	limit    int
	window   int64 // in seconds
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, windowSeconds int64) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]int64),
		limit:    limit,
		window:   windowSeconds,
	}
}

// RateLimitMiddleware creates a rate limiting middleware
func (rl *RateLimiter) RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use IP address as the key (in production, might want to use user ID for authenticated requests)
		key := c.ClientIP()

		now := c.Request.Context().Value("timestamp")
		if now == nil {
			// Fallback if timestamp not set
			c.Next()
			return
		}

		timestamp, ok := now.(int64)
		if !ok {
			c.Next()
			return
		}

		// Clean old requests outside the window
		if requests, exists := rl.requests[key]; exists {
			var validRequests []int64
			for _, reqTime := range requests {
				if timestamp-reqTime < rl.window {
					validRequests = append(validRequests, reqTime)
				}
			}
			rl.requests[key] = validRequests
		}

		// Check if limit exceeded
		currentRequests := len(rl.requests[key])
		if currentRequests >= rl.limit {
			c.Header("X-RateLimit-Limit", string(rune(rl.limit)))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", string(rune(timestamp+rl.window)))

			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests",
				},
			})
			c.Abort()
			return
		}

		// Add current request
		rl.requests[key] = append(rl.requests[key], timestamp)

		// Set rate limit headers
		remaining := rl.limit - len(rl.requests[key])
		c.Header("X-RateLimit-Limit", string(rune(rl.limit)))
		c.Header("X-RateLimit-Remaining", string(rune(remaining)))
		c.Header("X-RateLimit-Reset", string(rune(timestamp+rl.window)))

		c.Next()
	}
}

// RequestID middleware adds a unique request ID to each request
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			// Generate a simple request ID (in production, use a proper UUID library)
			requestID = primitive.NewObjectID().Hex()
		}

		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}
