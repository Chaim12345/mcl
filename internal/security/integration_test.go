package security

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"project-management-platform/internal/middleware"
)

func TestCompleteSecurityIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create router with complete security stack
	router := gin.New()

	// Add all security middleware
	router.Use(middleware.CORSMiddleware(middleware.DefaultCORSConfig()))
	router.Use(middleware.SecurityHeadersMiddleware())
	router.Use(middleware.ContentSecurityPolicyMiddleware())
	router.Use(middleware.HSTSMiddleware())
	router.Use(middleware.InputSanitizationMiddleware())
	router.Use(middleware.SecurityValidationMiddleware())
	router.Use(middleware.RateLimitMiddleware(middleware.RateLimitConfig{
		RequestsPerMinute: 10,
		BurstSize:         2,
	}))
	router.Use(SessionSecurityMiddleware())

	// Add test routes
	router.GET("/api/secure", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "secure endpoint accessed"})
	})

	router.POST("/api/login", func(c *gin.Context) {
		sessionID, err := GenerateSecureSessionID()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "session generation failed"})
			return
		}

		config := DefaultSessionConfig()
		SetSecureCookie(c, config, "session_id", sessionID)
		c.JSON(http.StatusOK, gin.H{"message": "login successful"})
	})

	t.Run("Complete Security Headers", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/secure", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible)")
		req.Header.Set("X-Forwarded-Proto", "https")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Check all security headers are present
		expectedHeaders := map[string]string{
			"X-Content-Type-Options":      "nosniff",
			"X-Frame-Options":             "DENY",
			"X-XSS-Protection":            "1; mode=block",
			"Referrer-Policy":             "strict-origin-when-cross-origin",
			"Access-Control-Allow-Origin": "http://localhost:3000",
			"Cache-Control":               "no-cache, no-store, must-revalidate",
			"Pragma":                      "no-cache",
			"Expires":                     "0",
			"X-Session-Security":          "enabled",
		}

		for header, expectedValue := range expectedHeaders {
			actualValue := w.Header().Get(header)
			assert.Equal(t, expectedValue, actualValue, "Header %s should be %s", header, expectedValue)
		}

		// Check CSP and HSTS headers exist
		assert.NotEmpty(t, w.Header().Get("Content-Security-Policy"))
		assert.NotEmpty(t, w.Header().Get("Strict-Transport-Security"))
		assert.Empty(t, w.Header().Get("Server"))
	})

	t.Run("Secure Session Management", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/login", nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible)")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Check secure cookie attributes
		cookies := w.Result().Cookies()
		var sessionCookie *http.Cookie
		for _, cookie := range cookies {
			if cookie.Name == "session_id" {
				sessionCookie = cookie
				break
			}
		}

		require.NotNil(t, sessionCookie)
		assert.NotEmpty(t, sessionCookie.Value)
		assert.True(t, sessionCookie.Secure)
		assert.True(t, sessionCookie.HttpOnly)
		assert.Equal(t, http.SameSiteStrictMode, sessionCookie.SameSite)
		assert.Equal(t, 3600, sessionCookie.MaxAge)
	})

	t.Run("Attack Prevention", func(t *testing.T) {
		attackTests := []struct {
			name           string
			userAgent      string
			query          string
			expectedStatus int
			expectedError  string
		}{
			{
				name:           "XSS in User-Agent",
				userAgent:      "<script>alert('xss')</script>",
				query:          "",
				expectedStatus: http.StatusBadRequest,
				expectedError:  "SUSPICIOUS_REQUEST",
			},
			{
				name:           "SQL Injection in Query",
				userAgent:      "Mozilla/5.0 (compatible)",
				query:          "?id=%27%20OR%20%271%27%3D%271",
				expectedStatus: http.StatusBadRequest,
				expectedError:  "INVALID_INPUT",
			},
			{
				name:           "JavaScript Protocol",
				userAgent:      "javascript:alert('xss')",
				query:          "",
				expectedStatus: http.StatusBadRequest,
				expectedError:  "SUSPICIOUS_REQUEST",
			},
		}

		for _, tt := range attackTests {
			t.Run(tt.name, func(t *testing.T) {
				req := httptest.NewRequest("GET", "/api/secure"+tt.query, nil)
				req.Header.Set("User-Agent", tt.userAgent)

				w := httptest.NewRecorder()
				router.ServeHTTP(w, req)

				assert.Equal(t, tt.expectedStatus, w.Code)
				assert.Contains(t, w.Body.String(), tt.expectedError)
			})
		}
	})

	t.Run("Rate Limiting", func(t *testing.T) {
		// Make requests up to the limit
		for i := 0; i < 10; i++ {
			req := httptest.NewRequest("GET", "/api/secure", nil)
			req.Header.Set("User-Agent", "Mozilla/5.0 (compatible)")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			assert.Equal(t, http.StatusOK, w.Code, "Request %d should succeed", i+1)
		}

		// Next request should be rate limited
		req := httptest.NewRequest("GET", "/api/secure", nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible)")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusTooManyRequests, w.Code)
		assert.Contains(t, w.Body.String(), "RATE_LIMIT_EXCEEDED")
	})
}

