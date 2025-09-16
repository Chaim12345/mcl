package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// MockAuthService is a mock implementation of AuthService
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Register(ctx context.Context, req services.RegisterRequest) (*services.AuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.AuthResponse), args.Error(1)
}

func (m *MockAuthService) Login(ctx context.Context, req services.LoginRequest) (*services.AuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.AuthResponse), args.Error(1)
}

func (m *MockAuthService) Logout(ctx context.Context, accessToken, refreshToken string) error {
	args := m.Called(ctx, accessToken, refreshToken)
	return args.Error(0)
}

func (m *MockAuthService) RefreshToken(ctx context.Context, req services.RefreshTokenRequest) (*services.AuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.AuthResponse), args.Error(1)
}

func (m *MockAuthService) ForgotPassword(ctx context.Context, req services.ForgotPasswordRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockAuthService) ResetPassword(ctx context.Context, req services.ResetPasswordRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockAuthService) VerifyEmail(ctx context.Context, req services.VerifyEmailRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func setupTestRouter(authHandler *AuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	auth := router.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", authHandler.Logout)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
		auth.POST("/verify-email", authHandler.VerifyEmail)
	}

	return router
}

func TestAuthHandler_Register_Success(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Test data
	req := services.RegisterRequest{
		Email:     "test@example.com",
		Password:  "TestPassword123!",
		FirstName: "John",
		LastName:  "Doe",
	}

	user := &models.User{
		ID:        primitive.NewObjectID(),
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
	}

	authResponse := &services.AuthResponse{
		User:         user,
		AccessToken:  "access-token",
		RefreshToken: "refresh-token",
	}

	// Mock expectations
	mockAuthService.On("Register", mock.Anything, req).Return(authResponse, nil)

	// Create request
	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)
	assert.NotNil(t, response.Data)

	mockAuthService.AssertExpectations(t)
}

func TestAuthHandler_Register_ValidationError(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Test data with invalid email
	req := map[string]interface{}{
		"email":     "invalid-email",
		"password":  "TestPassword123!",
		"firstName": "John",
		"lastName":  "Doe",
	}

	// Create request
	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.False(t, response.Success)
	assert.NotNil(t, response.Error)
	assert.Equal(t, "VALIDATION_ERROR", response.Error.Code)

	mockAuthService.AssertNotCalled(t, "Register")
}

func TestAuthHandler_Login_Success(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Test data
	req := services.LoginRequest{
		Email:    "test@example.com",
		Password: "TestPassword123!",
	}

	user := &models.User{
		ID:        primitive.NewObjectID(),
		Email:     req.Email,
		FirstName: "John",
		LastName:  "Doe",
	}

	authResponse := &services.AuthResponse{
		User:         user,
		AccessToken:  "access-token",
		RefreshToken: "refresh-token",
	}

	// Mock expectations
	mockAuthService.On("Login", mock.Anything, req).Return(authResponse, nil)

	// Create request
	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)
	assert.NotNil(t, response.Data)

	mockAuthService.AssertExpectations(t)
}

func TestAuthHandler_Login_InvalidCredentials(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Test data
	req := services.LoginRequest{
		Email:    "test@example.com",
		Password: "wrongpassword",
	}

	// Mock expectations
	mockAuthService.On("Login", mock.Anything, req).Return(nil, assert.AnError)

	// Create request
	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.False(t, response.Success)
	assert.NotNil(t, response.Error)
	assert.Equal(t, "INVALID_CREDENTIALS", response.Error.Code)

	mockAuthService.AssertExpectations(t)
}

func TestAuthHandler_Logout_Success(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Mock expectations
	mockAuthService.On("Logout", mock.Anything, "test-access-token", "test-refresh-token").Return(nil)

	// Create request
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/logout", nil)
	httpReq.Header.Set("Authorization", "Bearer test-access-token")
	httpReq.Header.Set("X-Refresh-Token", "test-refresh-token")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	mockAuthService.AssertExpectations(t)
}

func TestAuthHandler_ForgotPassword_Success(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Test data
	req := services.ForgotPasswordRequest{
		Email: "test@example.com",
	}

	// Mock expectations
	mockAuthService.On("ForgotPassword", mock.Anything, req).Return(nil)

	// Create request
	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/forgot-password", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	mockAuthService.AssertExpectations(t)
}

func TestAuthHandler_ResetPassword_Success(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Test data
	req := services.ResetPasswordRequest{
		Token:    "reset-token",
		Password: "NewPassword123!",
	}

	// Mock expectations
	mockAuthService.On("ResetPassword", mock.Anything, req).Return(nil)

	// Create request
	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/reset-password", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	mockAuthService.AssertExpectations(t)
}

func TestAuthHandler_RefreshToken_Success(t *testing.T) {
	// Setup
	mockAuthService := new(MockAuthService)
	logger := logrus.New()
	logger.SetOutput(os.Stdout)
	authHandler := &AuthHandler{
		authService: mockAuthService,
		logger:      logger,
	}

	router := setupTestRouter(authHandler)

	// Test data
	req := services.RefreshTokenRequest{
		RefreshToken: "refresh-token",
	}

	user := &models.User{
		ID:        primitive.NewObjectID(),
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
	}

	authResponse := &services.AuthResponse{
		User:         user,
		AccessToken:  "new-access-token",
		RefreshToken: "refresh-token",
	}

	// Mock expectations
	mockAuthService.On("RefreshToken", mock.Anything, req).Return(authResponse, nil)

	// Create request
	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/auth/refresh", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	router.ServeHTTP(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)
	assert.NotNil(t, response.Data)

	mockAuthService.AssertExpectations(t)
}
func (m *MockAuthService) ValidateToken(tokenString string) (*auth.Claims, error) {
	args := m.Called(tokenString)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.Claims), args.Error(1)
}

func (m *MockAuthService) CleanupExpiredTokens() {
	m.Called()
}
