package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/services"
)

// ItemService defines item-related business logic interface
type ItemService interface {
	SearchItems(ctx context.Context, query string, limit, skip int64) ([]*services.ItemResponse, error)
	FilterItems(ctx context.Context, status, priority string, startDate, endDate *time.Time, limit, skip int64) ([]*services.ItemResponse, error)
	Create(ctx context.Context, userID, boardID primitive.ObjectID, req services.CreateItemRequest) (*services.ItemResponse, error)
	GetByID(ctx context.Context, userID, itemID primitive.ObjectID) (*services.ItemResponse, error)
	GetByBoardID(ctx context.Context, userID, boardID primitive.ObjectID) ([]*services.ItemResponse, error)
	Update(ctx context.Context, userID, itemID primitive.ObjectID, req services.UpdateItemRequest) (*services.ItemResponse, error)
	Delete(ctx context.Context, userID, itemID primitive.ObjectID) error
	Move(ctx context.Context, userID, itemID primitive.ObjectID, req services.MoveItemRequest) (*services.ItemResponse, error)
	GetByAssignee(ctx context.Context, userID primitive.ObjectID) ([]*services.ItemResponse, error)
}

// BulkCreateItemRequest represents a bulk item creation request
type BulkCreateItemRequest struct {
	Items []services.CreateItemRequest `json:"items" validate:"required,min=1,max=100"`
}

// BulkUpdateItemRequest represents a bulk item update request
type BulkUpdateItemRequest struct {
	Items []BulkUpdateItem `json:"items" validate:"required,min=1,max=100"`
}

// BulkUpdateItem represents a single item in bulk update
type BulkUpdateItem struct {
	ID   string                     `json:"id" validate:"required"`
	Data services.UpdateItemRequest `json:"data" validate:"required"`
}

// BulkDeleteItemRequest represents a bulk item deletion request
type BulkDeleteItemRequest struct {
	ItemIDs []string `json:"itemIds" validate:"required,min=1,max=100"`
}

// BulkResponse represents a bulk operation response
type BulkResponse struct {
	Success []BulkOperationResult `json:"success"`
	Errors  []BulkOperationError  `json:"errors"`
}

// BulkOperationResult represents a successful bulk operation result
type BulkOperationResult struct {
	ID   string                 `json:"id"`
	Data *services.ItemResponse `json:"data,omitempty"`
}

// BulkOperationError represents a bulk operation error
type BulkOperationError struct {
	ID    string `json:"id,omitempty"`
	Error string `json:"error"`
}

// ItemHandler handles item HTTP requests
type ItemHandler struct {
	itemService ItemService
}

// FilterItems handles GET /api/items/filter?status=...&priority=...&startDate=...&endDate=...&limit=...&skip=...
func (h *ItemHandler) FilterItems(c *gin.Context) {
	status := c.Query("status")
	priority := c.Query("priority")

	var startDatePtr, endDatePtr *time.Time
	if s := c.Query("startDate"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			startDatePtr = &t
		}
	}
	if e := c.Query("endDate"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			endDatePtr = &t
		}
	}

	limit := int64(20)
	skip := int64(0)
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.ParseInt(l, 10, 64); err == nil {
			limit = parsed
		}
	}
	if s := c.Query("skip"); s != "" {
		if parsed, err := strconv.ParseInt(s, 10, 64); err == nil {
			skip = parsed
		}
	}

	items, err := h.itemService.FilterItems(c.Request.Context(), status, priority, startDatePtr, endDatePtr, limit, skip)
	if err != nil {
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	h.sendSuccess(c, http.StatusOK, items)
}

// SearchItems handles GET /api/items/search?query=...&limit=...&skip=...
func (h *ItemHandler) SearchItems(c *gin.Context) {
	query := c.Query("query")
	if query == "" {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Query parameter is required")
		return
	}

	limit := int64(20)
	skip := int64(0)
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.ParseInt(l, 10, 64); err == nil {
			limit = parsed
		}
	}
	if s := c.Query("skip"); s != "" {
		if parsed, err := strconv.ParseInt(s, 10, 64); err == nil {
			skip = parsed
		}
	}

	items, err := h.itemService.SearchItems(c.Request.Context(), query, limit, skip)
	if err != nil {
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	h.sendSuccess(c, http.StatusOK, items)
}

// NewItemHandler creates a new ItemHandler
func NewItemHandler(itemService ItemService) *ItemHandler {
	return &ItemHandler{itemService: itemService}
}

