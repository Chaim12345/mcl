package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/errors"
	"project-management-platform/internal/services"
)

// BoardService interface for dependency injection
type BoardService interface {
	Create(ctx context.Context, userID, workspaceID primitive.ObjectID, req services.CreateBoardRequest) (*services.BoardResponse, error)
	GetByID(ctx context.Context, userID, boardID primitive.ObjectID) (*services.BoardResponse, error)
	GetByWorkspaceID(ctx context.Context, userID, workspaceID primitive.ObjectID) ([]*services.BoardResponse, error)
	Update(ctx context.Context, userID, boardID primitive.ObjectID, req services.UpdateBoardRequest) (*services.BoardResponse, error)
	Delete(ctx context.Context, userID, boardID primitive.ObjectID) error
	AddColumn(ctx context.Context, userID, boardID primitive.ObjectID, req services.AddColumnRequest) (*services.BoardResponse, error)
	UpdateColumn(ctx context.Context, userID, boardID primitive.ObjectID, columnID string, req services.UpdateColumnRequest) (*services.BoardResponse, error)
	RemoveColumn(ctx context.Context, userID, boardID primitive.ObjectID, columnID string) (*services.BoardResponse, error)
	ReorderColumns(ctx context.Context, userID, boardID primitive.ObjectID, req services.ReorderColumnsRequest) (*services.BoardResponse, error)
	ShareBoard(ctx context.Context, userID, boardID primitive.ObjectID, req services.ShareBoardRequest) (*services.ShareBoardResponse, error)
	UpdatePermissions(ctx context.Context, userID, boardID primitive.ObjectID, req services.UpdatePermissionsRequest) (*services.BoardResponse, error)
	GetPermissions(ctx context.Context, userID, boardID primitive.ObjectID) (*services.PermissionsResponse, error)
}

// BoardHandler handles board-related HTTP requests
type BoardHandler struct {
	boardService BoardService
}

// NewBoardHandler creates a new board handler
func NewBoardHandler(boardService BoardService) *BoardHandler {
	return &BoardHandler{
		boardService: boardService,
	}
}

// CreateBoard handles POST /api/workspaces/{workspaceId}/boards
func (h *BoardHandler) CreateBoard(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		HandleError(c, errors.ErrUnauthorized, "authentication check")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		HandleError(c, errors.ErrUnauthorized, "user context validation")
		return
	}

	workspaceIDStr := c.Param("workspaceId")
	workspaceID, err := primitive.ObjectIDFromHex(workspaceIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid workspace ID")
		return
	}

	var req services.CreateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Board name is required")
		return
	}

	board, err := h.boardService.Create(c.Request.Context(), authUser.ID, workspaceID, req)
	if err != nil {
		HandleError(c, err, "create board")
		return
	}

	SendSuccess(c, http.StatusCreated, board)
}

// GetUserBoards handles GET /api/boards - gets all boards for the authenticated user
func (h *BoardHandler) GetUserBoards(c *gin.Context) {
	// Skip authentication check for development
	// _, ok := c.Get(auth.UserContextKey)
	// if !ok {
	// 	h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
	// 	return
	// }

	// For now, return mock data - this would need to be implemented in the service
	// TODO: Implement GetUserBoards in the board service
	mockBoards := []*services.BoardResponse{
		{
			ID:          primitive.NewObjectID().Hex(),
			Name:        "Project Alpha",
			Description: "Main product development project",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID().Hex(),
			Name:        "Marketing Campaign",
			Description: "Q3 marketing initiatives",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID().Hex(),
			Name:        "Product Roadmap",
			Description: "Long-term product planning",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}
	h.sendSuccess(c, http.StatusOK, mockBoards)
}

// CreateUserBoard handles POST /api/boards - creates a new board for user
func (h *BoardHandler) CreateUserBoard(c *gin.Context) {
	// Skip authentication check for development
	// _, ok := c.Get(auth.UserContextKey)
	// if !ok {
	// 	h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
	// 	return
	// }

	var req services.CreateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Board name is required")
		return
	}

	// For now, return a mock board - this would need to be implemented in the service
	// TODO: Implement general board creation in the board service
	mockBoard := &services.BoardResponse{
		ID:          primitive.NewObjectID().Hex(),
		Name:        req.Name,
		Description: req.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	
	h.sendSuccess(c, http.StatusCreated, mockBoard)
}

// GetBoard handles GET /api/boards/{boardId}
func (h *BoardHandler) GetBoard(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	board, err := h.boardService.GetByID(c.Request.Context(), authUser.ID, boardID)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, board)
}

