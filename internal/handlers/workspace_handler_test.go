package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// Mock workspace service for testing
type mockWorkspaceService struct {
	workspaces map[primitive.ObjectID]*services.WorkspaceResponse
	members    map[primitive.ObjectID][]*services.MemberResponse
	nextID     primitive.ObjectID
}

func newMockWorkspaceService() *mockWorkspaceService {
	return &mockWorkspaceService{
		workspaces: make(map[primitive.ObjectID]*services.WorkspaceResponse),
		members:    make(map[primitive.ObjectID][]*services.MemberResponse),
		nextID:     primitive.NewObjectID(),
	}
}

func (m *mockWorkspaceService) Create(ctx context.Context, userID primitive.ObjectID, req services.CreateWorkspaceRequest) (*services.WorkspaceResponse, error) {
	workspace := &services.WorkspaceResponse{
		ID:          m.nextID.Hex(),
		Name:        req.Name,
		Description: req.Description,
		Logo:        req.Logo,
		OwnerID:     userID.Hex(),
		Members: []models.WorkspaceMember{
			{
				UserID:   userID,
				Role:     models.WorkspaceRoleAdmin,
				JoinedAt: time.Time{},
			},
		},
		Settings: models.WorkspaceSettings{
			Visibility:   models.WorkspaceVisibilityPrivate,
			AllowInvites: true,
		},
	}

	m.workspaces[m.nextID] = workspace
	m.nextID = primitive.NewObjectID()

	return workspace, nil
}

func (m *mockWorkspaceService) GetByID(ctx context.Context, userID, workspaceID primitive.ObjectID) (*services.WorkspaceResponse, error) {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return nil, fmt.Errorf("workspace not found")
	}

	// Check if user is a member
	isMember := false
	for _, member := range workspace.Members {
		if member.UserID == userID {
			isMember = true
			break
		}
	}

	if !isMember {
		return nil, fmt.Errorf("access denied: user is not a member of this workspace")
	}

	return workspace, nil
}

func (m *mockWorkspaceService) GetByUserID(ctx context.Context, userID primitive.ObjectID) ([]*services.WorkspaceResponse, error) {
	var result []*services.WorkspaceResponse
	for _, workspace := range m.workspaces {
		for _, member := range workspace.Members {
			if member.UserID == userID {
				result = append(result, workspace)
				break
			}
		}
	}
	return result, nil
}

func (m *mockWorkspaceService) Update(ctx context.Context, userID, workspaceID primitive.ObjectID, req services.UpdateWorkspaceRequest) (*services.WorkspaceResponse, error) {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return nil, fmt.Errorf("workspace not found")
	}

	// Check if user is admin
	isAdmin := false
	for _, member := range workspace.Members {
		if member.UserID == userID && (member.Role == models.WorkspaceRoleAdmin || workspace.OwnerID == userID.Hex()) {
			isAdmin = true
			break
		}
	}

	if !isAdmin {
		return nil, fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Apply updates
	if req.Name != nil {
		workspace.Name = *req.Name
	}
	if req.Description != nil {
		workspace.Description = *req.Description
	}
	if req.Logo != nil {
		workspace.Logo = *req.Logo
	}

	return workspace, nil
}

func (m *mockWorkspaceService) Delete(ctx context.Context, userID, workspaceID primitive.ObjectID) error {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return fmt.Errorf("workspace not found")
	}

	if workspace.OwnerID != userID.Hex() {
		return fmt.Errorf("access denied: only workspace owner can delete workspace")
	}

	delete(m.workspaces, workspaceID)
	return nil
}

func (m *mockWorkspaceService) List(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*services.WorkspaceResponse, int64, error) {
	workspaces, _ := m.GetByUserID(ctx, userID)
	total := int64(len(workspaces))

	// Apply pagination
	start := skip
	end := skip + limit

	if start >= total {
		return []*services.WorkspaceResponse{}, total, nil
	}

	if end > total {
		end = total
	}

	return workspaces[start:end], total, nil
}

