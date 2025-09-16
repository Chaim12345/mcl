package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/middleware"
	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// SavedFilterHandler handles saved filter-related HTTP requests
type SavedFilterHandler struct {
	savedFilterService *services.SavedFilterService
	jwtManager         *auth.JWTManager
}

// NewSavedFilterHandler creates a new saved filter handler
func NewSavedFilterHandler(savedFilterService *services.SavedFilterService, jwtManager *auth.JWTManager) *SavedFilterHandler {
	return &SavedFilterHandler{
		savedFilterService: savedFilterService,
		jwtManager:         jwtManager,
	}
}

// CreateSavedFilterRequest represents a create saved filter request
type CreateSavedFilterRequest struct {
	Name        string             `json:"name" binding:"required"`
	Description string             `json:"description"`
	WorkspaceID string             `json:"workspaceId" binding:"required"`
	EntityType  string             `json:"entityType" binding:"required"`
	Query       models.FilterQuery `json:"query" binding:"required"`
	IsPublic    bool               `json:"isPublic"`
}

// UpdateSavedFilterRequest represents an update saved filter request
type UpdateSavedFilterRequest struct {
	Name        string             `json:"name" binding:"required"`
	Description string             `json:"description"`
	Query       models.FilterQuery `json:"query" binding:"required"`
	IsPublic    bool               `json:"isPublic"`
}

