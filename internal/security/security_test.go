package security

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"project-management-platform/internal/middleware"
)

func TestSecurityIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create router with all security middleware
	router := gin.New()
	router.Use(middleware.CORSMiddleware(middleware.DefaultCORSConfig()))
	router.Use(middleware.SecurityHeadersMiddleware())
	router.Use(middleware.ContentSecurityPolicyMiddleware())
	router.Use(middleware.InputSanitizationMiddleware())
	router.Use(middleware.SecurityValidationMiddleware())
	router.Use(middleware.HSTSMiddleware())

	// Add test routes
	router.GET("/api/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	router.POST("/api/test", func(c *gin.Context) {
		var data map[string]interface{}
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": data})
	})

	t.Run("Security Headers", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/test", nil)
		req.Header.Set("X-Forwarded-Proto", "https")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Check security headers
		assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
		assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
		assert.Equal(t, "1; mode=block", w.Header().Get("X-XSS-Protection"))
		assert.Equal(t, "strict-origin-when-cross-origin", w.Header().Get("Referrer-Policy"))
		assert.NotEmpty(t, w.Header().Get("Content-Security-Policy"))
		assert.NotEmpty(t, w.Header().Get("Strict-Transport-Security"))
		assert.Empty(t, w.Header().Get("Server"))
	})

	t.Run("CORS Headers", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "http://localhost:3000", w.Header().Get("Access-Control-Allow-Origin"))
		assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
		assert.NotEmpty(t, w.Header().Get("Access-Control-Allow-Methods"))
		assert.NotEmpty(t, w.Header().Get("Access-Control-Allow-Headers"))
	})

	t.Run("Block Malicious User Agent", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/test", nil)
		req.Header.Set("User-Agent", "<script>alert('xss')</script>")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "SUSPICIOUS_REQUEST")
	})

	t.Run("Block SQL Injection", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/test?name=%27%20OR%20%271%27%3D%271", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "INVALID_INPUT")
	})

	t.Run("Allow Clean Requests", func(t *testing.T) {
		data := map[string]interface{}{
			"name": "John Doe",
			"age":  30,
		}
		jsonData, _ := json.Marshal(data)

		req := httptest.NewRequest("POST", "/api/test", bytes.NewReader(jsonData))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible)")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}
