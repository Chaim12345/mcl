package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/middleware"
	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// FilterHandler handles filter-related HTTP requests
type FilterHandler struct {
	filterService *services.FilterService
	cacheService  *services.CacheService
	jwtManager    *auth.JWTManager
}

// NewFilterHandler creates a new filter handler
func NewFilterHandler(filterService *services.FilterService, cacheService *services.CacheService, jwtManager *auth.JWTManager) *FilterHandler {
	return &FilterHandler{
		filterService: filterService,
		cacheService:  cacheService,
		jwtManager:    jwtManager,
	}
}

// FilterRequest represents a filter request
type FilterRequest struct {
	Query       models.FilterQuery `json:"query" binding:"required"`
	WorkspaceID string             `json:"workspaceId" binding:"required"`
	BoardIDs    []string           `json:"boardIds"`
	Limit       int                `json:"limit"`
	Skip        int                `json:"skip"`
	SortBy      string             `json:"sortBy"`
	SortOrder   string             `json:"sortOrder"`
}

// FilterResponse represents the filter API response
type FilterResponse struct {
	Success bool       `json:"success"`
	Data    FilterData `json:"data"`
	Meta    FilterMeta `json:"meta"`
}

// FilterData represents the filter result data
type FilterData struct {
	Items      []interface{} `json:"items"`
	TotalCount int64         `json:"totalCount"`
	HasMore    bool          `json:"hasMore"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	TimeTaken  string        `json:"timeTaken"`
}

// FilterMeta represents filter metadata
type FilterMeta struct {
	Query      models.FilterQuery `json:"query"`
	Cached     bool               `json:"cached"`
	EntityType string             `json:"entityType"`
}

// CombinedSearchFilterRequest represents a combined search and filter request
type CombinedSearchFilterRequest struct {
	SearchQuery string             `json:"searchQuery"`
	FilterQuery models.FilterQuery `json:"filterQuery"`
	WorkspaceID string             `json:"workspaceId" binding:"required"`
	BoardIDs    []string           `json:"boardIds"`
	Limit       int                `json:"limit"`
	Skip        int                `json:"skip"`
	SortBy      string             `json:"sortBy"`
	SortOrder   string             `json:"sortOrder"`
}

// parseFilterRequest parses and validates filter request
func (h *FilterHandler) parseFilterRequest(c *gin.Context) (*FilterRequest, error) {
	var req FilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, err
	}

	// Set defaults
	if req.Limit <= 0 || req.Limit > 100 {
		req.Limit = 20
	}
	if req.Skip < 0 {
		req.Skip = 0
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	return &req, nil
}

// convertToFilterOptions converts request to filter options
func (h *FilterHandler) convertToFilterOptions(req *FilterRequest) (*models.FilterOptions, error) {
	workspaceID, err := primitive.ObjectIDFromHex(req.WorkspaceID)
	if err != nil {
		return nil, err
	}

	var boardIDs []primitive.ObjectID
	for _, boardIDStr := range req.BoardIDs {
		if boardIDStr != "" {
			boardID, err := primitive.ObjectIDFromHex(boardIDStr)
			if err != nil {
				return nil, err
			}
			boardIDs = append(boardIDs, boardID)
		}
	}

	return &models.FilterOptions{
		Limit:       int64(req.Limit),
		Skip:        int64(req.Skip),
		SortBy:      req.SortBy,
		SortOrder:   req.SortOrder,
		WorkspaceID: workspaceID,
		BoardIDs:    boardIDs,
	}, nil
} // FilterItems handles item filter requests
func (h *FilterHandler) FilterItems(c *gin.Context) {
	// Parse request
	req, err := h.parseFilterRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid filter parameters",
				// details field removed for security
			},
		})
		return
	}

	// Validate filter query
	if err := h.filterService.ValidateFilterQuery("item", req.Query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_FILTER",
				"message": "Invalid filter query",
				// details field removed for security
			},
		})
		return
	}

	// Check cache first
	if cached, found := h.cacheService.GetFilterResult("item", req.Query, req); found {
		if result, ok := cached.(*models.FilterResult); ok {
			h.sendFilterResponse(c, result, req.Query, "item", true)
			return
		}
	}

	// Convert to filter options
	options, err := h.convertToFilterOptions(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_WORKSPACE_ID",
				"message": "Invalid workspace or board ID",
				// details field removed for security
			},
		})
		return
	}

	// Perform filter
	result, err := h.filterService.FilterItems(c.Request.Context(), req.Query, *options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FILTER_FAILED",
				"message": "Failed to perform filter",
				// details field removed for security
			},
		})
		return
	}

	// Cache the result
	h.cacheService.SetFilterResult("item", req.Query, req, result)

	// Send response
	h.sendFilterResponse(c, result, req.Query, "item", false)
}

// FilterComments handles comment filter requests
func (h *FilterHandler) FilterComments(c *gin.Context) {
	// Parse request
	req, err := h.parseFilterRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid filter parameters",
				// details field removed for security
			},
		})
		return
	}

	// Validate filter query
	if err := h.filterService.ValidateFilterQuery("comment", req.Query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_FILTER",
				"message": "Invalid filter query",
				// details field removed for security
			},
		})
		return
	}

	// Check cache first
	if cached, found := h.cacheService.GetFilterResult("comment", req.Query, req); found {
		if result, ok := cached.(*models.FilterResult); ok {
			h.sendFilterResponse(c, result, req.Query, "comment", true)
			return
		}
	}

	// Convert to filter options
	options, err := h.convertToFilterOptions(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_WORKSPACE_ID",
				"message": "Invalid workspace ID",
				// details field removed for security
			},
		})
		return
	}

	// Perform filter
	result, err := h.filterService.FilterComments(c.Request.Context(), req.Query, *options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FILTER_FAILED",
				"message": "Failed to perform filter",
				// details field removed for security
			},
		})
		return
	}

	// Cache the result
	h.cacheService.SetFilterResult("comment", req.Query, req, result)

	// Send response
	h.sendFilterResponse(c, result, req.Query, "comment", false)
} // FilterBoards handles board filter requests
func (h *FilterHandler) FilterBoards(c *gin.Context) {
	// Parse request
	req, err := h.parseFilterRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid filter parameters",
				// details field removed for security
			},
		})
		return
	}

	// Validate filter query
	if err := h.filterService.ValidateFilterQuery("board", req.Query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_FILTER",
				"message": "Invalid filter query",
				// details field removed for security
			},
		})
		return
	}

	// Check cache first
	if cached, found := h.cacheService.GetFilterResult("board", req.Query, req); found {
		if result, ok := cached.(*models.FilterResult); ok {
			h.sendFilterResponse(c, result, req.Query, "board", true)
			return
		}
	}

	// Convert to filter options
	options, err := h.convertToFilterOptions(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_WORKSPACE_ID",
				"message": "Invalid workspace ID",
				// details field removed for security
			},
		})
		return
	}

	// Perform filter
	result, err := h.filterService.FilterBoards(c.Request.Context(), req.Query, *options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FILTER_FAILED",
				"message": "Failed to perform filter",
				// details field removed for security
			},
		})
		return
	}

	// Cache the result
	h.cacheService.SetFilterResult("board", req.Query, req, result)

	// Send response
	h.sendFilterResponse(c, result, req.Query, "board", false)
}

// FilterActivities handles activity filter requests
func (h *FilterHandler) FilterActivities(c *gin.Context) {
	// Parse request
	req, err := h.parseFilterRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid filter parameters",
				// details field removed for security
			},
		})
		return
	}

	// Validate filter query
	if err := h.filterService.ValidateFilterQuery("activity", req.Query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_FILTER",
				"message": "Invalid filter query",
				// details field removed for security
			},
		})
		return
	}

	// Check cache first
	if cached, found := h.cacheService.GetFilterResult("activity", req.Query, req); found {
		if result, ok := cached.(*models.FilterResult); ok {
			h.sendFilterResponse(c, result, req.Query, "activity", true)
			return
		}
	}

	// Convert to filter options
	options, err := h.convertToFilterOptions(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_WORKSPACE_ID",
				"message": "Invalid workspace ID",
				// details field removed for security
			},
		})
		return
	}

	// Perform filter
	result, err := h.filterService.FilterActivities(c.Request.Context(), req.Query, *options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FILTER_FAILED",
				"message": "Failed to perform filter",
				// details field removed for security
			},
		})
		return
	}

	// Cache the result
	h.cacheService.SetFilterResult("activity", req.Query, req, result)

	// Send response
	h.sendFilterResponse(c, result, req.Query, "activity", false)
} // CombinedSearchFilter handles combined search and filter requests
func (h *FilterHandler) CombinedSearchFilter(c *gin.Context) {
	entityType := c.Param("entityType")
	if entityType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_ENTITY_TYPE",
				"message": "Entity type is required",
			},
		})
		return
	}

	// Parse request
	var req CombinedSearchFilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid request parameters",
				// details field removed for security
			},
		})
		return
	}

	// Set defaults
	if req.Limit <= 0 || req.Limit > 100 {
		req.Limit = 20
	}
	if req.Skip < 0 {
		req.Skip = 0
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	// Validate filter query if provided
	if len(req.FilterQuery.Groups) > 0 {
		if err := h.filterService.ValidateFilterQuery(entityType, req.FilterQuery); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_FILTER",
					"message": "Invalid filter query",
					// details field removed for security
				},
			})
			return
		}
	}

	// Convert to filter options
	workspaceID, err := primitive.ObjectIDFromHex(req.WorkspaceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_WORKSPACE_ID",
				"message": "Invalid workspace ID",
				// details field removed for security
			},
		})
		return
	}

	var boardIDs []primitive.ObjectID
	for _, boardIDStr := range req.BoardIDs {
		if boardIDStr != "" {
			boardID, err := primitive.ObjectIDFromHex(boardIDStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "INVALID_BOARD_ID",
						"message": "Invalid board ID",
						// details field removed for security
					},
				})
				return
			}
			boardIDs = append(boardIDs, boardID)
		}
	}

	options := models.FilterOptions{
		Limit:       int64(req.Limit),
		Skip:        int64(req.Skip),
		SortBy:      req.SortBy,
		SortOrder:   req.SortOrder,
		WorkspaceID: workspaceID,
		BoardIDs:    boardIDs,
	}

	// Perform combined search and filter
	result, err := h.filterService.CombineSearchAndFilter(
		c.Request.Context(),
		entityType,
		req.SearchQuery,
		req.FilterQuery,
		options,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SEARCH_FILTER_FAILED",
				"message": "Failed to perform combined search and filter",
				// details field removed for security
			},
		})
		return
	}

	// Send response
	h.sendFilterResponse(c, result, req.FilterQuery, entityType, false)
}

// sendFilterResponse sends a standardized filter response
func (h *FilterHandler) sendFilterResponse(c *gin.Context, result *models.FilterResult, query models.FilterQuery, entityType string, cached bool) {
	page := 1
	if result.TotalCount > 0 && len(result.Items) > 0 {
		// Calculate page based on items returned and total count
		page = int(result.TotalCount/int64(len(result.Items))) + 1
	}

	response := FilterResponse{
		Success: true,
		Data: FilterData{
			Items:      result.Items,
			TotalCount: result.TotalCount,
			HasMore:    result.HasMore,
			Page:       page,
			Limit:      len(result.Items),
			TimeTaken:  result.TimeTaken.String(),
		},
		Meta: FilterMeta{
			Query:      query,
			Cached:     cached,
			EntityType: entityType,
		},
	}

	c.JSON(http.StatusOK, response)
}

// RegisterRoutes registers filter routes with the router
func (h *FilterHandler) RegisterRoutes(router *gin.RouterGroup) {
	filter := router.Group("/filter")
	filter.Use(middleware.AuthMiddleware(h.jwtManager)) // Require authentication

	filter.POST("/items", h.FilterItems)
	filter.POST("/comments", h.FilterComments)
	filter.POST("/boards", h.FilterBoards)
	filter.POST("/activities", h.FilterActivities)

	// Combined search and filter endpoint
	filter.POST("/search/:entityType", h.CombinedSearchFilter)
}