// SavedFilterResponse represents a saved filter API response
type SavedFilterResponse struct {
	Success bool                  `json:"success"`
	Data    *models.SavedFilter   `json:"data,omitempty"`
	Filters []*models.SavedFilter `json:"filters,omitempty"`
	Error   *ErrorResponse        `json:"error,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// CreateSavedFilter handles creating a new saved filter
func (h *SavedFilterHandler) CreateSavedFilter(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		return
	}

	userObjectID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_USER_ID",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse request
	var req CreateSavedFilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				// Details field removed for security
			},
		})
		return
	}

	// Parse workspace ID
	workspaceID, err := primitive.ObjectIDFromHex(req.WorkspaceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_WORKSPACE_ID",
				Message: "Invalid workspace ID",
				// Details field removed for security
			},
		})
		return
	}

	// Create saved filter
	savedFilter := &models.SavedFilter{
		Name:        req.Name,
		Description: req.Description,
		UserID:      userObjectID,
		WorkspaceID: workspaceID,
		EntityType:  req.EntityType,
		Query:       req.Query,
		IsPublic:    req.IsPublic,
	}

	if err := h.savedFilterService.CreateSavedFilter(c.Request.Context(), savedFilter); err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "CREATE_FAILED",
				Message: "Failed to create saved filter",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusCreated, SavedFilterResponse{
		Success: true,
		Data:    savedFilter,
	})
} // GetSavedFilter handles retrieving a saved filter by ID
func (h *SavedFilterHandler) GetSavedFilter(c *gin.Context) {
	// Parse filter ID
	filterIDStr := c.Param("id")
	filterID, err := primitive.ObjectIDFromHex(filterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_FILTER_ID",
				Message: "Invalid filter ID",
				// Details field removed for security
			},
		})
		return
	}

	// Get saved filter
	savedFilter, err := h.savedFilterService.GetSavedFilter(c.Request.Context(), filterID)
	if err != nil {
		c.JSON(http.StatusNotFound, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "FILTER_NOT_FOUND",
				Message: "Saved filter not found",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusOK, SavedFilterResponse{
		Success: true,
		Data:    savedFilter,
	})
}

// GetUserSavedFilters handles retrieving all saved filters for a user
func (h *SavedFilterHandler) GetUserSavedFilters(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		return
	}

	userObjectID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_USER_ID",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse workspace ID
	workspaceIDStr := c.Query("workspace_id")
	if workspaceIDStr == "" {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "MISSING_WORKSPACE_ID",
				Message: "Workspace ID is required",
			},
		})
		return
	}

	workspaceID, err := primitive.ObjectIDFromHex(workspaceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_WORKSPACE_ID",
				Message: "Invalid workspace ID",
				// Details field removed for security
			},
		})
		return
	}

	// Get entity type filter
	entityType := c.Query("entity_type")

	// Get user's saved filters
	filters, err := h.savedFilterService.GetUserSavedFilters(c.Request.Context(), userObjectID, workspaceID, entityType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "GET_FILTERS_FAILED",
				Message: "Failed to retrieve saved filters",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusOK, SavedFilterResponse{
		Success: true,
		Filters: filters,
	})
} // GetPublicSavedFilters handles retrieving public saved filters in a workspace
func (h *SavedFilterHandler) GetPublicSavedFilters(c *gin.Context) {
	// Parse workspace ID
	workspaceIDStr := c.Query("workspace_id")
	if workspaceIDStr == "" {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "MISSING_WORKSPACE_ID",
				Message: "Workspace ID is required",
			},
		})
		return
	}

	workspaceID, err := primitive.ObjectIDFromHex(workspaceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_WORKSPACE_ID",
				Message: "Invalid workspace ID",
				// Details field removed for security
			},
		})
		return
	}

	// Get entity type filter
	entityType := c.Query("entity_type")

	// Get public saved filters
	filters, err := h.savedFilterService.GetPublicSavedFilters(c.Request.Context(), workspaceID, entityType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "GET_FILTERS_FAILED",
				Message: "Failed to retrieve public saved filters",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusOK, SavedFilterResponse{
		Success: true,
		Filters: filters,
	})
}

// UpdateSavedFilter handles updating a saved filter
func (h *SavedFilterHandler) UpdateSavedFilter(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		return
	}

	userObjectID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_USER_ID",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse filter ID
	filterIDStr := c.Param("id")
	filterID, err := primitive.ObjectIDFromHex(filterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_FILTER_ID",
				Message: "Invalid filter ID",
				// Details field removed for security
			},
		})
		return
	}

	// Parse request
	var req UpdateSavedFilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				// Details field removed for security
			},
		})
		return
	}

	// Get existing filter to preserve workspace and entity type
	existing, err := h.savedFilterService.GetSavedFilter(c.Request.Context(), filterID)
	if err != nil {
		c.JSON(http.StatusNotFound, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "FILTER_NOT_FOUND",
				Message: "Saved filter not found",
				// Details field removed for security
			},
		})
		return
	}

	// Create update object
	updates := &models.SavedFilter{
		Name:        req.Name,
		Description: req.Description,
		UserID:      userObjectID,
		WorkspaceID: existing.WorkspaceID,
		EntityType:  existing.EntityType,
		Query:       req.Query,
		IsPublic:    req.IsPublic,
	}

	// Update saved filter
	if err := h.savedFilterService.UpdateSavedFilter(c.Request.Context(), filterID, updates); err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "UPDATE_FAILED",
				Message: "Failed to update saved filter",
				// Details field removed for security
			},
		})
		return
	}

	// Get updated filter
	updatedFilter, err := h.savedFilterService.GetSavedFilter(c.Request.Context(), filterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "GET_UPDATED_FAILED",
				Message: "Failed to retrieve updated filter",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusOK, SavedFilterResponse{
		Success: true,
		Data:    updatedFilter,
	})
} // DeleteSavedFilter handles deleting a saved filter
func (h *SavedFilterHandler) DeleteSavedFilter(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		return
	}

	userObjectID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_USER_ID",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse filter ID
	filterIDStr := c.Param("id")
	filterID, err := primitive.ObjectIDFromHex(filterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_FILTER_ID",
				Message: "Invalid filter ID",
				// Details field removed for security
			},
		})
		return
	}

	// Delete saved filter
	if err := h.savedFilterService.DeleteSavedFilter(c.Request.Context(), filterID, userObjectID); err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "DELETE_FAILED",
				Message: "Failed to delete saved filter",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusOK, SavedFilterResponse{
		Success: true,
	})
}

// UseSavedFilter handles incrementing usage count for a saved filter
func (h *SavedFilterHandler) UseSavedFilter(c *gin.Context) {
	// Parse filter ID
	filterIDStr := c.Param("id")
	filterID, err := primitive.ObjectIDFromHex(filterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_FILTER_ID",
				Message: "Invalid filter ID",
				// Details field removed for security
			},
		})
		return
	}

	// Increment usage count
	if err := h.savedFilterService.IncrementUsageCount(c.Request.Context(), filterID); err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INCREMENT_FAILED",
				Message: "Failed to increment usage count",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusOK, SavedFilterResponse{
		Success: true,
	})
}

// GetMostUsedFilters handles retrieving the most used filters in a workspace
func (h *SavedFilterHandler) GetMostUsedFilters(c *gin.Context) {
	// Parse workspace ID
	workspaceIDStr := c.Query("workspace_id")
	if workspaceIDStr == "" {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "MISSING_WORKSPACE_ID",
				Message: "Workspace ID is required",
			},
		})
		return
	}

	workspaceID, err := primitive.ObjectIDFromHex(workspaceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "INVALID_WORKSPACE_ID",
				Message: "Invalid workspace ID",
				// Details field removed for security
			},
		})
		return
	}

	// Get entity type filter
	entityType := c.Query("entity_type")

	// Parse limit
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.ParseInt(limitStr, 10, 64)
	if err != nil || limit <= 0 || limit > 50 {
		limit = 10
	}

	// Get most used filters
	filters, err := h.savedFilterService.GetMostUsedFilters(c.Request.Context(), workspaceID, entityType, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, SavedFilterResponse{
			Success: false,
			Error: &ErrorResponse{
				Code:    "GET_FILTERS_FAILED",
				Message: "Failed to retrieve most used filters",
				// Details field removed for security
			},
		})
		return
	}

	c.JSON(http.StatusOK, SavedFilterResponse{
		Success: true,
		Filters: filters,
	})
}

// RegisterRoutes registers saved filter routes with the router
func (h *SavedFilterHandler) RegisterRoutes(router *gin.RouterGroup) {
	savedFilters := router.Group("/saved-filters")
	savedFilters.Use(middleware.AuthMiddleware(h.jwtManager)) // Require authentication

	savedFilters.POST("", h.CreateSavedFilter)
	savedFilters.GET("", h.GetUserSavedFilters)
	savedFilters.GET("/public", h.GetPublicSavedFilters)
	savedFilters.GET("/most-used", h.GetMostUsedFilters)
	savedFilters.GET("/:id", h.GetSavedFilter)
	savedFilters.PUT("/:id", h.UpdateSavedFilter)
	savedFilters.DELETE("/:id", h.DeleteSavedFilter)
	savedFilters.POST("/:id/use", h.UseSavedFilter)
}
