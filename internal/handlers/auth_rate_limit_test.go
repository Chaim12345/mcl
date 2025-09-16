package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"project-management-platform/internal/middleware"
	"project-management-platform/internal/services"
)

func TestAuthHandler_LoginRateLimit(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	// Setup router with rate limiting
	gin.SetMode(gin.TestMode)
	router := gin.New()

	auth := router.Group("/api/auth")
	auth.Use(middleware.AuthRateLimitMiddleware())
	{
		auth.POST("/login", authHandler.Login)
	}

	// Test data
	req := services.LoginRequest{
		Email:    "test@example.com",
		Password: "TestPassword123!",
	}

	// Mock expectations - we expect this to be called only for successful requests
	mockAuthService.On("Login", mock.Anything, req).Return(nil, assert.AnError)

	reqBody, _ := json.Marshal(req)

	// Make multiple requests rapidly to trigger rate limit
	// The AuthRateLimitMiddleware allows 5 requests per minute
	for i := 0; i < 6; i++ {
		w := httptest.NewRecorder()
		httpReq, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(reqBody))
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("X-Forwarded-For", "192.168.1.1") // Set consistent IP

		router.ServeHTTP(w, httpReq)

		if i < 5 {
			// First 5 requests should go through (even if they fail authentication)
			assert.NotEqual(t, http.StatusTooManyRequests, w.Code, "Request %d should not be rate limited", i+1)
		} else {
			// 6th request should be rate limited
			assert.Equal(t, http.StatusTooManyRequests, w.Code, "Request %d should be rate limited", i+1)

			var response APIResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)
			assert.False(t, response.Success)
			assert.NotNil(t, response.Error)
			assert.Equal(t, "AUTH_RATE_LIMIT_EXCEEDED", response.Error.Code)
		}
	}
}

func TestAuthHandler_LogoutRateLimit(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	// Setup router with rate limiting
	gin.SetMode(gin.TestMode)
	router := gin.New()

	auth := router.Group("/api/auth")
	auth.Use(middleware.AuthRateLimitMiddleware())
	{
		auth.POST("/logout", authHandler.Logout)
	}

	// Mock expectations
	mockAuthService.On("Logout", mock.Anything, "test-access-token", "").Return(nil)

	// Make multiple logout requests rapidly to test rate limit
	for i := 0; i < 6; i++ {
		w := httptest.NewRecorder()
		httpReq, _ := http.NewRequest("POST", "/api/auth/logout", nil)
		httpReq.Header.Set("Authorization", "Bearer test-access-token")
		httpReq.Header.Set("X-Forwarded-For", "192.168.1.2") // Different IP from login test

		router.ServeHTTP(w, httpReq)

		if i < 5 {
			// First 5 requests should go through
			assert.NotEqual(t, http.StatusTooManyRequests, w.Code, "Request %d should not be rate limited", i+1)
		} else {
			// 6th request should be rate limited
			assert.Equal(t, http.StatusTooManyRequests, w.Code, "Request %d should be rate limited", i+1)

			var response APIResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)
			assert.False(t, response.Success)
			assert.NotNil(t, response.Error)
			assert.Equal(t, "AUTH_RATE_LIMIT_EXCEEDED", response.Error.Code)
		}
	}
}
