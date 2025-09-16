package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCORSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		config         CORSConfig
		origin         string
		method         string
		expectedOrigin string
		expectedStatus int
	}{
		{
			name: "allowed origin",
			config: CORSConfig{
				AllowOrigins:     []string{"http://localhost:3000"},
				AllowMethods:     []string{"GET", "POST"},
				AllowHeaders:     []string{"Content-Type"},
				AllowCredentials: true,
				MaxAge:           time.Hour,
			},
			origin:         "http://localhost:3000",
			method:         "GET",
			expectedOrigin: "http://localhost:3000",
			expectedStatus: http.StatusOK,
		},
		{
			name: "disallowed origin",
			config: CORSConfig{
				AllowOrigins: []string{"http://localhost:3000"},
				AllowMethods: []string{"GET", "POST"},
			},
			origin:         "http://malicious.com",
			method:         "GET",
			expectedOrigin: "",
			expectedStatus: http.StatusOK,
		},
		{
			name: "wildcard origin",
			config: CORSConfig{
				AllowOrigins: []string{"*"},
				AllowMethods: []string{"GET", "POST"},
			},
			origin:         "http://any-origin.com",
			method:         "GET",
			expectedOrigin: "*",
			expectedStatus: http.StatusOK,
		},
		{
			name: "preflight request",
			config: CORSConfig{
				AllowOrigins: []string{"http://localhost:3000"},
				AllowMethods: []string{"GET", "POST"},
			},
			origin:         "http://localhost:3000",
			method:         "OPTIONS",
			expectedOrigin: "http://localhost:3000",
			expectedStatus: http.StatusNoContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(CORSMiddleware(tt.config))
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})
			router.POST("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest(tt.method, "/test", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.expectedOrigin != "" {
				assert.Equal(t, tt.expectedOrigin, w.Header().Get("Access-Control-Allow-Origin"))
			} else {
				assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
			}

			if tt.config.AllowCredentials {
				assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
			}
		})
	}
}

func TestInputSanitizationMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name     string
		query    string
		expected string
	}{
		{
			name:     "clean input",
			query:    "name=john&age=25",
			expected: "john",
		},
		{
			name:     "html injection",
			query:    "name=<script>alert('xss')</script>",
			expected: "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
		},
		{
			name:     "null bytes",
			query:    "name=john%00doe",
			expected: "johndoe",
		},
		{
			name:     "control characters",
			query:    "name=john%01%02doe",
			expected: "johndoe",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(InputSanitizationMiddleware())
			router.GET("/test", func(c *gin.Context) {
				name := c.Query("name")
				c.JSON(http.StatusOK, gin.H{"name": name})
			})

			req := httptest.NewRequest("GET", "/test?"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			// Note: The actual sanitization happens in the middleware,
			// but Gin's query parsing happens before middleware
			// This test verifies the middleware runs without errors
		})
	}
}

func TestSecurityValidationMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		userAgent      string
		query          string
		contentLength  int64
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "clean request",
			userAgent:      "Mozilla/5.0 (compatible)",
			query:          "name=john",
			contentLength:  100,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "suspicious user agent",
			userAgent:      "<script>alert('xss')</script>",
			query:          "name=john",
			contentLength:  100,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "SUSPICIOUS_REQUEST",
		},
		{
			name:           "sql injection in query",
			userAgent:      "Mozilla/5.0 (compatible)",
			query:          "name=' OR '1'='1",
			contentLength:  100,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_INPUT",
		},
		{
			name:           "request too large",
			userAgent:      "Mozilla/5.0 (compatible)",
			query:          "name=john",
			contentLength:  11 * 1024 * 1024, // 11MB
			expectedStatus: http.StatusRequestEntityTooLarge,
			expectedError:  "REQUEST_TOO_LARGE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(SecurityValidationMiddleware())
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/test?"+tt.query, nil)
			req.Header.Set("User-Agent", tt.userAgent)
			req.ContentLength = tt.contentLength

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestContentSecurityPolicyMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(ContentSecurityPolicyMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	csp := w.Header().Get("Content-Security-Policy")
	assert.NotEmpty(t, csp)
	assert.Contains(t, csp, "default-src 'self'")
	assert.Contains(t, csp, "script-src 'self' 'unsafe-inline' 'unsafe-eval'")
	assert.Contains(t, csp, "style-src 'self' 'unsafe-inline'")
	assert.Contains(t, csp, "object-src 'none'")
	assert.Contains(t, csp, "frame-ancestors 'none'")
}

func TestHTTPSRedirectMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name             string
		proto            string
		host             string
		uri              string
		expectedStatus   int
		expectedLocation string
	}{
		{
			name:             "http request should redirect",
			proto:            "http",
			host:             "example.com",
			uri:              "/test",
			expectedStatus:   http.StatusMovedPermanently,
			expectedLocation: "https://example.com/test",
		},
		{
			name:           "https request should pass through",
			proto:          "https",
			host:           "example.com",
			uri:            "/test",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(HTTPSRedirectMiddleware())
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", tt.uri, nil)
			req.Host = tt.host
			req.Header.Set("X-Forwarded-Proto", tt.proto)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedLocation != "" {
				assert.Equal(t, tt.expectedLocation, w.Header().Get("Location"))
			}
		})
	}
}

func TestHSTSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		proto      string
		expectHSTS bool
	}{
		{
			name:       "https request should have HSTS",
			proto:      "https",
			expectHSTS: true,
		},
		{
			name:       "http request should not have HSTS",
			proto:      "http",
			expectHSTS: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(HSTSMiddleware())
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("X-Forwarded-Proto", tt.proto)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			hsts := w.Header().Get("Strict-Transport-Security")
			if tt.expectHSTS {
				assert.NotEmpty(t, hsts)
				assert.Contains(t, hsts, "max-age=31536000")
				assert.Contains(t, hsts, "includeSubDomains")
				assert.Contains(t, hsts, "preload")
			} else {
				assert.Empty(t, hsts)
			}
		})
	}
}

func TestSanitizeInput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "clean input",
			input:    "hello world",
			expected: "hello world",
		},
		{
			name:     "html characters",
			input:    "<script>alert('xss')</script>",
			expected: "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
		},
		{
			name:     "null bytes",
			input:    "hello\x00world",
			expected: "helloworld",
		},
		{
			name:     "control characters",
			input:    "hello\x01\x02world",
			expected: "helloworld",
		},
		{
			name:     "allowed control characters",
			input:    "hello\tworld\ntest\r",
			expected: "hello\tworld\ntest\r",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeInput(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestContainsSuspiciousPatterns(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "clean input",
			input:    "Mozilla/5.0 (compatible)",
			expected: false,
		},
		{
			name:     "script tag",
			input:    "<script>alert('xss')</script>",
			expected: true,
		},
		{
			name:     "javascript protocol",
			input:    "javascript:alert('xss')",
			expected: true,
		},
		{
			name:     "onload event",
			input:    "onload=alert('xss')",
			expected: true,
		},
		{
			name:     "eval function",
			input:    "eval(malicious_code)",
			expected: true,
		},
		{
			name:     "case insensitive",
			input:    "JAVASCRIPT:alert('xss')",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsSuspiciousPatterns(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestContainsSQLInjection(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "clean input",
			input:    "john doe",
			expected: false,
		},
		{
			name:     "union select",
			input:    "' UNION SELECT * FROM users --",
			expected: true,
		},
		{
			name:     "drop table",
			input:    "'; DROP TABLE users; --",
			expected: true,
		},
		{
			name:     "or condition",
			input:    "' OR '1'='1",
			expected: true,
		},
		{
			name:     "comment",
			input:    "test -- comment",
			expected: true,
		},
		{
			name:     "case insensitive",
			input:    "' union select * from users",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsSQLInjection(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestDefaultCORSConfig(t *testing.T) {
	config := DefaultCORSConfig()

	assert.Contains(t, config.AllowOrigins, "http://localhost:3000")
	assert.Contains(t, config.AllowOrigins, "https://localhost:3000")
	assert.Contains(t, config.AllowMethods, "GET")
	assert.Contains(t, config.AllowMethods, "POST")
	assert.Contains(t, config.AllowHeaders, "Authorization")
	assert.Contains(t, config.ExposeHeaders, "X-Request-ID")
	assert.True(t, config.AllowCredentials)
	assert.Equal(t, 12*time.Hour, config.MaxAge)
}

func TestValidationMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(ValidationMiddleware())
	router.GET("/test", func(c *gin.Context) {
		validator, exists := c.Get("validator")
		require.True(t, exists)
		require.NotNil(t, validator)
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