func (m *mockWorkspaceService) InviteMember(ctx context.Context, userID, workspaceID primitive.ObjectID, req services.InviteMemberRequest) error {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return fmt.Errorf("workspace not found")
	}

	// Check if user is admin
	isAdmin := false
	for _, member := range workspace.Members {
		if member.UserID == userID && (member.Role == models.WorkspaceRoleAdmin || workspace.OwnerID == userID.Hex()) {
			isAdmin = true
			break
		}
	}

	if !isAdmin {
		return fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Add member (simplified)
	newMemberID := primitive.NewObjectID()
	workspace.Members = append(workspace.Members, models.WorkspaceMember{
		UserID:   newMemberID,
		Role:     req.Role,
		JoinedAt: time.Time{},
	})

	return nil
}

func (m *mockWorkspaceService) RemoveMember(ctx context.Context, userID, workspaceID, memberUserID primitive.ObjectID) error {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return fmt.Errorf("workspace not found")
	}

	if workspace.OwnerID == memberUserID.Hex() {
		return fmt.Errorf("cannot remove workspace owner")
	}

	// Check permissions
	isAdmin := false
	for _, member := range workspace.Members {
		if member.UserID == userID && (member.Role == models.WorkspaceRoleAdmin || workspace.OwnerID == userID.Hex()) {
			isAdmin = true
			break
		}
	}

	if !isAdmin && userID != memberUserID {
		return fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Remove member
	for i, member := range workspace.Members {
		if member.UserID == memberUserID {
			workspace.Members = append(workspace.Members[:i], workspace.Members[i+1:]...)
			break
		}
	}

	return nil
}

func (m *mockWorkspaceService) UpdateMemberRole(ctx context.Context, userID, workspaceID, memberUserID primitive.ObjectID, req services.UpdateMemberRoleRequest) error {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return fmt.Errorf("workspace not found")
	}

	if workspace.OwnerID == memberUserID.Hex() {
		return fmt.Errorf("cannot change workspace owner's role")
	}

	// Check if user is admin
	isAdmin := false
	for _, member := range workspace.Members {
		if member.UserID == userID && (member.Role == models.WorkspaceRoleAdmin || workspace.OwnerID == userID.Hex()) {
			isAdmin = true
			break
		}
	}

	if !isAdmin {
		return fmt.Errorf("access denied: user is not an admin of this workspace")
	}

	// Update role
	for i, member := range workspace.Members {
		if member.UserID == memberUserID {
			workspace.Members[i].Role = req.Role
			break
		}
	}

	return nil
}

func (m *mockWorkspaceService) GetMembers(ctx context.Context, userID, workspaceID primitive.ObjectID) ([]*services.MemberResponse, error) {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return nil, fmt.Errorf("workspace not found")
	}

	// Check if user is a member
	isMember := false
	for _, member := range workspace.Members {
		if member.UserID == userID {
			isMember = true
			break
		}
	}

	if !isMember {
		return nil, fmt.Errorf("access denied: user is not a member of this workspace")
	}

	// Return mock members
	members := []*services.MemberResponse{
		{
			UserID: userID.Hex(),
			Email:  "test@example.com",
			Name:   "Test User",
			Role:   models.WorkspaceRoleAdmin,
		},
	}

	return members, nil
}

func (m *mockWorkspaceService) LeaveWorkspace(ctx context.Context, userID, workspaceID primitive.ObjectID) error {
	workspace, exists := m.workspaces[workspaceID]
	if !exists {
		return fmt.Errorf("workspace not found")
	}

	if workspace.OwnerID == userID.Hex() {
		return fmt.Errorf("workspace owner cannot leave workspace. Transfer ownership or delete the workspace instead")
	}

	// Remove user from members
	for i, member := range workspace.Members {
		if member.UserID == userID {
			workspace.Members = append(workspace.Members[:i], workspace.Members[i+1:]...)
			break
		}
	}

	return nil
}

