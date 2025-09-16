package middleware

import (
	"html"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowOrigins     []string
	AllowMethods     []string
	AllowHeaders     []string
	ExposeHeaders    []string
	AllowCredentials bool
	MaxAge           time.Duration
}

// DefaultCORSConfig returns default CORS configuration
func DefaultCORSConfig() CORSConfig {
	return CORSConfig{
		AllowOrigins: []string{"http://localhost:3000", "http://localhost:3001", "http://localhost:8080", "https://localhost:3000", "https://localhost:3001", "https://localhost:8080"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Requested-With",
			"X-Request-ID",
			"Cache-Control",
		},
		ExposeHeaders: []string{
			"X-Request-ID",
			"X-Total-Count",
			"X-Page-Count",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
}

// CORSMiddleware creates CORS middleware
func CORSMiddleware(config CORSConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if origin is allowed
		allowOrigin := ""
		for _, allowedOrigin := range config.AllowOrigins {
			if allowedOrigin == "*" || allowedOrigin == origin {
				allowOrigin = allowedOrigin
				break
			}
		}
		
		if allowOrigin != "" {
			c.Header("Access-Control-Allow-Origin", allowOrigin)
		}
		
		c.Header("Access-Control-Allow-Methods", strings.Join(config.AllowMethods, ", "))
		c.Header("Access-Control-Allow-Headers", strings.Join(config.AllowHeaders, ", "))
		c.Header("Access-Control-Expose-Headers", strings.Join(config.ExposeHeaders, ", "))
		
		if config.AllowCredentials {
			c.Header("Access-Control-Allow-Credentials", "true")
		}
		
		if config.MaxAge > 0 {
			c.Header("Access-Control-Max-Age", string(rune(int(config.MaxAge.Seconds()))))
		}
		
		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		
		c.Next()
	}
}

// InputSanitizationMiddleware sanitizes user input
func InputSanitizationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Sanitize query parameters
		for key, values := range c.Request.URL.Query() {
			for i, value := range values {
				c.Request.URL.Query()[key][i] = sanitizeInput(value)
			}
		}
		
		// Sanitize form data if present
		if c.Request.Header.Get("Content-Type") == "application/x-www-form-urlencoded" {
			if err := c.Request.ParseForm(); err == nil {
				for key, values := range c.Request.PostForm {
					for i, value := range values {
						c.Request.PostForm[key][i] = sanitizeInput(value)
					}
				}
			}
		}
		
		c.Next()
	}
}

// ValidationMiddleware creates input validation middleware
func ValidationMiddleware() gin.HandlerFunc {
	validator := validator.New()
	
	return func(c *gin.Context) {
		// Store validator in context for handlers to use
		c.Set("validator", validator)
		c.Next()
	}
}

// SecurityValidationMiddleware performs security-focused validation
func SecurityValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for common attack patterns in headers
		if containsSuspiciousPatterns(c.Request.Header.Get("User-Agent")) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "SUSPICIOUS_REQUEST",
					"message": "Request blocked due to security policy",
				},
			})
			c.Abort()
			return
		}
		
		// Check for SQL injection patterns in query parameters
		for _, values := range c.Request.URL.Query() {
			for _, value := range values {
				if containsSQLInjection(value) {
					c.JSON(http.StatusBadRequest, gin.H{
						"success": false,
						"error": map[string]interface{}{
							"code":    "INVALID_INPUT",
							"message": "Invalid characters detected in request",
						},
					})
					c.Abort()
					return
				}
			}
		}
		
		// Check request size
		if c.Request.ContentLength > 10*1024*1024 { // 10MB limit
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"code":    "REQUEST_TOO_LARGE",
					"message": "Request body too large",
				},
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// ContentSecurityPolicyMiddleware adds comprehensive CSP headers
func ContentSecurityPolicyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		csp := strings.Join([]string{
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for vanilla JS
			"style-src 'self' 'unsafe-inline'", // Allow inline styles
			"img-src 'self' data: https:",
			"font-src 'self' data:",
			"connect-src 'self' ws: wss:", // Allow WebSocket connections
			"media-src 'self'",
			"object-src 'none'",
			"frame-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'none'",
			"upgrade-insecure-requests",
		}, "; ")
		
		c.Header("Content-Security-Policy", csp)
		c.Next()
	}
}

// HTTPSRedirectMiddleware redirects HTTP to HTTPS in production
func HTTPSRedirectMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Header.Get("X-Forwarded-Proto") == "http" {
			httpsURL := "https://" + c.Request.Host + c.Request.RequestURI
			c.Redirect(http.StatusMovedPermanently, httpsURL)
			c.Abort()
			return
		}
		c.Next()
	}
}

// HSTSMiddleware adds HTTP Strict Transport Security headers
func HSTSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only add HSTS header for HTTPS requests
		if c.Request.TLS != nil || c.Request.Header.Get("X-Forwarded-Proto") == "https" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}
		c.Next()
	}
}

// sanitizeInput removes potentially dangerous characters from input
func sanitizeInput(input string) string {
	// HTML escape
	input = html.EscapeString(input)
	
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// Remove control characters except tab, newline, and carriage return
	var result strings.Builder
	for _, r := range input {
		if r >= 32 || r == '\t' || r == '\n' || r == '\r' {
			result.WriteRune(r)
		}
	}
	
	return result.String()
}

// containsSuspiciousPatterns checks for common attack patterns
func containsSuspiciousPatterns(input string) bool {
	suspiciousPatterns := []string{
		"<script",
		"javascript:",
		"vbscript:",
		"onload=",
		"onerror=",
		"eval(",
		"expression(",
	}
	
	lowerInput := strings.ToLower(input)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}
	
	return false
}

// containsSQLInjection checks for SQL injection patterns
func containsSQLInjection(input string) bool {
	sqlPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(union\s+select)`),
		regexp.MustCompile(`(?i)(drop\s+table)`),
		regexp.MustCompile(`(?i)(delete\s+from)`),
		regexp.MustCompile(`(?i)(insert\s+into)`),
		regexp.MustCompile(`(?i)(update\s+.+set)`),
		regexp.MustCompile(`(?i)(exec\s*\()`),
		regexp.MustCompile(`(?i)(script\s*>)`),
		regexp.MustCompile(`(?i)('.*or.*'.*=.*')`),
		regexp.MustCompile(`(?i)(--)`),
		regexp.MustCompile(`(?i)(\/\*.*\*\/)`),
	}
	
	for _, pattern := range sqlPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}
	
	return false
}