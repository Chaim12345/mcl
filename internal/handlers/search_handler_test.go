package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/services"
)

// MockSearchService is a mock implementation of SearchService
type MockSearchService struct {
	mock.Mock
}

func (m *MockSearchService) SearchItems(ctx context.Context, options services.SearchOptions) ([]services.SearchResult, int64, error) {
	args := m.Called(ctx, options)
	return args.Get(0).([]services.SearchResult), args.Get(1).(int64), args.Error(2)
}

func (m *MockSearchService) SearchComments(ctx context.Context, options services.SearchOptions) ([]services.SearchResult, int64, error) {
	args := m.Called(ctx, options)
	return args.Get(0).([]services.SearchResult), args.Get(1).(int64), args.Error(2)
}

func (m *MockSearchService) SearchBoards(ctx context.Context, options services.SearchOptions) ([]services.SearchResult, int64, error) {
	args := m.Called(ctx, options)
	return args.Get(0).([]services.SearchResult), args.Get(1).(int64), args.Error(2)
}

func TestSearchHandler_SearchItems(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockSearchService := &MockSearchService{}
	cacheService := services.NewCacheService(5*time.Minute, 100)
	mockJwtManager := auth.NewJWTManager("test-secret", time.Hour, time.Hour*24)
	handler := NewSearchHandler(mockSearchService, cacheService, mockJwtManager)

	workspaceID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	// Mock search result
	mockResults := []services.SearchResult{
		{ID: primitive.NewObjectID(), Title: "Test Item 1"},
		{ID: primitive.NewObjectID(), Title: "Test Item 2"},
	}
	var mockTotal int64 = 2

	// Set up mock expectations
	mockSearchService.On("SearchItems", mock.Anything, mock.MatchedBy(func(options services.SearchOptions) bool {
		return options.WorkspaceID == workspaceID &&
			len(options.BoardIDs) == 1 &&
			options.BoardIDs[0] == boardID &&
			options.Limit == 20 &&
			options.Skip == 0
	})).Return(mockResults, mockTotal, nil)

	// Create test request
	router := gin.New()
	router.GET("/search/items", handler.SearchItems)

	req := httptest.NewRequest("GET", "/search/items?q=test+query&workspace_id="+workspaceID.Hex()+"&board_ids="+boardID.Hex()+"&limit=20&skip=0", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response SearchResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.True(t, response.Success)
	assert.Equal(t, 2, len(response.Data.Items))
	assert.Equal(t, int64(2), response.Data.TotalCount)
	assert.False(t, response.Data.HasMore)
	assert.Equal(t, "test query", response.Meta.Query)
	assert.Equal(t, "item", response.Meta.EntityType)
	assert.False(t, response.Meta.Cached)

	mockSearchService.AssertExpectations(t)
}

func TestSearchHandler_SearchItems_Cached(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockSearchService := &MockSearchService{}
	cacheService := services.NewCacheService(5*time.Minute, 100)
	mockJwtManager := auth.NewJWTManager("test-secret", time.Hour, time.Hour*24)
	handler := NewSearchHandler(mockSearchService, cacheService, mockJwtManager)

	workspaceID := primitive.NewObjectID()

	// Pre-populate cache
	mockResult := &services.SearchResults{
		Results: []services.SearchResult{
			{ID: primitive.NewObjectID(), Title: "Cached Item"},
		},
		TotalCount: 1,
		HasMore:    false,
		Limit:      20,
		Skip:       0,
		TimeTaken:  10 * time.Millisecond,
	}

	req := &SearchRequest{
		Query:       "cached query",
		WorkspaceID: workspaceID.Hex(),
		Limit:       20,
		Skip:        0,
		SortOrder:   "desc",
	}

	cacheService.SetSearchResult("item", req.Query, req, mockResult)

	// Create test request
	router := gin.New()
	router.GET("/search/items", handler.SearchItems)

	httpReq := httptest.NewRequest("GET", "/search/items?q=cached+query&workspace_id="+workspaceID.Hex()+"&limit=20&skip=0", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, httpReq)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response SearchResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.True(t, response.Success)
	assert.Equal(t, 1, len(response.Data.Items))
	assert.Equal(t, "cached query", response.Meta.Query)
	assert.True(t, response.Meta.Cached)

	// Search service should not have been called
	mockSearchService.AssertNotCalled(t, "SearchItems", mock.Anything, mock.Anything)
}

func TestSearchHandler_SearchItems_InvalidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockSearchService := &MockSearchService{}
	cacheService := services.NewCacheService(5*time.Minute, 100)
	mockJwtManager := auth.NewJWTManager("test-secret", time.Hour, time.Hour*24)
	handler := NewSearchHandler(mockSearchService, cacheService, mockJwtManager)

	// Create test request without required parameters
	router := gin.New()
	router.GET("/search/items", handler.SearchItems)

	req := httptest.NewRequest("GET", "/search/items", nil) // Missing query and workspace_id
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Assert error response
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.False(t, response["success"].(bool))
	assert.Contains(t, response, "error")

	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "INVALID_REQUEST", errorObj["code"])
}

func TestSearchHandler_SearchItems_InvalidWorkspaceID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockSearchService := &MockSearchService{}
	cacheService := services.NewCacheService(5*time.Minute, 100)
	mockJwtManager := auth.NewJWTManager("test-secret", time.Hour, time.Hour*24)
	handler := NewSearchHandler(mockSearchService, cacheService, mockJwtManager)

	// Create test request with invalid workspace ID
	router := gin.New()
	router.GET("/search/items", handler.SearchItems)

	req := httptest.NewRequest("GET", "/search/items?q=test&workspace_id=invalid", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Assert error response
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.False(t, response["success"].(bool))
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "INVALID_WORKSPACE_ID", errorObj["code"])
}

func TestSearchHandler_parseSearchRequest(t *testing.T) {
	handler := &SearchHandler{}

	tests := []struct {
		name        string
		queryParams string
		expectError bool
		checkResult func(*SearchRequest) bool
	}{
		{
			name:        "valid request",
			queryParams: "q=test&workspace_id=" + primitive.NewObjectID().Hex() + "&limit=10&skip=5",
			expectError: false,
			checkResult: func(req *SearchRequest) bool {
				return req.Query == "test" && req.Limit == 10 && req.Skip == 5
			},
		},
		{
			name:        "missing query",
			queryParams: "workspace_id=" + primitive.NewObjectID().Hex(),
			expectError: true,
		},
		{
			name:        "missing workspace_id",
			queryParams: "q=test",
			expectError: true,
		},
		{
			name:        "default values",
			queryParams: "q=test&workspace_id=" + primitive.NewObjectID().Hex(),
			expectError: false,
			checkResult: func(req *SearchRequest) bool {
				return req.Limit == 20 && req.Skip == 0 && req.SortOrder == "desc"
			},
		},
		{
			name:        "limit too high",
			queryParams: "q=test&workspace_id=" + primitive.NewObjectID().Hex() + "&limit=200",
			expectError: false,
			checkResult: func(req *SearchRequest) bool {
				return req.Limit == 20 // Should be capped at default
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a mock Gin context
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/?"+tt.queryParams, nil)

			req, err := handler.parseSearchRequest(c)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.checkResult != nil {
					assert.True(t, tt.checkResult(req))
				}
			}
		})
	}
}
