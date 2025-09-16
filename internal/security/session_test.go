package security

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDefaultSessionConfig(t *testing.T) {
	config := DefaultSessionConfig()

	assert.Equal(t, "session_id", config.CookieName)
	assert.Equal(t, "", config.Domain)
	assert.Equal(t, "/", config.Path)
	assert.Equal(t, 3600, config.MaxAge)
	assert.True(t, config.Secure)
	assert.True(t, config.HttpOnly)
	assert.Equal(t, http.SameSiteStrictMode, config.SameSite)
	assert.Equal(t, time.Hour, config.SessionTimeout)
}

func TestSessionConfigValidation(t *testing.T) {
	tests := []struct {
		name        string
		config      SessionConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid config",
			config: SessionConfig{
				CookieName:     "session",
				MaxAge:         3600,
				SessionTimeout: time.Hour,
			},
			expectError: false,
		},
		{
			name: "empty cookie name",
			config: SessionConfig{
				CookieName:     "",
				MaxAge:         3600,
				SessionTimeout: time.Hour,
			},
			expectError: true,
			errorMsg:    "cookie name cannot be empty",
		},
		{
			name: "negative max age",
			config: SessionConfig{
				CookieName:     "session",
				MaxAge:         -1,
				SessionTimeout: time.Hour,
			},
			expectError: true,
			errorMsg:    "max age cannot be negative",
		},
		{
			name: "zero session timeout",
			config: SessionConfig{
				CookieName:     "session",
				MaxAge:         3600,
				SessionTimeout: 0,
			},
			expectError: true,
			errorMsg:    "session timeout must be positive",
		},
		{
			name: "negative session timeout",
			config: SessionConfig{
				CookieName:     "session",
				MaxAge:         3600,
				SessionTimeout: -time.Hour,
			},
			expectError: true,
			errorMsg:    "session timeout must be positive",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGenerateSecureSessionID(t *testing.T) {
	// Generate multiple session IDs to test uniqueness
	ids := make(map[string]bool)
	for i := 0; i < 100; i++ {
		id, err := GenerateSecureSessionID()
		require.NoError(t, err)
		require.NotEmpty(t, id)

		// Check that ID is unique
		assert.False(t, ids[id], "Session ID should be unique")
		ids[id] = true

		// Check that ID has reasonable length (base64 encoded 32 bytes)
		assert.True(t, len(id) > 40, "Session ID should be sufficiently long")
	}
}

func TestSetSecureCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := SessionConfig{
		CookieName: "test_session",
		Domain:     "example.com",
		Path:       "/api",
		MaxAge:     7200,
		Secure:     true,
		HttpOnly:   true,
		SameSite:   http.SameSiteStrictMode,
	}

	router := gin.New()
	router.GET("/test", func(c *gin.Context) {
		SetSecureCookie(c, config, "test_session", "test_value")
		c.JSON(http.StatusOK, gin.H{"message": "cookie set"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	cookies := w.Result().Cookies()
	require.Len(t, cookies, 1)

	cookie := cookies[0]
	assert.Equal(t, "test_session", cookie.Name)
	assert.Equal(t, "test_value", cookie.Value)
	assert.Equal(t, "example.com", cookie.Domain)
	assert.Equal(t, "/api", cookie.Path)
	assert.Equal(t, 7200, cookie.MaxAge)
	assert.True(t, cookie.Secure)
	assert.True(t, cookie.HttpOnly)
	assert.Equal(t, http.SameSiteStrictMode, cookie.SameSite)
}

func TestClearSecureCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := SessionConfig{
		CookieName: "test_session",
		Domain:     "example.com",
		Path:       "/api",
		Secure:     true,
		HttpOnly:   true,
		SameSite:   http.SameSiteStrictMode,
	}

	router := gin.New()
	router.GET("/clear", func(c *gin.Context) {
		ClearSecureCookie(c, config, "test_session")
		c.JSON(http.StatusOK, gin.H{"message": "cookie cleared"})
	})

	req := httptest.NewRequest("GET", "/clear", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	cookies := w.Result().Cookies()
	require.Len(t, cookies, 1)

	cookie := cookies[0]
	assert.Equal(t, "test_session", cookie.Name)
	assert.Equal(t, "", cookie.Value)
	assert.Equal(t, -1, cookie.MaxAge)
	assert.True(t, cookie.Secure)
	assert.True(t, cookie.HttpOnly)
}

func TestSecureSessionMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultSessionConfig()

	router := gin.New()
	router.Use(SecureSessionMiddleware(config))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Check that Set-Cookie header is present (even if empty)
	setCookieHeader := w.Header().Get("Set-Cookie")
	assert.NotEmpty(t, setCookieHeader)
	assert.Contains(t, setCookieHeader, "session_id")
	assert.Contains(t, setCookieHeader, "Secure=true")
	assert.Contains(t, setCookieHeader, "HttpOnly=true")
	assert.Contains(t, setCookieHeader, "SameSite=Strict")
}

func TestSessionSecurityMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(SessionSecurityMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Check security headers
	assert.Equal(t, "no-cache, no-store, must-revalidate", w.Header().Get("Cache-Control"))
	assert.Equal(t, "no-cache", w.Header().Get("Pragma"))
	assert.Equal(t, "0", w.Header().Get("Expires"))
	assert.Equal(t, "enabled", w.Header().Get("X-Session-Security"))
}

func TestSameSiteToString(t *testing.T) {
	tests := []struct {
		sameSite http.SameSite
		expected string
	}{
		{http.SameSiteDefaultMode, "Default"},
		{http.SameSiteLaxMode, "Lax"},
		{http.SameSiteStrictMode, "Strict"},
		{http.SameSiteNoneMode, "None"},
		{http.SameSite(99), "Default"}, // Invalid value should default
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := sameSiteToString(tt.sameSite)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSessionSecurityIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := SessionConfig{
		CookieName:     "secure_session",
		Domain:         "secure.example.com",
		Path:           "/",
		MaxAge:         1800,
		Secure:         true,
		HttpOnly:       true,
		SameSite:       http.SameSiteStrictMode,
		SessionTimeout: 30 * time.Minute,
	}

	router := gin.New()
	router.Use(SecureSessionMiddleware(config))
	router.Use(SessionSecurityMiddleware())

	router.POST("/login", func(c *gin.Context) {
		sessionID, err := GenerateSecureSessionID()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate session"})
			return
		}

		SetSecureCookie(c, config, config.CookieName, sessionID)
		c.JSON(http.StatusOK, gin.H{"message": "logged in", "session_id": sessionID})
	})

	router.POST("/logout", func(c *gin.Context) {
		ClearSecureCookie(c, config, config.CookieName)
		c.JSON(http.StatusOK, gin.H{"message": "logged out"})
	})

	// Test login
	req := httptest.NewRequest("POST", "/login", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Check that secure cookie is set
	cookies := w.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, cookie := range cookies {
		if cookie.Name == "secure_session" {
			sessionCookie = cookie
			break
		}
	}

	require.NotNil(t, sessionCookie)
	assert.NotEmpty(t, sessionCookie.Value)
	assert.True(t, sessionCookie.Secure)
	assert.True(t, sessionCookie.HttpOnly)
	assert.Equal(t, http.SameSiteStrictMode, sessionCookie.SameSite)

	// Test logout
	req = httptest.NewRequest("POST", "/logout", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Check that cookie is cleared
	cookies = w.Result().Cookies()
	for _, cookie := range cookies {
		if cookie.Name == "secure_session" {
			assert.Equal(t, "", cookie.Value)
			assert.Equal(t, -1, cookie.MaxAge)
			break
		}
	}
}

func BenchmarkGenerateSecureSessionID(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, err := GenerateSecureSessionID()
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkSessionConfigValidation(b *testing.B) {
	config := DefaultSessionConfig()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := config.Validate()
		if err != nil {
			b.Fatal(err)
		}
	}
}