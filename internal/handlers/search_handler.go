package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/middleware"
	"project-management-platform/internal/services"
)

// SearchService defines the interface for search operations.
type SearchService interface {
	SearchItems(ctx context.Context, options services.SearchOptions) ([]services.SearchResult, int64, error)
	SearchComments(ctx context.Context, options services.SearchOptions) ([]services.SearchResult, int64, error)
	SearchBoards(ctx context.Context, options services.SearchOptions) ([]services.SearchResult, int64, error)
}

// SearchHandler handles search-related HTTP requests
type SearchHandler struct {
	searchService SearchService
	cacheService  *services.CacheService
	jwtManager    *auth.JWTManager
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(searchService SearchService, cacheService *services.CacheService, jwtManager *auth.JWTManager) *SearchHandler {
	return &SearchHandler{
		searchService: searchService,
		cacheService:  cacheService,
		jwtManager:    jwtManager,
	}
}

// SearchRequest represents the common search request parameters
type SearchRequest struct {
	Query       string   `form:"q" binding:"required"`
	WorkspaceID string   `form:"workspace_id" binding:"required"`
	BoardIDs    []string `form:"board_ids"`
	Limit       int      `form:"limit"`
	Skip        int      `form:"skip"`
	SortBy      string   `form:"sort_by"`
	SortOrder   string   `form:"sort_order"`
}

// SearchResponse represents the search API response
type SearchResponse struct {
	Success bool       `json:"success"`
	Data    SearchData `json:"data"`
	Meta    SearchMeta `json:"meta"`
}

// SearchData represents the search result data
type SearchData struct {
	Items      []interface{} `json:"items"`
	TotalCount int64         `json:"totalCount"`
	HasMore    bool          `json:"hasMore"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	TimeTaken  string        `json:"timeTaken"`
}

// SearchMeta represents search metadata
type SearchMeta struct {
	Query      string `json:"query"`
	Cached     bool   `json:"cached"`
	EntityType string `json:"entityType"`
}

// parseSearchRequest parses and validates search request parameters
func (h *SearchHandler) parseSearchRequest(c *gin.Context) (*SearchRequest, error) {
	var req SearchRequest
	if err := c.ShouldBindQuery(&req); err != nil {
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

// convertToSearchOptions converts request to search options
func (h *SearchHandler) convertToSearchOptions(req *SearchRequest) (*services.SearchOptions, error) {
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

	return &services.SearchOptions{
		Limit:       int64(req.Limit),
		Skip:        int64(req.Skip),
		SortBy:      req.SortBy,
		SortOrder:   req.SortOrder,
		WorkspaceID: workspaceID,
		BoardIDs:    boardIDs,
	}, nil
} // SearchItems handles item search requests
func (h *SearchHandler) SearchItems(c *gin.Context) {
	// Parse request
	req, err := h.parseSearchRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid search parameters",
				// details field removed for security
			},
		})
		return
	}

	// Check cache first
	if cached, found := h.cacheService.GetSearchResult("item", req.Query, req); found {
		if result, ok := cached.(*services.SearchResults); ok {
			h.sendSearchResponse(c, result, req.Query, "item", true)
			return
		}
	}

	// Convert to search options
	options, err := h.convertToSearchOptions(req)
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

	// Perform search
	results, totalCount, err := h.searchService.SearchItems(c.Request.Context(), *options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SEARCH_FAILED",
				"message": "Failed to perform search",
				// details field removed for security
			},
		})
		return
	}

	// Create search results struct
	searchResults := &services.SearchResults{
		Results:    results,
		TotalCount: totalCount,
		HasMore:    totalCount > int64(len(results)),
		Query:      req.Query,
		Skip:       options.Skip,
		Limit:      options.Limit,
	}

	// Cache the result
	h.cacheService.SetSearchResult("item", req.Query, req, searchResults)

	// Send response
	h.sendSearchResponse(c, searchResults, req.Query, "item", false)
}

// SearchComments handles comment search requests
func (h *SearchHandler) SearchComments(c *gin.Context) {
	// Parse request
	req, err := h.parseSearchRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid search parameters",
				// details field removed for security
			},
		})
		return
	}

	// Check cache first
	if cached, found := h.cacheService.GetSearchResult("comment", req.Query, req); found {
		if result, ok := cached.(*services.SearchResults); ok {
			h.sendSearchResponse(c, result, req.Query, "comment", true)
			return
		}
	}

	// Convert to search options
	options, err := h.convertToSearchOptions(req)
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

	// Perform search
	results, totalCount, err := h.searchService.SearchComments(c.Request.Context(), *options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SEARCH_FAILED",
				"message": "Failed to perform search",
				// details field removed for security
			},
		})
		return
	}

	// Create search results struct
	searchResults := &services.SearchResults{
		Results:    results,
		TotalCount: totalCount,
		HasMore:    totalCount > int64(len(results)),
		Query:      req.Query,
		Skip:       options.Skip,
		Limit:      options.Limit,
	}

	// Cache the result
	h.cacheService.SetSearchResult("comment", req.Query, req, searchResults)

	// Send response
	h.sendSearchResponse(c, searchResults, req.Query, "comment", false)
} // SearchBoards handles board search requests
func (h *SearchHandler) SearchBoards(c *gin.Context) {
	// Parse request
	req, err := h.parseSearchRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid search parameters",
				// details field removed for security
			},
		})
		return
	}

	// Check cache first
	if cached, found := h.cacheService.GetSearchResult("board", req.Query, req); found {
		if result, ok := cached.(*services.SearchResults); ok {
			h.sendSearchResponse(c, result, req.Query, "board", true)
			return
		}
	}

	// Convert to search options
	options, err := h.convertToSearchOptions(req)
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

	// Perform search
	results, totalCount, err := h.searchService.SearchBoards(c.Request.Context(), *options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SEARCH_FAILED",
				"message": "Failed to perform search",
				// details field removed for security
			},
		})
		return
	}

	// Create search results struct
	searchResults := &services.SearchResults{
		Results:    results,
		TotalCount: totalCount,
		HasMore:    totalCount > int64(len(results)),
		Query:      req.Query,
		Skip:       options.Skip,
		Limit:      options.Limit,
	}

	// Cache the result
	h.cacheService.SetSearchResult("board", req.Query, req, searchResults)

	// Send response
	h.sendSearchResponse(c, searchResults, req.Query, "board", false)
}

// sendSearchResponse sends a standardized search response
func (h *SearchHandler) sendSearchResponse(c *gin.Context, result *services.SearchResults, query, entityType string, cached bool) {
	page := int(result.Skip/result.Limit) + 1
	if result.Limit == 0 {
		page = 1
	}

	// Convert results to interface slice
	items := make([]interface{}, len(result.Results))
	for i, r := range result.Results {
		items[i] = r
	}

	c.JSON(http.StatusOK, SearchResponse{
		Success: true,
		Data: SearchData{
			Items:      items,
			TotalCount: result.TotalCount,
			HasMore:    result.HasMore,
			Page:       page,
			Limit:      int(result.Limit),
			TimeTaken:  result.TimeTaken.String(),
		},
		Meta: SearchMeta{
			Query:      query,
			Cached:     cached,
			EntityType: entityType,
		},
	})
}

// RegisterRoutes registers search routes with the router
func (h *SearchHandler) RegisterRoutes(router *gin.RouterGroup) {
	search := router.Group("/search")
	search.Use(middleware.AuthMiddleware(h.jwtManager)) // Require authentication

	search.GET("/items", h.SearchItems)
	search.GET("/comments", h.SearchComments)
	search.GET("/boards", h.SearchBoards)
}
