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
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/services"
)

// Integration test for item API endpoints
func TestItemAPIIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create test data
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()
	itemID := primitive.NewObjectID()

	// Mock service
	mockService := &MockItemService{}
	handler := NewItemHandler(mockService)

	// Setup router
	router := gin.New()
	router.Use(func(c *gin.Context) {
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

	t.Run("Create Item", func(t *testing.T) {
		expectedItem := &services.ItemResponse{
			ID:       itemID.Hex(),
			Name:     "Test Item",
			BoardID:  boardID.Hex(),
			Position: 0,
			FieldValues: map[string]interface{}{
				"status": "To Do",
			},
			Assignees: []string{},
			Watchers:  []string{userID.Hex()},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			CreatedBy: userID.Hex(),
		}

		mockService.On("Create", context.Background(), userID, boardID, services.CreateItemRequest{
			Name: "Test Item",
			FieldValues: map[string]interface{}{
				"status": "To Do",
			},
		}).Return(expectedItem, nil)

		reqBody := services.CreateItemRequest{
			Name: "Test Item",
			FieldValues: map[string]interface{}{
				"status": "To Do",
			},
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

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "Test Item", data["name"])
		assert.Equal(t, boardID.Hex(), data["boardId"])
	})

	t.Run("Get Board Items", func(t *testing.T) {
		expectedItems := []*services.ItemResponse{
			{
				ID:       itemID.Hex(),
				Name:     "Test Item",
				BoardID:  boardID.Hex(),
				Position: 0,
			},
		}

		mockService.On("GetByBoardID", context.Background(), userID, boardID).Return(expectedItems, nil)

		req := httptest.NewRequest("GET", "/api/boards/"+boardID.Hex()+"/items", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))

		data := response["data"].([]interface{})
		assert.Len(t, data, 1)
	})

	t.Run("Search Items", func(t *testing.T) {
		expectedItems := []*services.ItemResponse{
			{
				ID:   itemID.Hex(),
				Name: "Test Item",
			},
		}

		mockService.On("SearchItems", context.Background(), "test", int64(20), int64(0)).Return(expectedItems, nil)

		req := httptest.NewRequest("GET", "/api/items/search?query=test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
	})

	t.Run("Filter Items", func(t *testing.T) {
		expectedItems := []*services.ItemResponse{
			{
				ID:   itemID.Hex(),
				Name: "Test Item",
			},
		}

		mockService.On("FilterItems", context.Background(), "active", "high", (*time.Time)(nil), (*time.Time)(nil), int64(20), int64(0)).Return(expectedItems, nil)

		req := httptest.NewRequest("GET", "/api/items/filter?status=active&priority=high", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
	})

	t.Run("Update Item", func(t *testing.T) {
		updatedItem := &services.ItemResponse{
			ID:   itemID.Hex(),
			Name: "Updated Item",
		}

		updateReq := services.UpdateItemRequest{
			Name: stringPtr("Updated Item"),
		}

		mockService.On("Update", context.Background(), userID, itemID, updateReq).Return(updatedItem, nil)

		body, _ := json.Marshal(updateReq)
		req := httptest.NewRequest("PUT", "/api/items/"+itemID.Hex(), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
	})

	t.Run("Delete Item", func(t *testing.T) {
		mockService.On("Delete", context.Background(), userID, itemID).Return(nil)

		req := httptest.NewRequest("DELETE", "/api/items/"+itemID.Hex(), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)

		// StatusNoContent typically returns empty body, so only parse JSON if body is not empty
		if w.Body.Len() > 0 {
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)
			assert.True(t, response["success"].(bool))
		}
	})

	t.Run("Move Item", func(t *testing.T) {
		movedItem := &services.ItemResponse{
			ID:       itemID.Hex(),
			Name:     "Test Item",
			Position: 2,
		}

		moveReq := services.MoveItemRequest{
			Position: 2,
		}

		mockService.On("Move", context.Background(), userID, itemID, moveReq).Return(movedItem, nil)

		body, _ := json.Marshal(moveReq)
		req := httptest.NewRequest("POST", "/api/items/"+itemID.Hex()+"/move", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))

		data := response["data"].(map[string]interface{})
		assert.Equal(t, float64(2), data["position"]) // JSON numbers are float64
	})

	t.Run("Get My Items", func(t *testing.T) {
		expectedItems := []*services.ItemResponse{
			{
				ID:   itemID.Hex(),
				Name: "My Item",
			},
		}

		mockService.On("GetByAssignee", context.Background(), userID).Return(expectedItems, nil)

		req := httptest.NewRequest("GET", "/api/items/my", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
	})

	t.Run("Bulk Create Items", func(t *testing.T) {
		item1 := &services.ItemResponse{ID: primitive.NewObjectID().Hex(), Name: "Item 1"}
		item2 := &services.ItemResponse{ID: primitive.NewObjectID().Hex(), Name: "Item 2"}

		mockService.On("Create", context.Background(), userID, boardID, services.CreateItemRequest{Name: "Item 1"}).Return(item1, nil)
		mockService.On("Create", context.Background(), userID, boardID, services.CreateItemRequest{Name: "Item 2"}).Return(item2, nil)

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
	})
}

// Test error handling
func TestItemAPIErrorHandling(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockItemService{}
	handler := NewItemHandler(mockService)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		user := &auth.AuthenticatedUser{
			ID:    primitive.NewObjectID(),
			Email: "test@example.com",
		}
		c.Set("user", user)
		c.Next()
	})

	api := router.Group("/api")
	{
		api.GET("/items/search", handler.SearchItems)
		api.GET("/items/:itemId", handler.GetItem)
	}

	t.Run("Search without query parameter", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/items/search", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response["success"].(bool))

		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, "INVALID_REQUEST", errorData["code"])
	})

	t.Run("Get item with invalid ID", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/items/invalid-id", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response["success"].(bool))

		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, "INVALID_ID", errorData["code"])
	})
}