// CreateItem handles POST /api/boards/{boardId}/items
func (h *ItemHandler) CreateItem(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	boardID, err := primitive.ObjectIDFromHex(c.Param("boardId"))
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	var req services.CreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	// Debug logging
	fmt.Printf("DEBUG: Handler received - Title: '%s', Name: '%s'\n", req.Title, req.Name)

	item, err := h.itemService.Create(c.Request.Context(), authUser.ID, boardID, req)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			h.sendError(c, http.StatusForbidden, "ACCESS_DENIED", err.Error())
			return
		}
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	h.sendSuccess(c, http.StatusCreated, item)
}

// GetItem handles GET /api/items/{itemId}
func (h *ItemHandler) GetItem(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	itemID, err := primitive.ObjectIDFromHex(c.Param("itemId"))
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid item ID")
		return
	}

	item, err := h.itemService.GetByID(c.Request.Context(), authUser.ID, itemID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			h.sendError(c, http.StatusForbidden, "ACCESS_DENIED", err.Error())
			return
		}
		if strings.Contains(err.Error(), "not found") {
			h.sendError(c, http.StatusNotFound, "NOT_FOUND", "Item not found")
			return
		}
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	h.sendSuccess(c, http.StatusOK, item)
}

// GetBoardItems handles GET /api/boards/{boardId}/items
func (h *ItemHandler) GetBoardItems(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	boardID, err := primitive.ObjectIDFromHex(c.Param("boardId"))
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	items, err := h.itemService.GetByBoardID(c.Request.Context(), authUser.ID, boardID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			h.sendError(c, http.StatusForbidden, "ACCESS_DENIED", err.Error())
			return
		}
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	h.sendSuccess(c, http.StatusOK, items)
}

// UpdateItem handles PUT /api/items/{itemId}
func (h *ItemHandler) UpdateItem(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	itemID, err := primitive.ObjectIDFromHex(c.Param("itemId"))
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid item ID")
		return
	}

	var req services.UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	item, err := h.itemService.Update(c.Request.Context(), authUser.ID, itemID, req)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			h.sendError(c, http.StatusForbidden, "ACCESS_DENIED", err.Error())
			return
		}
		if strings.Contains(err.Error(), "not found") {
			h.sendError(c, http.StatusNotFound, "NOT_FOUND", "Item not found")
			return
		}
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	h.sendSuccess(c, http.StatusOK, item)
}

// MoveItem handles POST /api/items/{itemId}/move
func (h *ItemHandler) MoveItem(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	itemID, err := primitive.ObjectIDFromHex(c.Param("itemId"))
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid item ID")
		return
	}

	var req services.MoveItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	moved, err := h.itemService.Move(c.Request.Context(), authUser.ID, itemID, req)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			h.sendError(c, http.StatusForbidden, "ACCESS_DENIED", err.Error())
			return
		}
		if strings.Contains(err.Error(), "not found") {
			h.sendError(c, http.StatusNotFound, "NOT_FOUND", "Item not found")
			return
		}
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	h.sendSuccess(c, http.StatusOK, moved)
}

// DeleteItem handles DELETE /api/items/{itemId}
func (h *ItemHandler) DeleteItem(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	itemID, err := primitive.ObjectIDFromHex(c.Param("itemId"))
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid item ID")
		return
	}

	err = h.itemService.Delete(c.Request.Context(), authUser.ID, itemID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			h.sendError(c, http.StatusForbidden, "ACCESS_DENIED", err.Error())
			return
		}
		if strings.Contains(err.Error(), "not found") {
			h.sendError(c, http.StatusNotFound, "NOT_FOUND", "Item not found")
			return
		}
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	h.sendSuccess(c, http.StatusNoContent, nil)
}

