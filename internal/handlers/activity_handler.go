package handlers

import (
	"net/http"
	"strconv"
	"time"

	"project-management-platform/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ActivityHandler struct {
	service ActivityServiceInterface
}

func NewActivityHandler(service ActivityServiceInterface) *ActivityHandler {
	return &ActivityHandler{service: service}
}

// GET /api/items/:itemId/activity
func (h *ActivityHandler) GetItemActivity(c *gin.Context) {
	itemIdStr := c.Param("itemId")
	itemID, err := primitive.ObjectIDFromHex(itemIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid itemId"})
		return
	}
	limit, skip := parseLimitSkip(c)
	activities, err := h.service.ListActivitiesByEntity(c.Request.Context(), "item", itemID, limit, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

// GET /api/boards/:boardId/activity
func (h *ActivityHandler) GetBoardActivity(c *gin.Context) {
	boardIdStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid boardId"})
		return
	}
	limit, skip := parseLimitSkip(c)
	activities, err := h.service.ListActivitiesByEntity(c.Request.Context(), "board", boardID, limit, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

// GET /api/activity (user/global feed)
func (h *ActivityHandler) GetUserActivity(c *gin.Context) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID, ok := userIDVal.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid userID in context"})
		return
	}
	limit, skip := parseLimitSkip(c)
	activities, err := h.service.ListActivitiesByUser(c.Request.Context(), userID, limit, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

// GET /api/workspaces/:workspaceId/activity
func (h *ActivityHandler) GetWorkspaceActivity(c *gin.Context) {
	workspaceIdStr := c.Param("workspaceId")
	workspaceID, err := primitive.ObjectIDFromHex(workspaceIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspaceId"})
		return
	}
	limit, skip := parseLimitSkip(c)
	activities, err := h.service.GetByWorkspaceID(c.Request.Context(), workspaceID, limit, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

// GET /api/activity/timeline
func (h *ActivityHandler) GetActivityTimeline(c *gin.Context) {
	// Parse query parameters for filtering
	filter := services.ActivityFilter{}

	if workspaceIdStr := c.Query("workspaceId"); workspaceIdStr != "" {
		if workspaceID, err := primitive.ObjectIDFromHex(workspaceIdStr); err == nil {
			filter.WorkspaceID = workspaceID
		}
	}

	if userIdStr := c.Query("userId"); userIdStr != "" {
		if userID, err := primitive.ObjectIDFromHex(userIdStr); err == nil {
			filter.UserID = userID
		}
	}

	if entityType := c.Query("entityType"); entityType != "" {
		filter.EntityType = entityType
	}

	if entityIdStr := c.Query("entityId"); entityIdStr != "" {
		if entityID, err := primitive.ObjectIDFromHex(entityIdStr); err == nil {
			filter.EntityID = entityID
		}
	}

	if activityType := c.Query("activityType"); activityType != "" {
		filter.ActivityType = activityType
	}

	// Parse date range
	if startDateStr := c.Query("startDate"); startDateStr != "" {
		// Expected format: RFC3339 (2006-01-02T15:04:05Z07:00)
		// For simplicity, we'll accept just the date part
		// In production, you'd want more robust date parsing
		if startDate, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			filter.StartDate = startDate
		}
	}

	if endDateStr := c.Query("endDate"); endDateStr != "" {
		if endDate, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			filter.EndDate = endDate
		}
	}

	limit, skip := parseLimitSkip(c)
	filter.Limit = limit
	filter.Skip = skip

	timeline, err := h.service.GetActivityTimeline(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, timeline)
}

// GET /api/activity/recent
func (h *ActivityHandler) GetRecentActivity(c *gin.Context) {
	workspaceIdStr := c.Query("workspaceId")
	if workspaceIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspaceId is required"})
		return
	}

	workspaceID, err := primitive.ObjectIDFromHex(workspaceIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspaceId"})
		return
	}

	hours := 24 // Default to last 24 hours
	if h := c.Query("hours"); h != "" {
		if v, err := strconv.Atoi(h); err == nil {
			hours = v
		}
	}

	limit := int64(50) // Default limit
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.ParseInt(l, 10, 64); err == nil {
			limit = v
		}
	}

	activities, err := h.service.GetRecentActivity(c.Request.Context(), workspaceID, hours, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

// GET /api/activity/stats
func (h *ActivityHandler) GetActivityStats(c *gin.Context) {
	workspaceIdStr := c.Query("workspaceId")
	if workspaceIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspaceId is required"})
		return
	}

	workspaceID, err := primitive.ObjectIDFromHex(workspaceIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspaceId"})
		return
	}

	days := 30 // Default to last 30 days
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil {
			days = v
		}
	}

	stats, err := h.service.GetActivityStats(c.Request.Context(), workspaceID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GET /api/users/:userId/activity/summary
func (h *ActivityHandler) GetUserActivitySummary(c *gin.Context) {
	userIdStr := c.Param("userId")
	userID, err := primitive.ObjectIDFromHex(userIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
		return
	}

	days := 30 // Default to last 30 days
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil {
			days = v
		}
	}

	summary, err := h.service.GetUserActivitySummary(c.Request.Context(), userID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

// GET /api/activity/:activityId
func (h *ActivityHandler) GetActivity(c *gin.Context) {
	activityIdStr := c.Param("activityId")
	activityID, err := primitive.ObjectIDFromHex(activityIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activityId"})
		return
	}

	activity, err := h.service.GetActivityByID(c.Request.Context(), activityID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "activity not found"})
		return
	}
	c.JSON(http.StatusOK, activity)
}

func parseLimitSkip(c *gin.Context) (int64, int64) {
	limit := int64(20)
	skip := int64(0)
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.ParseInt(l, 10, 64); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if s := c.Query("skip"); s != "" {
		if v, err := strconv.ParseInt(s, 10, 64); err == nil && v >= 0 {
			skip = v
		}
	}
	return limit, skip
}
