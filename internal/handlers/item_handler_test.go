package handlers

import (
	"bytes"
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

// MockItemService is a mock implementation of ItemService
type MockItemService struct {
	mock.Mock
}

func (m *MockItemService) SearchItems(ctx context.Context, query string, limit, skip int64) ([]*services.ItemResponse, error) {
	args := m.Called(ctx, query, limit, skip)
	return args.Get(0).([]*services.ItemResponse), args.Error(1)
}

func (m *MockItemService) FilterItems(ctx context.Context, status, priority string, startDate, endDate *time.Time, limit, skip int64) ([]*services.ItemResponse, error) {
	args := m.Called(ctx, status, priority, startDate, endDate, limit, skip)
	return args.Get(0).([]*services.ItemResponse), args.Error(1)
}

func (m *MockItemService) Create(ctx context.Context, userID, boardID primitive.ObjectID, req services.CreateItemRequest) (*services.ItemResponse, error) {
	args := m.Called(ctx, userID, boardID, req)
	return args.Get(0).(*services.ItemResponse), args.Error(1)
}

func (m *MockItemService) GetByID(ctx context.Context, userID, itemID primitive.ObjectID) (*services.ItemResponse, error) {
	args := m.Called(ctx, userID, itemID)
	return args.Get(0).(*services.ItemResponse), args.Error(1)
}

func (m *MockItemService) GetByBoardID(ctx context.Context, userID, boardID primitive.ObjectID) ([]*services.ItemResponse, error) {
	args := m.Called(ctx, userID, boardID)
	return args.Get(0).([]*services.ItemResponse), args.Error(1)
}

func (m *MockItemService) Update(ctx context.Context, userID, itemID primitive.ObjectID, req services.UpdateItemRequest) (*services.ItemResponse, error) {
	args := m.Called(ctx, userID, itemID, req)
	return args.Get(0).(*services.ItemResponse), args.Error(1)
}

func (m *MockItemService) Delete(ctx context.Context, userID, itemID primitive.ObjectID) error {
	args := m.Called(ctx, userID, itemID)
	return args.Error(0)
}

func (m *MockItemService) Move(ctx context.Context, userID, itemID primitive.ObjectID, req services.MoveItemRequest) (*services.ItemResponse, error) {
	args := m.Called(ctx, userID, itemID, req)
	return args.Get(0).(*services.ItemResponse), args.Error(1)
}

func (m *MockItemService) GetByAssignee(ctx context.Context, userID primitive.ObjectID) ([]*services.ItemResponse, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*services.ItemResponse), args.Error(1)
}

func setupItemTestRouter() (*gin.Engine, *MockItemService) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	mockService := &MockItemService{}
	handler := NewItemHandler(mockService)

	// Add auth middleware mock
	router.Use(func(c *gin.Context) {
		userID := primitive.NewObjectID()
		user := &auth.AuthenticatedUser{
			ID:    userID,
			Email: "test@example.com",
		}
		c.Set("user", user)
		c.Next()
	})

	// Setup routes
	api := router.Group("/api")
	{
		// Board item routes
		api.POST("/boards/:boardId/items", handler.CreateItem)
		api.GET("/boards/:boardId/items", handler.GetBoardItems)
		api.POST("/boards/:boardId/items/bulk", handler.BulkCreateItems)

		// Individual item routes
		items := api.Group("/items")
		{
			items.GET("/search", handler.SearchItems)
			items.GET("/filter", handler.FilterItems)
			items.GET("/my", handler.GetMyItems)
			items.GET("/:itemId", handler.GetItem)
			items.PUT("/:itemId", handler.UpdateItem)
			items.DELETE("/:itemId", handler.DeleteItem)
			items.POST("/:itemId/move", handler.MoveItem)
			items.PUT("/bulk", handler.BulkUpdateItems)
			items.DELETE("/bulk", handler.BulkDeleteItems)
		}
	}

	return router, mockService
}

func TestItemHandler_CreateItem(t *testing.T) {
	router, mockService := setupItemTestRouter()

	boardID := primitive.NewObjectID()
	itemID := primitive.NewObjectID()

	expectedItem := &services.ItemResponse{
		ID:      itemID.Hex(),
		Name:    "Test Item",
		BoardID: boardID.Hex(),
	}

	mockService.On("Create", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), boardID, mock.AnythingOfType("services.CreateItemRequest")).Return(expectedItem, nil)

	reqBody := services.CreateItemRequest{
		Name: "Test Item",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/boards/"+boardID.Hex()+"/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockService.AssertExpectations(t)
}

