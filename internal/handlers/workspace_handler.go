package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/errors"
	"project-management-platform/internal/services"
)

// WorkspaceHandler handles workspace-related HTTP requests
type WorkspaceHandler struct {
	workspaceService services.WorkspaceServiceInterface
}

// NewWorkspaceHandler creates a new workspace handler
func NewWorkspaceHandler(workspaceService services.WorkspaceServiceInterface) *WorkspaceHandler {
	return &WorkspaceHandler{
		workspaceService: workspaceService,
	}
}

// CreateWorkspace handles POST /api/workspaces
func (h *WorkspaceHandler) CreateWorkspace(c *gin.Context) {
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

	var req services.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		h.sendError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Workspace name is required")
		return
	}

	workspace, err := h.workspaceService.Create(c.Request.Context(), authUser.ID, req)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}

	h.sendSuccess(c, http.StatusCreated, workspace)
}

// GetWorkspace handles GET /api/workspaces/{id}
func (h *WorkspaceHandler) GetWorkspace(c *gin.Context) {
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

	workspaceIDStr := c.Param("id")
	workspaceID, err := primitive.ObjectIDFromHex(workspaceIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid workspace ID")
		return
	}

	workspace, err := h.workspaceService.GetByID(c.Request.Context(), authUser.ID, workspaceID)
	if err != nil {
		// Use HandleError which will properly handle custom error types
		// This is safer than checking error message strings
		HandleError(c, err, "get workspace")
		return
	}

	h.sendSuccess(c, http.StatusOK, workspace)
}

// GetUserWorkspaces handles GET /api/workspaces
func (h *WorkspaceHandler) GetUserWorkspaces(c *gin.Context) {
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

	workspaces, err := h.workspaceService.GetByUserID(c.Request.Context(), authUser.ID)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}
	h.sendSuccess(c, http.StatusOK, workspaces)
}

// UpdateWorkspace handles PUT /api/workspaces/{id}
func (h *WorkspaceHandler) UpdateWorkspace(c *gin.Context) {
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

	var req services.UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	workspace, err := h.workspaceService.Update(c.Request.Context(), authUser.ID, workspaceID, req)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}
	h.sendSuccess(c, http.StatusOK, workspace)
}

// DeleteWorkspace handles DELETE /api/workspaces/{id}
func (h *WorkspaceHandler) DeleteWorkspace(c *gin.Context) {
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

	err = h.workspaceService.Delete(c.Request.Context(), authUser.ID, workspaceID)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}
	h.sendSuccess(c, http.StatusNoContent, nil)
}

// AddMember handles POST /api/workspaces/{workspaceId}/members
func (h *WorkspaceHandler) AddMember(c *gin.Context) {
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

	var req services.InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	err = h.workspaceService.InviteMember(c.Request.Context(), authUser.ID, workspaceID, req)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}
	h.sendSuccess(c, http.StatusCreated, nil)
}

// RemoveMember handles DELETE /api/workspaces/{workspaceId}/members/{userId}
func (h *WorkspaceHandler) RemoveMember(c *gin.Context) {
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

	memberIDStr := c.Param("userId")
	memberID, err := primitive.ObjectIDFromHex(memberIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid member ID")
		return
	}

	err = h.workspaceService.RemoveMember(c.Request.Context(), authUser.ID, workspaceID, memberID)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}
	h.sendSuccess(c, http.StatusNoContent, nil)
}

// UpdateMemberRole handles PUT /api/workspaces/{workspaceId}/members/{userId}/role
func (h *WorkspaceHandler) UpdateMemberRole(c *gin.Context) {
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

	memberIDStr := c.Param("userId")
	memberID, err := primitive.ObjectIDFromHex(memberIDStr)
	if err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_ID", "Invalid member ID")
		return
	}

	var req services.UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	err = h.workspaceService.UpdateMemberRole(c.Request.Context(), authUser.ID, workspaceID, memberID, req)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}
	h.sendSuccess(c, http.StatusOK, nil)
}

// GetMembers handles GET /api/workspaces/{workspaceId}/members
func (h *WorkspaceHandler) GetMembers(c *gin.Context) {
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

	members, err := h.workspaceService.GetMembers(c.Request.Context(), authUser.ID, workspaceID)
	if err != nil {
		h.sendInternalError(c, "workspace operation")
		return
	}
	h.sendSuccess(c, http.StatusOK, members)
}

// Helper methods
func (h *WorkspaceHandler) sendSuccess(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

// sendError - DEPRECATED: Use HandleError with custom error types instead
func (h *WorkspaceHandler) sendError(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}

// sendInternalError sends a safe internal error response without exposing details
func (h *WorkspaceHandler) sendInternalError(c *gin.Context, operation string) {
	c.JSON(http.StatusInternalServerError, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    errors.ErrCodeInternal,
			Message: "An unexpected error occurred",
		},
	})
}
