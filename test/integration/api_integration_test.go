package integration

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
	"github.com/stretchr/testify/suite"
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/database"
	"project-management-platform/internal/handlers"
	"project-management-platform/internal/middleware"
	"project-management-platform/internal/repository"
	"project-management-platform/internal/services"
)

// APIIntegrationTestSuite represents the integration test suite
type APIIntegrationTestSuite struct {
	suite.Suite
	router      *gin.Engine
	client      *mongo.Client
	testToken   string
	workspaceID string
	boardID     string
	itemID      string
}

// SetupSuite initializes the test suite
func (suite *APIIntegrationTestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)

	// Setup test database
	client, err := database.NewClient("mongodb://localhost:27017")
	suite.Require().NoError(err)

	db := client.Database("test_integration_" + fmt.Sprintf("%d", time.Now().UnixNano()))

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
	itemHandler := handlers.NewItemHandler(itemService)

	// Setup router
	router := gin.New()
	router.Use(middleware.SecurityHeadersMiddleware())

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

			// Item routes
			items := protected.Group("/items")
			{
				items.POST("", itemHandler.CreateItem)
				items.GET("/:itemId", itemHandler.GetItem)
			}
		}
	}

	suite.router = router
	suite.client = client

	// Create test user and get token
	suite.createTestUser()
}

// TearDownSuite cleans up after tests
func (suite *APIIntegrationTestSuite) TearDownSuite() {
	if suite.client != nil {
		suite.client.Disconnect(context.Background())
	}
}

// createTestUser creates a test user and gets authentication token
func (suite *APIIntegrationTestSuite) createTestUser() {
	testEmail := fmt.Sprintf("integration-test-%d@example.com", time.Now().UnixNano())
	testPassword := "IntegrationTest123!"

	// Register user
	registerData := map[string]string{
		"email":    testEmail,
		"password": testPassword,
	}
	jsonData, _ := json.Marshal(registerData)

	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Require().Equal(http.StatusCreated, w.Code)

	// Login to get token
	loginData := map[string]string{
		"email":    testEmail,
		"password": testPassword,
	}
	jsonData, _ = json.Marshal(loginData)

	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Require().Equal(http.StatusOK, w.Code)

	var loginResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &loginResponse)
	suite.Require().NoError(err)

	data := loginResponse["data"].(map[string]interface{})
	suite.testToken = data["access_token"].(string)
}

// TestAuthEndpoints tests authentication endpoints
func (suite *APIIntegrationTestSuite) TestAuthEndpoints() {
	// Test registration with invalid data
	invalidData := map[string]string{
		"email":    "invalid-email",
		"password": "weak",
	}
	jsonData, _ := json.Marshal(invalidData)

	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Assert().Equal(http.StatusBadRequest, w.Code)

	// Test login with invalid credentials
	invalidLogin := map[string]string{
		"email":    "nonexistent@example.com",
		"password": "wrongpassword",
	}
	jsonData, _ = json.Marshal(invalidLogin)

	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Assert().Equal(http.StatusUnauthorized, w.Code)
}

// TestWorkspaceEndpoints tests workspace endpoints
func (suite *APIIntegrationTestSuite) TestWorkspaceEndpoints() {
	// Create workspace
	workspaceData := map[string]string{
		"name":        "Integration Test Workspace",
		"description": "Testing workspace endpoints",
	}
	jsonData, _ := json.Marshal(workspaceData)

	req := httptest.NewRequest("POST", "/api/workspaces", bytes.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+suite.testToken)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Assert().Equal(http.StatusCreated, w.Code)

	// List workspaces
	req = httptest.NewRequest("GET", "/api/workspaces", nil)
	req.Header.Set("Authorization", "Bearer "+suite.testToken)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Assert().Equal(http.StatusOK, w.Code)
}

// TestUnauthorizedAccess tests that endpoints require authentication
func (suite *APIIntegrationTestSuite) TestUnauthorizedAccess() {
	endpoints := []struct {
		method string
		path   string
	}{
		{"GET", "/api/workspaces"},
		{"POST", "/api/workspaces"},
		{"GET", "/api/items/123"},
		{"POST", "/api/items"},
	}

	for _, endpoint := range endpoints {
		req := httptest.NewRequest(endpoint.method, endpoint.path, nil)
		w := httptest.NewRecorder()

		suite.router.ServeHTTP(w, req)
		suite.Assert().Equal(http.StatusUnauthorized, w.Code,
			"Endpoint %s %s should require authentication", endpoint.method, endpoint.path)
	}
}

// TestSecurityHeaders tests that security headers are set
func (suite *APIIntegrationTestSuite) TestSecurityHeaders() {
	req := httptest.NewRequest("GET", "/api/workspaces", nil)
	req.Header.Set("Authorization", "Bearer "+suite.testToken)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	// Check security headers
	suite.Assert().Equal("nosniff", w.Header().Get("X-Content-Type-Options"))
	suite.Assert().Equal("DENY", w.Header().Get("X-Frame-Options"))
	suite.Assert().Equal("1; mode=block", w.Header().Get("X-XSS-Protection"))
	suite.Assert().Equal("strict-origin-when-cross-origin", w.Header().Get("Referrer-Policy"))
	suite.Assert().Empty(w.Header().Get("Server"))
}

// TestAPIIntegrationSuite runs the integration test suite
func TestAPIIntegrationSuite(t *testing.T) {
	suite.Run(t, new(APIIntegrationTestSuite))
}
