package middleware

import (
	"time"

	"project-management-platform/internal/logger"

	"github.com/gin-gonic/gin"
)

// StructuredLoggingMiddleware creates a structured logging middleware using slog
func StructuredLoggingMiddleware(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Log the request
		log.LogRequest(c, duration, c.Writer.Status())
	}
}

// SecurityLoggingMiddleware logs security-related events
func SecurityLoggingMiddleware(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Log suspicious patterns
		userAgent := c.Request.UserAgent()
		clientIP := c.ClientIP()

		// Check for suspicious user agents
		suspiciousAgents := []string{
			"sqlmap",
			"nikto",
			"nmap",
			"masscan",
			"gobuster",
			"dirb",
		}

		for _, agent := range suspiciousAgents {
			if contains(userAgent, agent) {
				log.LogSecurity("suspicious_user_agent", clientIP, userAgent, map[string]any{
					"path":   c.Request.URL.Path,
					"method": c.Request.Method,
				})
				break
			}
		}

		// Check for suspicious paths
		suspiciousPaths := []string{
			"/admin",
			"/wp-admin",
			"/phpmyadmin",
			"/.env",
			"/config",
			"/backup",
		}

		path := c.Request.URL.Path
		for _, suspiciousPath := range suspiciousPaths {
			if contains(path, suspiciousPath) {
				log.LogSecurity("suspicious_path_access", clientIP, userAgent, map[string]any{
					"path":   path,
					"method": c.Request.Method,
				})
				break
			}
		}

		c.Next()

		// Log failed authentication attempts
		if c.Writer.Status() == 401 && contains(c.Request.URL.Path, "/auth/") {
			log.LogSecurity("authentication_failure", clientIP, userAgent, map[string]any{
				"path":        c.Request.URL.Path,
				"method":      c.Request.Method,
				"status_code": c.Writer.Status(),
			})
		}

		// Log rate limit violations
		if c.Writer.Status() == 429 {
			log.LogSecurity("rate_limit_exceeded", clientIP, userAgent, map[string]any{
				"path":   c.Request.URL.Path,
				"method": c.Request.Method,
			})
		}
	}
}

// PerformanceLoggingMiddleware logs performance metrics
func PerformanceLoggingMiddleware(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		duration := time.Since(start)

		// Log slow requests
		if duration > 1*time.Second {
			log.LogPerformance("slow_request", duration, map[string]any{
				"path":        c.Request.URL.Path,
				"method":      c.Request.Method,
				"status_code": c.Writer.Status(),
				"client_ip":   c.ClientIP(),
			})
		}

		// Log large responses
		responseSize := c.Writer.Size()
		if responseSize > 1024*1024 { // 1MB
			log.LogPerformance("large_response", duration, map[string]any{
				"path":          c.Request.URL.Path,
				"method":        c.Request.Method,
				"response_size": responseSize,
				"client_ip":     c.ClientIP(),
			})
		}
	}
}

// ErrorLoggingMiddleware logs detailed error information
func ErrorLoggingMiddleware(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Log errors from the request context
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				log.WithError(err.Err).Error("Request error",
					"path", c.Request.URL.Path,
					"method", c.Request.Method,
					"client_ip", c.ClientIP(),
					"user_agent", c.Request.UserAgent(),
					"error_type", err.Type,
				)
			}
		}

		// Log 5xx errors
		if c.Writer.Status() >= 500 {
			log.Error("Server error",
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"status_code", c.Writer.Status(),
				"client_ip", c.ClientIP(),
				"user_agent", c.Request.UserAgent(),
			)
		}
	}
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			(len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					containsSubstring(s, substr))))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