func TestTLSSecurityIntegration(t *testing.T) {
	// Test TLS configuration security
	tlsConfig := DefaultTLSConfig()

	config, err := tlsConfig.CreateTLSConfig()
	require.NoError(t, err)

	t.Run("TLS Version Security", func(t *testing.T) {
		assert.GreaterOrEqual(t, config.MinVersion, uint16(tls.VersionTLS12))
		assert.LessOrEqual(t, config.MaxVersion, uint16(tls.VersionTLS13))
	})

	t.Run("Cipher Suite Security", func(t *testing.T) {
		// Ensure only secure cipher suites are allowed
		for _, cipher := range config.CipherSuites {
			// Check that it's not a known weak cipher
			weakCiphers := []uint16{
				tls.TLS_RSA_WITH_RC4_128_SHA,
				tls.TLS_RSA_WITH_3DES_EDE_CBC_SHA,
				tls.TLS_RSA_WITH_AES_128_CBC_SHA,
			}

			for _, weakCipher := range weakCiphers {
				assert.NotEqual(t, weakCipher, cipher, "Weak cipher suite should not be included")
			}
		}
	})

	t.Run("TLS Configuration Security", func(t *testing.T) {

		assert.Equal(t, tls.RenegotiateNever, config.Renegotiation)
		assert.False(t, config.SessionTicketsDisabled)

		// Check curve preferences
		expectedCurves := []tls.CurveID{tls.X25519, tls.CurveP256}
		assert.Equal(t, expectedCurves, config.CurvePreferences)
	})
}

func TestSecurityConfigurationValidation(t *testing.T) {
	t.Run("TLS Config Validation", func(t *testing.T) {
		validConfig := DefaultTLSConfig()
		assert.NoError(t, validConfig.Validate())

		invalidConfig := &TLSConfig{
			MinVersion: tls.VersionTLS10, // Too old
			MaxVersion: tls.VersionTLS13,
		}
		assert.Error(t, invalidConfig.Validate())
	})

	t.Run("Session Config Validation", func(t *testing.T) {
		validConfig := DefaultSessionConfig()
		assert.NoError(t, validConfig.Validate())

		invalidConfig := SessionConfig{
			CookieName:     "", // Empty name
			MaxAge:         3600,
			SessionTimeout: time.Hour,
		}
		assert.Error(t, invalidConfig.Validate())
	})

	t.Run("CORS Config Validation", func(t *testing.T) {
		config := middleware.DefaultCORSConfig()

		// Check that localhost origins are allowed for development
		assert.Contains(t, config.AllowOrigins, "http://localhost:3000")
		assert.Contains(t, config.AllowOrigins, "https://localhost:3000")

		// Check that credentials are allowed
		assert.True(t, config.AllowCredentials)

		// Check that necessary headers are allowed
		assert.Contains(t, config.AllowHeaders, "Authorization")
		assert.Contains(t, config.AllowHeaders, "Content-Type")

		// Check that necessary methods are allowed
		assert.Contains(t, config.AllowMethods, "GET")
		assert.Contains(t, config.AllowMethods, "POST")
		assert.Contains(t, config.AllowMethods, "PUT")
		assert.Contains(t, config.AllowMethods, "DELETE")
	})
}

func TestSecurityPerformance(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(middleware.CORSMiddleware(middleware.DefaultCORSConfig()))
	router.Use(middleware.SecurityHeadersMiddleware())
	router.Use(middleware.ContentSecurityPolicyMiddleware())
	router.Use(middleware.InputSanitizationMiddleware())
	router.Use(middleware.SecurityValidationMiddleware())
	router.Use(SessionSecurityMiddleware())

	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Benchmark security middleware performance
	req := httptest.NewRequest("GET", "/test?name=john&age=25", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible)")

	// Warm up
	for i := 0; i < 10; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}

	// Measure performance
	start := time.Now()
	iterations := 1000
	for i := 0; i < iterations; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
	duration := time.Since(start)

	avgDuration := duration / time.Duration(iterations)
	t.Logf("Average request duration with security middleware: %v", avgDuration)

	// Security middleware should not add significant overhead
	assert.Less(t, avgDuration, 10*time.Millisecond, "Security middleware should not add significant overhead")
}

func BenchmarkCompleteSecurityStack(b *testing.B) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(middleware.CORSMiddleware(middleware.DefaultCORSConfig()))
	router.Use(middleware.SecurityHeadersMiddleware())
	router.Use(middleware.ContentSecurityPolicyMiddleware())
	router.Use(middleware.HSTSMiddleware())
	router.Use(middleware.InputSanitizationMiddleware())
	router.Use(middleware.SecurityValidationMiddleware())
	router.Use(SessionSecurityMiddleware())

	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/test?name=john&age=25", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible)")
	req.Header.Set("X-Forwarded-Proto", "https")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}
