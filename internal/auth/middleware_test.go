package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestNewAuthMiddleware(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)

	assert.NotNil(t, middleware)
	assert.Equal(t, jwtManager, middleware.jwtManager)
}

func TestRequireAuth_ValidToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	email := "test@example.com"
	role := "user"

	token, err := jwtManager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		user := middleware.GetAuthenticatedUser(c)
		c.JSON(200, gin.H{
			"user": user,
		})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	// Additional assertions can be added to check the response body
}

func TestRequireAuth_MissingToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_ExpiredToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 1*time.Millisecond, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_RefreshTokenRejected(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	refreshToken, err := jwtManager.GenerateRefreshToken(userID, "test@example.com")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+refreshToken)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireRole_ValidRole(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "admin@example.com", "admin")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.Use(middleware.RequireRole("admin"))
	router.GET("/admin", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "admin access granted"})
	})

	req := httptest.NewRequest("GET", "/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireRole_InvalidRole(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "user@example.com", "user")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.Use(middleware.RequireRole("admin"))
	router.GET("/admin", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "admin access granted"})
	})

	req := httptest.NewRequest("GET", "/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestRequireAnyRole_ValidRole(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "moderator@example.com", "moderator")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.Use(middleware.RequireAnyRole("admin", "moderator"))
	router.GET("/restricted", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "access granted"})
	})

	req := httptest.NewRequest("GET", "/restricted", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireAnyRole_InvalidRole(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "user@example.com", "user")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.Use(middleware.RequireAnyRole("admin", "moderator"))
	router.GET("/restricted", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "access granted"})
	})

	req := httptest.NewRequest("GET", "/restricted", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestOptionalAuth_WithValidToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.OptionalAuth())
	router.GET("/optional", func(c *gin.Context) {
		user := middleware.GetAuthenticatedUser(c)
		if user != nil {
			c.JSON(200, gin.H{"authenticated": true, "user": user.Email})
		} else {
			c.JSON(200, gin.H{"authenticated": false})
		}
	})

	req := httptest.NewRequest("GET", "/optional", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestOptionalAuth_WithoutToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)

	router := setupTestRouter()
	router.Use(middleware.OptionalAuth())
	router.GET("/optional", func(c *gin.Context) {
		user := middleware.GetAuthenticatedUser(c)
		if user != nil {
			c.JSON(200, gin.H{"authenticated": true, "user": user.Email})
		} else {
			c.JSON(200, gin.H{"authenticated": false})
		}
	})

	req := httptest.NewRequest("GET", "/optional", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestOptionalAuth_WithInvalidToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)

	router := setupTestRouter()
	router.Use(middleware.OptionalAuth())
	router.GET("/optional", func(c *gin.Context) {
		user := middleware.GetAuthenticatedUser(c)
		if user != nil {
			c.JSON(200, gin.H{"authenticated": true, "user": user.Email})
		} else {
			c.JSON(200, gin.H{"authenticated": false})
		}
	})

	req := httptest.NewRequest("GET", "/optional", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetUserMethods(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	email := "test@example.com"
	role := "admin"
	token, err := jwtManager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/user-info", func(c *gin.Context) {
		// Test GetUserID
		id, hasID := middleware.GetUserID(c)
		assert.True(t, hasID)
		assert.Equal(t, userID, id)

		// Test GetUserEmail
		userEmail, hasEmail := middleware.GetUserEmail(c)
		assert.True(t, hasEmail)
		assert.Equal(t, email, userEmail)

		// Test GetUserRole
		userRole, hasRole := middleware.GetUserRole(c)
		assert.True(t, hasRole)
		assert.Equal(t, role, userRole)

		c.JSON(200, gin.H{"success": true})
	})

	req := httptest.NewRequest("GET", "/user-info", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExtractToken_FromHeader(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"success": true})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExtractToken_FromQuery(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	middleware := NewAuthMiddleware(jwtManager)
	
	userID := primitive.NewObjectID()
	token, err := jwtManager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.RequireAuth())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"success": true})
	})

	req := httptest.NewRequest("GET", "/test?token="+token, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestWithUserContext(t *testing.T) {
	user := &AuthenticatedUser{
		ID:    primitive.NewObjectID(),
		Email: "test@example.com",
		Role:  "user",
	}

	ctx := context.Background()
	ctxWithUser := WithUserContext(ctx, user)

	retrievedUser, ok := UserFromContext(ctxWithUser)
	assert.True(t, ok)
	assert.Equal(t, user, retrievedUser)
}

func TestUserFromContext_NoUser(t *testing.T) {
	ctx := context.Background()
	
	user, ok := UserFromContext(ctx)
	assert.False(t, ok)
	assert.Nil(t, user)
}

func TestCORSMiddleware(t *testing.T) {
	router := setupTestRouter()
	router.Use(CORSMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "test"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORSMiddleware_OptionsRequest(t *testing.T) {
	router := setupTestRouter()
	router.Use(CORSMiddleware())
	router.OPTIONS("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "should not reach here"})
	})

	req := httptest.NewRequest("OPTIONS", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestSecurityHeaders(t *testing.T) {
	router := setupTestRouter()
	router.Use(SecurityHeaders())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "test"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
	assert.Equal(t, "1; mode=block", w.Header().Get("X-XSS-Protection"))
}

func TestRequestIDMiddleware(t *testing.T) {
	router := setupTestRouter()
	router.Use(RequestIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		requestID, exists := c.Get("request_id")
		assert.True(t, exists)
		assert.NotEmpty(t, requestID)
		c.JSON(200, gin.H{"request_id": requestID})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotEmpty(t, w.Header().Get("X-Request-ID"))
}

func TestRequestIDMiddleware_WithExistingID(t *testing.T) {
	router := setupTestRouter()
	router.Use(RequestIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "test"})
	})

	existingID := "existing-request-id"
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", existingID)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, existingID, w.Header().Get("X-Request-ID"))
}