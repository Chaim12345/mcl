package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository/mocks"
	"project-management-platform/internal/testutils"
)

func setupWorkspaceMemberService() (*WorkspaceService, *mocks.WorkspaceRepository, *mocks.UserRepository, *testutils.MockEmailService) {
	mockWorkspaceRepo := new(mocks.WorkspaceRepository)
	mockUserRepo := new(mocks.UserRepository)
	mockEmailSvc := new(testutils.MockEmailService)
	service := NewWorkspaceService(mockWorkspaceRepo, mockUserRepo, mockEmailSvc)
	return service, mockWorkspaceRepo, mockUserRepo, mockEmailSvc
}

func TestWorkspaceService_InviteMember(t *testing.T) {
	service, mockWorkspaceRepo, mockUserRepo, _ := setupWorkspaceMemberService()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		workspaceID := primitive.NewObjectID()
		adminUserID := primitive.NewObjectID()
		invitedUser := &models.User{ID: primitive.NewObjectID(), Email: "test@example.com"}
		req := InviteMemberRequest{Email: "test@example.com", Role: "member"}
		workspace := &models.Workspace{ID: workspaceID, OwnerID: adminUserID, Members: []models.WorkspaceMember{{UserID: adminUserID, Role: "admin"}}}

		mockWorkspaceRepo.On("GetByID", ctx, workspaceID).Return(workspace, nil).Once()
		mockUserRepo.On("GetByEmail", ctx, req.Email).Return(invitedUser, nil).Once()
		mockWorkspaceRepo.On("AddMember", ctx, workspaceID, invitedUser.ID, req.Role).Return(nil).Once()
		mockUserRepo.On("GetByID", ctx, adminUserID).Return(&models.User{ID: adminUserID}, nil).Once()
		err := service.InviteMember(ctx, adminUserID, workspaceID, req)
		assert.NoError(t, err)

		mockWorkspaceRepo.AssertExpectations(t)
		mockUserRepo.AssertExpectations(t)
	})
}
