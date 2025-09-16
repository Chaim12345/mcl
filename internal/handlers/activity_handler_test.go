package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// Mock activity service for testing
type mockActivityService struct {
	mock.Mock
}

func (m *mockActivityService) ListActivitiesByEntity(ctx context.Context, entityType string, entityID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	args := m.Called(ctx, entityType, entityID, limit, skip)
	return args.Get(0).([]*models.Activity), args.Error(1)
}

func (m *mockActivityService) ListActivitiesByUser(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	args := m.Called(ctx, userID, limit, skip)
	return args.Get(0).([]*models.Activity), args.Error(1)
}

func (m *mockActivityService) GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	args := m.Called(ctx, workspaceID, limit, skip)
	return args.Get(0).([]*models.Activity), args.Error(1)
}

func (m *mockActivityService) GetActivityTimeline(ctx context.Context, filter services.ActivityFilter) (*services.ActivityTimeline, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.ActivityTimeline), args.Error(1)
}

func (m *mockActivityService) GetRecentActivity(ctx context.Context, workspaceID primitive.ObjectID, hours int, limit int64) ([]*models.Activity, error) {
	args := m.Called(ctx, workspaceID, hours, limit)
	return args.Get(0).([]*models.Activity), args.Error(1)
}

func (m *mockActivityService) GetActivityStats(ctx context.Context, workspaceID primitive.ObjectID, days int) (*services.ActivityStats, error) {
	args := m.Called(ctx, workspaceID, days)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.ActivityStats), args.Error(1)
}

func (m *mockActivityService) GetUserActivitySummary(ctx context.Context, userID primitive.ObjectID, days int) (*services.UserActivitySummary, error) {
	args := m.Called(ctx, userID, days)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.UserActivitySummary), args.Error(1)
}

func (m *mockActivityService) GetActivityByID(ctx context.Context, id primitive.ObjectID) (*models.Activity, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Activity), args.Error(1)
}

func setupActivityTestRouter() (*gin.Engine, *mockActivityService) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	mockService := new(mockActivityService)
	handler := NewActivityHandler(mockService)

	// Add middleware to set userID in context
	router.Use(func(c *gin.Context) {
		userID := primitive.NewObjectID()
		c.Set("userID", userID)
		c.Next()
	})

	// Setup routes
	api := router.Group("/api")
	{
		api.GET("/items/:itemId/activity", handler.GetItemActivity)
		api.GET("/boards/:boardId/activity", handler.GetBoardActivity)
		api.GET("/workspaces/:workspaceId/activity", handler.GetWorkspaceActivity)
		api.GET("/activity", handler.GetUserActivity)
		api.GET("/activity/timeline", handler.GetActivityTimeline)
		api.GET("/activity/recent", handler.GetRecentActivity)
		api.GET("/activity/stats", handler.GetActivityStats)
		api.GET("/activity/:activityId", handler.GetActivity)
		api.GET("/users/:userId/activity/summary", handler.GetUserActivitySummary)
	}

	return router, mockService
}

