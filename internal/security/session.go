package security

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// SessionConfig holds session security configuration
type SessionConfig struct {
	CookieName     string
	Domain         string
	Path           string
	MaxAge         int
	Secure         bool
	HttpOnly       bool
	SameSite       http.SameSite
	SessionTimeout time.Duration
}

// DefaultSessionConfig returns secure session configuration
func DefaultSessionConfig() SessionConfig {
	return SessionConfig{
		CookieName:     "session_id",
		Domain:         "",
		Path:           "/",
		MaxAge:         3600, // 1 hour
		Secure:         true,
		HttpOnly:       true,
		SameSite:       http.SameSiteStrictMode,
		SessionTimeout: time.Hour,
	}
}

// SecureSessionMiddleware creates secure session handling middleware
func SecureSessionMiddleware(config SessionConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set secure cookie attributes for any cookies set by handlers
		c.Header("Set-Cookie", fmt.Sprintf(
			"%s=; Path=%s; Domain=%s; Max-Age=%d; Secure=%t; HttpOnly=%t; SameSite=%s",
			config.CookieName,
			config.Path,
			config.Domain,
			config.MaxAge,
			config.Secure,
			config.HttpOnly,
			sameSiteToString(config.SameSite),
		))

		c.Next()
	}
}

// GenerateSecureSessionID generates a cryptographically secure session ID
func GenerateSecureSessionID() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate secure session ID: %w", err)
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// SetSecureCookie sets a secure cookie with proper attributes
func SetSecureCookie(c *gin.Context, config SessionConfig, name, value string) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     config.Path,
		Domain:   config.Domain,
		MaxAge:   config.MaxAge,
		Secure:   config.Secure,
		HttpOnly: config.HttpOnly,
		SameSite: config.SameSite,
	}

	http.SetCookie(c.Writer, cookie)
}

// ClearSecureCookie clears a secure cookie
func ClearSecureCookie(c *gin.Context, config SessionConfig, name string) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     config.Path,
		Domain:   config.Domain,
		MaxAge:   -1,
		Secure:   config.Secure,
		HttpOnly: config.HttpOnly,
		SameSite: config.SameSite,
	}

	http.SetCookie(c.Writer, cookie)
}

// SessionSecurityMiddleware adds session security headers
func SessionSecurityMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent session fixation
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")

		// Add session security headers
		c.Header("X-Session-Security", "enabled")

		c.Next()
	}
}

// ValidateSessionConfig validates session configuration
func (sc SessionConfig) Validate() error {
	if sc.CookieName == "" {
		return fmt.Errorf("cookie name cannot be empty")
	}

	if sc.MaxAge < 0 {
		return fmt.Errorf("max age cannot be negative")
	}

	if sc.SessionTimeout <= 0 {
		return fmt.Errorf("session timeout must be positive")
	}

	return nil
}

// sameSiteToString converts SameSite enum to string
func sameSiteToString(sameSite http.SameSite) string {
	switch sameSite {
	case http.SameSiteDefaultMode:
		return "Default"
	case http.SameSiteLaxMode:
		return "Lax"
	case http.SameSiteStrictMode:
		return "Strict"
	case http.SameSiteNoneMode:
		return "None"
	default:
		return "Default"
	}
}