// GetMyItems handles GET /api/items/my - gets items assigned to the current user
func (h *ItemHandler) GetMyItems(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	items, err := h.itemService.GetByAssignee(c.Request.Context(), authUser.ID)
	if err != nil {
		h.sendError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	h.sendSuccess(c, http.StatusOK, items)
}

// BulkCreateItems handles POST /api/boards/{boardId}/items/bulk
func (h *ItemHandler) BulkCreateItems(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)
	boardID, err := primitive.ObjectIDFromHex(c.Param("boardId"))
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	var req BulkCreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if len(req.Items) == 0 {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "At least one item is required")
		return
	}

	if len(req.Items) > 100 {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Maximum 100 items allowed per bulk operation")
		return
	}

	response := BulkResponse{
		Success: []BulkOperationResult{},
		Errors:  []BulkOperationError{},
	}

	for i, itemReq := range req.Items {
		item, err := h.itemService.Create(c.Request.Context(), authUser.ID, boardID, itemReq)
		if err != nil {
			response.Errors = append(response.Errors, BulkOperationError{
				ID:    fmt.Sprintf("item_%d", i),
				Error: err.Error(),
			})
		} else {
			response.Success = append(response.Success, BulkOperationResult{
				ID:   item.ID,
				Data: item,
			})
		}
	}

	statusCode := http.StatusCreated
	if len(response.Errors) > 0 && len(response.Success) == 0 {
		statusCode = http.StatusBadRequest
	} else if len(response.Errors) > 0 {
		statusCode = http.StatusMultiStatus
	}

	h.sendSuccess(c, statusCode, response)
}

// BulkUpdateItems handles PUT /api/items/bulk
func (h *ItemHandler) BulkUpdateItems(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)

	var req BulkUpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if len(req.Items) == 0 {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "At least one item is required")
		return
	}

	if len(req.Items) > 100 {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Maximum 100 items allowed per bulk operation")
		return
	}

	response := BulkResponse{
		Success: []BulkOperationResult{},
		Errors:  []BulkOperationError{},
	}

	for _, itemUpdate := range req.Items {
		itemID, err := primitive.ObjectIDFromHex(itemUpdate.ID)
		if err != nil {
			response.Errors = append(response.Errors, BulkOperationError{
				ID:    itemUpdate.ID,
				Error: "Invalid item ID",
			})
			continue
		}

		item, err := h.itemService.Update(c.Request.Context(), authUser.ID, itemID, itemUpdate.Data)
		if err != nil {
			response.Errors = append(response.Errors, BulkOperationError{
				ID:    itemUpdate.ID,
				Error: err.Error(),
			})
		} else {
			response.Success = append(response.Success, BulkOperationResult{
				ID:   item.ID,
				Data: item,
			})
		}
	}

	statusCode := http.StatusOK
	if len(response.Errors) > 0 && len(response.Success) == 0 {
		statusCode = http.StatusBadRequest
	} else if len(response.Errors) > 0 {
		statusCode = http.StatusMultiStatus
	}

	h.sendSuccess(c, statusCode, response)
}

// BulkDeleteItems handles DELETE /api/items/bulk
func (h *ItemHandler) BulkDeleteItems(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser := user.(*auth.AuthenticatedUser)

	var req BulkDeleteItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if len(req.ItemIDs) == 0 {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "At least one item ID is required")
		return
	}

	if len(req.ItemIDs) > 100 {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Maximum 100 items allowed per bulk operation")
		return
	}

	response := BulkResponse{
		Success: []BulkOperationResult{},
		Errors:  []BulkOperationError{},
	}

	for _, itemIDStr := range req.ItemIDs {
		itemID, err := primitive.ObjectIDFromHex(itemIDStr)
		if err != nil {
			response.Errors = append(response.Errors, BulkOperationError{
				ID:    itemIDStr,
				Error: "Invalid item ID",
			})
			continue
		}

		err = h.itemService.Delete(c.Request.Context(), authUser.ID, itemID)
		if err != nil {
			response.Errors = append(response.Errors, BulkOperationError{
				ID:    itemIDStr,
				Error: err.Error(),
			})
		} else {
			response.Success = append(response.Success, BulkOperationResult{
				ID: itemIDStr,
			})
		}
	}

	statusCode := http.StatusOK
	if len(response.Errors) > 0 && len(response.Success) == 0 {
		statusCode = http.StatusBadRequest
	} else if len(response.Errors) > 0 {
		statusCode = http.StatusMultiStatus
	}

	h.sendSuccess(c, statusCode, response)
}

// helper methods
func (h *ItemHandler) sendSuccess(c *gin.Context, statusCode int, data interface{}) {
	if data != nil {
		c.JSON(statusCode, gin.H{
			"success": true,
			"data":    data,
		})
	} else {
		c.JSON(statusCode, gin.H{
			"success": true,
		})
	}
}

func (h *ItemHandler) sendError(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, gin.H{
		"success": false,
		"error": gin.H{
			"code":    code,
			"message": message,
		},
	})
}
