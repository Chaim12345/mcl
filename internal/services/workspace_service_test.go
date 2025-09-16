package services

import (
"context"
"testing"

"github.com/stretchr/testify/assert"
"github.com/stretchr/testify/mock"
"go.mongodb.org/mongo-driver/bson/primitive"
"go.mongodb.org/mongo-driver/mongo"

"project-management-platform/internal/models"
"project-management-platform/internal/repository/mocks"
"project-management-platform/internal/testutils"
)

func setupWorkspaceService() (*WorkspaceService, *mocks.WorkspaceRepository, *mocks.UserRepository, *testutils.MockEmailService) {
mockWorkspaceRepo := new(mocks.WorkspaceRepository)
mockUserRepo := new(mocks.UserRepository)
mockEmailSvc := new(testutils.MockEmailService)
service := NewWorkspaceService(mockWorkspaceRepo, mockUserRepo, mockEmailSvc)
return service, mockWorkspaceRepo, mockUserRepo, mockEmailSvc
}

func TestWorkspaceService_Create(t *testing.T) {
service, mockWorkspaceRepo, mockUserRepo, _ := setupWorkspaceService()
ctx := context.Background()
userID := primitive.NewObjectID()
owner := &models.User{
ID:        userID,
FirstName: "John",
LastName:  "Doe",
Email:     "john.doe@example.com",
}

t.Run("success", func(t *testing.T) {
req := CreateWorkspaceRequest{
Name: "Test Workspace",
}

mockUserRepo.On("GetByID", ctx, userID).Return(owner, nil).Once()
mockWorkspaceRepo.On("Create", ctx, mock.AnythingOfType("*models.Workspace")).Return(&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil).Once()

res, err := service.Create(ctx, userID, req)
assert.NoError(t, err)
assert.NotNil(t, res)
assert.Equal(t, "Test Workspace", res.Name)
mockWorkspaceRepo.AssertExpectations(t)
mockUserRepo.AssertExpectations(t)
})
}