func TestActivityHandler_GetItemActivity(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	itemID := primitive.NewObjectID()
	activities := []*models.Activity{
		{
			ID:         primitive.NewObjectID(),
			Type:       "item_created",
			EntityType: "item",
			EntityID:   itemID,
		},
		{
			ID:         primitive.NewObjectID(),
			Type:       "item_updated",
			EntityType: "item",
			EntityID:   itemID,
		},
	}

	mockService.On("ListActivitiesByEntity", mock.Anything, "item", itemID, int64(20), int64(0)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/items/"+itemID.Hex()+"/activity", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetBoardActivity(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	boardID := primitive.NewObjectID()
	activities := []*models.Activity{
		{
			ID:         primitive.NewObjectID(),
			Type:       "board_created",
			EntityType: "board",
			EntityID:   boardID,
		},
	}

	mockService.On("ListActivitiesByEntity", mock.Anything, "board", boardID, int64(20), int64(0)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/boards/"+boardID.Hex()+"/activity", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetWorkspaceActivity(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	workspaceID := primitive.NewObjectID()
	activities := []*models.Activity{
		{
			ID:          primitive.NewObjectID(),
			Type:        "workspace_created",
			EntityType:  "workspace",
			EntityID:    workspaceID,
			WorkspaceID: workspaceID,
		},
	}

	mockService.On("GetByWorkspaceID", mock.Anything, workspaceID, int64(20), int64(0)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/workspaces/"+workspaceID.Hex()+"/activity", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetUserActivity(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	activities := []*models.Activity{
		{
			ID:   primitive.NewObjectID(),
			Type: "item_created",
		},
		{
			ID:   primitive.NewObjectID(),
			Type: "comment_added",
		},
	}

	mockService.On("ListActivitiesByUser", mock.Anything, mock.AnythingOfType("primitive.ObjectID"), int64(20), int64(0)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/activity", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetActivityTimeline(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	workspaceID := primitive.NewObjectID()
	timeline := &services.ActivityTimeline{
		Activities: []*models.Activity{
			{
				ID:          primitive.NewObjectID(),
				Type:        "item_created",
				WorkspaceID: workspaceID,
			},
		},
		TotalCount: 1,
		HasMore:    false,
	}

	mockService.On("GetActivityTimeline", mock.Anything, mock.MatchedBy(func(filter services.ActivityFilter) bool {
		return !filter.WorkspaceID.IsZero() && filter.WorkspaceID == workspaceID &&
			filter.Limit == 20 && filter.Skip == 0
	})).Return(timeline, nil)

	req, _ := http.NewRequest("GET", "/api/activity/timeline?workspaceId="+workspaceID.Hex(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetRecentActivity(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	workspaceID := primitive.NewObjectID()
	activities := []*models.Activity{
		{
			ID:          primitive.NewObjectID(),
			Type:        "item_updated",
			WorkspaceID: workspaceID,
		},
	}

	mockService.On("GetRecentActivity", mock.Anything, workspaceID, 24, int64(50)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/activity/recent?workspaceId="+workspaceID.Hex(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetRecentActivity_WithCustomParams(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	workspaceID := primitive.NewObjectID()
	activities := []*models.Activity{
		{
			ID:          primitive.NewObjectID(),
			Type:        "item_updated",
			WorkspaceID: workspaceID,
		},
	}

	mockService.On("GetRecentActivity", mock.Anything, workspaceID, 48, int64(25)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/activity/recent?workspaceId="+workspaceID.Hex()+"&hours=48&limit=25", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetActivityStats(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	workspaceID := primitive.NewObjectID()
	stats := &services.ActivityStats{
		TotalActivities: 100,
		ActivitiesByType: map[string]int64{
			"item_created":  50,
			"item_updated":  30,
			"comment_added": 20,
		},
		ActivitiesByUser: map[string]int64{
			"user1": 60,
			"user2": 40,
		},
		DailyActivity: []services.DailyActivityCount{
			{Date: "2024-01-01", Count: 10},
			{Date: "2024-01-02", Count: 15},
		},
	}

	mockService.On("GetActivityStats", mock.Anything, workspaceID, 30).Return(stats, nil)

	req, _ := http.NewRequest("GET", "/api/activity/stats?workspaceId="+workspaceID.Hex(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetActivityStats_WithCustomDays(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	workspaceID := primitive.NewObjectID()
	stats := &services.ActivityStats{
		TotalActivities: 50,
	}

	mockService.On("GetActivityStats", mock.Anything, workspaceID, 7).Return(stats, nil)

	req, _ := http.NewRequest("GET", "/api/activity/stats?workspaceId="+workspaceID.Hex()+"&days=7", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetUserActivitySummary(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	userID := primitive.NewObjectID()
	summary := &services.UserActivitySummary{
		UserID:          userID,
		TotalActivities: 25,
		ActivitiesByType: map[string]int64{
			"item_created":  10,
			"comment_added": 15,
		},
		DailyActivity: []services.DailyActivityCount{
			{Date: "2024-01-01", Count: 5},
			{Date: "2024-01-02", Count: 8},
		},
	}

	mockService.On("GetUserActivitySummary", mock.Anything, userID, 30).Return(summary, nil)

	req, _ := http.NewRequest("GET", "/api/users/"+userID.Hex()+"/activity/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetUserActivitySummary_WithCustomDays(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	userID := primitive.NewObjectID()
	summary := &services.UserActivitySummary{
		UserID:          userID,
		TotalActivities: 10,
	}

	mockService.On("GetUserActivitySummary", mock.Anything, userID, 14).Return(summary, nil)

	req, _ := http.NewRequest("GET", "/api/users/"+userID.Hex()+"/activity/summary?days=14", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetActivity(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	activityID := primitive.NewObjectID()
	activity := &models.Activity{
		ID:   activityID,
		Type: "item_created",
	}

	mockService.On("GetActivityByID", mock.Anything, activityID).Return(activity, nil)

	req, _ := http.NewRequest("GET", "/api/activity/"+activityID.Hex(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_GetRecentActivity_MissingWorkspaceID(t *testing.T) {
	router, _ := setupActivityTestRouter()

	req, _ := http.NewRequest("GET", "/api/activity/recent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestActivityHandler_GetActivityStats_MissingWorkspaceID(t *testing.T) {
	router, _ := setupActivityTestRouter()

	req, _ := http.NewRequest("GET", "/api/activity/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestActivityHandler_InvalidObjectID(t *testing.T) {
	router, _ := setupActivityTestRouter()

	req, _ := http.NewRequest("GET", "/api/items/invalid-id/activity", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestActivityHandler_PaginationParams(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	itemID := primitive.NewObjectID()
	activities := []*models.Activity{}

	mockService.On("ListActivitiesByEntity", mock.Anything, "item", itemID, int64(10), int64(5)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/items/"+itemID.Hex()+"/activity?limit=10&skip=5", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_PaginationParams_InvalidValues(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	itemID := primitive.NewObjectID()
	activities := []*models.Activity{}

	// Should use default values when invalid params are provided
	mockService.On("ListActivitiesByEntity", mock.Anything, "item", itemID, int64(20), int64(0)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/items/"+itemID.Hex()+"/activity?limit=invalid&skip=negative", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestActivityHandler_PaginationParams_LimitTooHigh(t *testing.T) {
	router, mockService := setupActivityTestRouter()

	itemID := primitive.NewObjectID()
	activities := []*models.Activity{}

	// Should use default limit of 20 when limit is too high
	mockService.On("ListActivitiesByEntity", mock.Anything, "item", itemID, int64(20), int64(0)).Return(activities, nil)

	req, _ := http.NewRequest("GET", "/api/items/"+itemID.Hex()+"/activity?limit=200", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}