func setupWorkspaceHandler() (*WorkspaceHandler, *mockWorkspaceService) {
	mockService := newMockWorkspaceService()
	handler := NewWorkspaceHandler(mockService)
	return handler, mockService
}

func createRequestWithAuth(method, url string, body interface{}, userID primitive.ObjectID) *http.Request {
	var reqBody []byte
	if body != nil {
		reqBody, _ = json.Marshal(body)
	}

	req := httptest.NewRequest(method, url, bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	// Add user to context
	user := &auth.AuthenticatedUser{ID: userID}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	return req
}

func TestWorkspaceHandler_CreateWorkspace(t *testing.T) {
	handler, _ := setupWorkspaceHandler()
	userID := primitive.NewObjectID()

	tests := []struct {
		name           string
		body           interface{}
		expectedStatus int
		expectSuccess  bool
	}{
		{
			name: "valid workspace",
			body: services.CreateWorkspaceRequest{
				Name:        "Test Workspace",
				Description: "Test Description",
			},
			expectedStatus: http.StatusCreated,
			expectSuccess:  true,
		},
		{
			name: "empty name",
			body: services.CreateWorkspaceRequest{
				Name:        "",
				Description: "Test Description",
			},
			expectedStatus: http.StatusBadRequest,
			expectSuccess:  false,
		},
		{
			name:           "invalid body",
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectSuccess:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			bodyBytes, _ := json.Marshal(tt.body)
			c.Request = httptest.NewRequest("POST", "/api/workspaces", bytes.NewBuffer(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")

			// Set user in context
			authUser := &auth.AuthenticatedUser{
				ID:    userID,
				Email: "test@example.com",
			}
			c.Set(auth.UserContextKey, authUser)

			handler.CreateWorkspace(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			var response APIResponse
			json.NewDecoder(w.Body).Decode(&response)

			if response.Success != tt.expectSuccess {
				t.Errorf("Expected success %v, got %v", tt.expectSuccess, response.Success)
			}
		})
	}
}

func TestWorkspaceHandler_GetWorkspace(t *testing.T) {
	handler, mockService := setupWorkspaceHandler()
	userID := primitive.NewObjectID()

	// Create a test workspace
	workspace, _ := mockService.Create(context.Background(), userID, services.CreateWorkspaceRequest{
		Name: "Test Workspace",
	})
	_, _ = primitive.ObjectIDFromHex(workspace.ID)

	tests := []struct {
		name           string
		workspaceID    string
		userID         primitive.ObjectID
		expectedStatus int
		expectSuccess  bool
	}{
		{
			name:           "valid request",
			workspaceID:    workspace.ID,
			userID:         userID,
			expectedStatus: http.StatusOK,
			expectSuccess:  true,
		},
		{
			name:           "invalid workspace ID",
			workspaceID:    "invalid",
			userID:         userID,
			expectedStatus: http.StatusBadRequest,
			expectSuccess:  false,
		},
		{
			name:           "non-member access",
			workspaceID:    workspace.ID,
			userID:         primitive.NewObjectID(),
			expectedStatus: http.StatusForbidden,
			expectSuccess:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			c.Request = httptest.NewRequest("GET", "/api/workspaces/"+tt.workspaceID, nil)
			c.Params = gin.Params{gin.Param{Key: "id", Value: tt.workspaceID}}

			// Set user in context
			authUser := &auth.AuthenticatedUser{
				ID:    tt.userID,
				Email: "test@example.com",
			}
			c.Set(auth.UserContextKey, authUser)

			handler.GetWorkspace(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			var response APIResponse
			json.NewDecoder(w.Body).Decode(&response)

			if response.Success != tt.expectSuccess {
				t.Errorf("Expected success %v, got %v", tt.expectSuccess, response.Success)
			}
		})
	}
}

func TestWorkspaceHandler_InviteMember_DISABLED(t *testing.T) {
	t.Skip("InviteMember handler method not implemented yet")
}
