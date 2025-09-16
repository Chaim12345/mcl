package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/database"
	"project-management-platform/internal/handlers"
	"project-management-platform/internal/middleware"
	"project-management-platform/internal/repository"
	"project-management-platform/internal/services"
)

// E2ETestSuite represents the end-to-end test suite
type E2ETestSuite struct {
	router     *gin.Engine
	client     *mongo.Client
	jwtManager *auth.JWTManager
	testUser   *TestUser
}

// TestUser represents a test user for E2E tests
type TestUser struct {
	ID       primitive.ObjectID `json:"id"`
	Email    string             `json:"email"`
	Password string             `json:"password"`
	Token    string             `json:"token"`
}

// SetupE2ETestSuite initializes the test environment
func SetupE2ETestSuite(t *testing.T) *E2ETestSuite {
	gin.SetMode(gin.TestMode)

	// Setup test database
	client, err := database.NewClient("mongodb://localhost:27017")
	require.NoError(t, err)

	db := client.Database("test_project_management_e2e")

	// Clean up test database
	err = db.Drop(context.Background())
	require.NoError(t, err)

	// Initialize repositories
	repos := &repository.Repositories{
		User:         repository.NewUserRepository(db),
		Workspace:    repository.NewWorkspaceRepository(db),
		Board:        repository.NewBoardRepository(db),
		Item:         repository.NewItemRepository(db),
		Comment:      repository.NewCommentRepository(db),
		Activity:     repository.NewActivityRepository(db),
		Notification: repository.NewNotificationRepository(db),
	}

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager("test-secret", time.Hour, 24*time.Hour)

	// Initialize services
	passwordHasher := auth.NewPasswordHasher()
	emailService := services.NewEmailService(services.EmailConfig{
		SMTPHost:     "localhost",
		SMTPPort:     587,
		SMTPUser:     "test@example.com",
		SMTPPassword: "password",
		FromAddress:  "test@example.com",
	}, nil)

	authService := services.NewAuthService(repos.User, jwtManager, passwordHasher, emailService)
	workspaceService := services.NewWorkspaceService(repos.Workspace, repos.User, emailService)
	boardService := services.NewBoardService(repos.Board, repos.Workspace, repos.User)
	itemService := services.NewItemService(repos.Item, repos.Board, repos.Workspace)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, nil)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceService)
	_ = handlers.NewBoardHandler(boardService)
	_ = handlers.NewItemHandler(itemService)

	// Setup router
	router := gin.New()
	router.Use(middleware.SecurityHeadersMiddleware())

	// Setup routes
	api := router.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(jwtManager))
		{
			// Workspace routes
			workspaces := protected.Group("/workspaces")
			{
				workspaces.POST("", workspaceHandler.CreateWorkspace)
				workspaces.GET("", workspaceHandler.GetUserWorkspaces)
			}
		}
	}

	return &E2ETestSuite{
		router:     router,
		client:     client,
		jwtManager: jwtManager,
	}
}

// CreateTestUser creates a test user and returns authentication token
func (suite *E2ETestSuite) CreateTestUser(t *testing.T) *TestUser {
	user := &TestUser{
		Email:    fmt.Sprintf("test-%d@example.com", time.Now().UnixNano()),
		Password: "TestPassword123!",
	}

	// Register user
	registerData := map[string]string{
		"email":    user.Email,
		"password": user.Password,
	}
	jsonData, _ := json.Marshal(registerData)

	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	// Login to get token
	loginData := map[string]string{
		"email":    user.Email,
		"password": user.Password,
	}
	jsonData, _ = json.Marshal(loginData)

	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var loginResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &loginResponse)
	require.NoError(t, err)

	data := loginResponse["data"].(map[string]interface{})
	user.Token = data["access_token"].(string)

	return user
}

// TestCompleteUserWorkflow tests the complete user workflow
func TestCompleteUserWorkflow(t *testing.T) {
	suite := SetupE2ETestSuite(t)
	defer func() {
		if suite.client != nil {
			suite.client.Disconnect(context.Background())
		}
	}()

	// Step 1: Create test user
	user := suite.CreateTestUser(t)
	assert.NotEmpty(t, user.Token)

	// Step 2: Create workspace
	workspaceData := map[string]string{
		"name":        "Test Workspace",
		"description": "A test workspace",
	}
	jsonData, _ := json.Marshal(workspaceData)

	req := httptest.NewRequest("POST", "/api/workspaces", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+user.Token)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	// Step 3: Get user workspaces
	req = httptest.NewRequest("GET", "/api/workspaces", nil)
	req.Header.Set("Authorization", "Bearer "+user.Token)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	t.Log("Successfully completed user workflow: user created, workspace created and retrieved")
}

// TestAuthenticationFlow tests the complete authentication flow
func TestAuthenticationFlow(t *testing.T) {
	suite := SetupE2ETestSuite(t)
	defer func() {
		if suite.client != nil {
			suite.client.Disconnect(context.Background())
		}
	}()

	testEmail := fmt.Sprintf("auth-test-%d@example.com", time.Now().UnixNano())
	testPassword := "AuthTest123!"

	// Test registration
	registerData := map[string]string{
		"email":    testEmail,
		"password": testPassword,
	}
	jsonData, _ := json.Marshal(registerData)

	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	// Test login
	loginData := map[string]string{
		"email":    testEmail,
		"password": testPassword,
	}
	jsonData, _ = json.Marshal(loginData)

	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var loginResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &loginResponse)
	require.NoError(t, err)

	data := loginResponse["data"].(map[string]interface{})
	token := data["access_token"].(string)
	assert.NotEmpty(t, token)

	// Test protected endpoint with token
	req = httptest.NewRequest("GET", "/api/workspaces", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Test protected endpoint without token (should fail)
	req = httptest.NewRequest("GET", "/api/workspaces", nil)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	t.Log("Authentication flow test completed successfully")
}