// GetWorkspaceBoards handles GET /api/workspaces/{workspaceId}/boards
func (h *BoardHandler) GetWorkspaceBoards(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	workspaceIDStr := c.Param("workspaceId")
	workspaceID, err := primitive.ObjectIDFromHex(workspaceIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid workspace ID")
		return
	}

	boards, err := h.boardService.GetByWorkspaceID(c.Request.Context(), authUser.ID, workspaceID)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, boards)
}

// UpdateBoard handles PUT /api/boards/{boardId}
func (h *BoardHandler) UpdateBoard(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	var req services.UpdateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	board, err := h.boardService.Update(c.Request.Context(), authUser.ID, boardID, req)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, board)
}

// DeleteBoard handles DELETE /api/boards/{boardId}
func (h *BoardHandler) DeleteBoard(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	err = h.boardService.Delete(c.Request.Context(), authUser.ID, boardID)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusNoContent, nil)
}

// AddColumn handles POST /api/boards/{boardId}/columns
func (h *BoardHandler) AddColumn(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	var req services.AddColumnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Column name is required")
		return
	}

	if req.Type == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Column type is required")
		return
	}

	board, err := h.boardService.AddColumn(c.Request.Context(), authUser.ID, boardID, req)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, board)
}

// RemoveColumn handles DELETE /api/boards/{boardId}/columns/{columnId}
func (h *BoardHandler) RemoveColumn(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	columnID := c.Param("columnId")
	if columnID == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Column ID is required")
		return
	}

	board, err := h.boardService.RemoveColumn(c.Request.Context(), authUser.ID, boardID, columnID)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, board)
}

// UpdateColumn handles PUT /api/boards/{boardId}/columns/{columnId}
func (h *BoardHandler) UpdateColumn(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	columnID := c.Param("columnId")
	if columnID == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Column ID is required")
		return
	}

	var req services.UpdateColumnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	board, err := h.boardService.UpdateColumn(c.Request.Context(), authUser.ID, boardID, columnID, req)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, board)
}

// ReorderColumns handles PUT /api/boards/{boardId}/columns/reorder
func (h *BoardHandler) ReorderColumns(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	var req services.ReorderColumnsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if len(req.ColumnOrder) == 0 {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Column order is required")
		return
	}

	board, err := h.boardService.ReorderColumns(c.Request.Context(), authUser.ID, boardID, req)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, board)
}

// ShareBoard handles POST /api/boards/{boardId}/share
func (h *BoardHandler) ShareBoard(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	var req services.ShareBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Email == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Email is required")
		return
	}

	if req.Permission == "" {
		req.Permission = "view" // Default permission
	}

	result, err := h.boardService.ShareBoard(c.Request.Context(), authUser.ID, boardID, req)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, result)
}

// UpdatePermissions handles PUT /api/boards/{boardId}/permissions
func (h *BoardHandler) UpdatePermissions(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	var req services.UpdatePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	board, err := h.boardService.UpdatePermissions(c.Request.Context(), authUser.ID, boardID, req)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, board)
}

// GetPermissions handles GET /api/boards/{boardId}/permissions
func (h *BoardHandler) GetPermissions(c *gin.Context) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	authUser, ok := user.(*auth.AuthenticatedUser)
	if !ok {
		h.sendError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	boardIDStr := c.Param("boardId")
	boardID, err := primitive.ObjectIDFromHex(boardIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid board ID")
		return
	}

	permissions, err := h.boardService.GetPermissions(c.Request.Context(), authUser.ID, boardID)
	if err != nil {
		h.sendInternalError(c, "board operation")
		return
	}

	h.sendSuccess(c, http.StatusOK, permissions)
}

// Helper methods for sending responses
func (h *BoardHandler) sendSuccess(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

// sendError - DEPRECATED: Use HandleError with custom error types instead
func (h *BoardHandler) sendError(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}

// sendInternalError sends a safe internal error response without exposing details
func (h *BoardHandler) sendInternalError(c *gin.Context, operation string) {
	c.JSON(http.StatusInternalServerError, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    errors.ErrCodeInternal,
			Message: "An unexpected error occurred",
		},
	})
}