func TestItemHandler_GetItem(t *testing.T) {
	router, mockService := setupItemTestRouter()

	itemID := primitive.NewObjectID()

	expectedItem := &services.ItemResponse{
		ID:   itemID.Hex(),
		Name: "Test Item",
	}

	mockService.On("GetByID", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), itemID).Return(expectedItem, nil)

	req := httptest.NewRequest("GET", "/api/items/"+itemID.Hex(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockService.AssertExpectations(t)
}

func TestItemHandler_SearchItems(t *testing.T) {
	router, mockService := setupItemTestRouter()

	expectedItems := []*services.ItemResponse{
		{ID: primitive.NewObjectID().Hex(), Name: "Test Item 1"},
		{ID: primitive.NewObjectID().Hex(), Name: "Test Item 2"},
	}

	mockService.On("SearchItems", mock.Anything, "test", int64(20), int64(0)).Return(expectedItems, nil)

	req := httptest.NewRequest("GET", "/api/items/search?query=test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockService.AssertExpectations(t)
}

func TestItemHandler_FilterItems(t *testing.T) {
	router, mockService := setupItemTestRouter()

	expectedItems := []*services.ItemResponse{
		{ID: primitive.NewObjectID().Hex(), Name: "Test Item 1"},
	}

	mockService.On("FilterItems", mock.Anything, "active", "high", (*time.Time)(nil), (*time.Time)(nil), int64(20), int64(0)).Return(expectedItems, nil)

	req := httptest.NewRequest("GET", "/api/items/filter?status=active&priority=high", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockService.AssertExpectations(t)
}

func TestItemHandler_BulkCreateItems(t *testing.T) {
	router, mockService := setupItemTestRouter()

	boardID := primitive.NewObjectID()

	// Mock successful creation for both items
	item1 := &services.ItemResponse{ID: primitive.NewObjectID().Hex(), Name: "Item 1"}
	item2 := &services.ItemResponse{ID: primitive.NewObjectID().Hex(), Name: "Item 2"}

	mockService.On("Create", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), boardID, mock.MatchedBy(func(req services.CreateItemRequest) bool {
		return req.Name == "Item 1"
	})).Return(item1, nil)

	mockService.On("Create", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), boardID, mock.MatchedBy(func(req services.CreateItemRequest) bool {
		return req.Name == "Item 2"
	})).Return(item2, nil)

	reqBody := BulkCreateItemRequest{
		Items: []services.CreateItemRequest{
			{Name: "Item 1"},
			{Name: "Item 2"},
		},
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/boards/"+boardID.Hex()+"/items/bulk", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	success := data["success"].([]interface{})
	errors := data["errors"].([]interface{})

	assert.Len(t, success, 2)
	assert.Len(t, errors, 0)

	mockService.AssertExpectations(t)
}

func TestItemHandler_BulkUpdateItems(t *testing.T) {
	router, mockService := setupItemTestRouter()

	itemID1 := primitive.NewObjectID()
	itemID2 := primitive.NewObjectID()

	// Mock successful updates
	item1 := &services.ItemResponse{ID: itemID1.Hex(), Name: "Updated Item 1"}
	item2 := &services.ItemResponse{ID: itemID2.Hex(), Name: "Updated Item 2"}

	mockService.On("Update", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), itemID1, mock.AnythingOfType("services.UpdateItemRequest")).Return(item1, nil)
	mockService.On("Update", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), itemID2, mock.AnythingOfType("services.UpdateItemRequest")).Return(item2, nil)

	reqBody := BulkUpdateItemRequest{
		Items: []BulkUpdateItem{
			{ID: itemID1.Hex(), Data: services.UpdateItemRequest{Name: stringPtr("Updated Item 1")}},
			{ID: itemID2.Hex(), Data: services.UpdateItemRequest{Name: stringPtr("Updated Item 2")}},
		},
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", "/api/items/bulk", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockService.AssertExpectations(t)
}

func TestItemHandler_BulkDeleteItems(t *testing.T) {
	router, mockService := setupItemTestRouter()

	itemID1 := primitive.NewObjectID()
	itemID2 := primitive.NewObjectID()

	// Mock successful deletions
	mockService.On("Delete", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), itemID1).Return(nil)
	mockService.On("Delete", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), itemID2).Return(nil)

	reqBody := BulkDeleteItemRequest{
		ItemIDs: []string{itemID1.Hex(), itemID2.Hex()},
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("DELETE", "/api/items/bulk", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockService.AssertExpectations(t)
}

func TestItemHandler_GetMyItems(t *testing.T) {
	router, mockService := setupItemTestRouter()

	expectedItems := []*services.ItemResponse{
		{ID: primitive.NewObjectID().Hex(), Name: "My Item 1"},
		{ID: primitive.NewObjectID().Hex(), Name: "My Item 2"},
	}

	mockService.On("GetByAssignee", mock.Anything, mock.AnythingOfType("primitive.ObjectID")).Return(expectedItems, nil)

	req := httptest.NewRequest("GET", "/api/items/my", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockService.AssertExpectations(t)
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}
