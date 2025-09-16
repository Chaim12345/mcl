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
)

func setupItemService() (*ItemService, *mocks.ItemRepository, *mocks.BoardRepository, *mocks.WorkspaceRepository) {
	mockItemRepo := new(mocks.ItemRepository)
	mockBoardRepo := new(mocks.BoardRepository)
	mockWorkspaceRepo := new(mocks.WorkspaceRepository)
	service := NewItemService(mockItemRepo, mockBoardRepo, mockWorkspaceRepo)
	return service, mockItemRepo, mockBoardRepo, mockWorkspaceRepo
}

func TestItemService_Create(t *testing.T) {
	service, mockItemRepo, mockBoardRepo, mockWorkspaceRepo := setupItemService()
	ctx := context.Background()
	boardID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	t.Run("success", func(t *testing.T) {
		req := CreateItemRequest{
			Name: "Test Item",
		}

		mockBoardRepo.On("GetByID", ctx, boardID).Return(&models.Board{ID: boardID, WorkspaceID: workspaceID}, nil).Once()
		mockWorkspaceRepo.On("GetByID", ctx, workspaceID).Return(&models.Workspace{
			ID: workspaceID,
			Members: []models.WorkspaceMember{
				{UserID: userID, Role: "admin"},
			},
		}, nil).Once()
		mockItemRepo.On("Count", ctx, mock.AnythingOfType("primitive.M")).Return(int64(0), nil).Once()
		mockItemRepo.On("Create", ctx, mock.AnythingOfType("*models.Item")).Return(&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil).Once()

		_, err := service.Create(ctx, userID, boardID, req)
		assert.NoError(t, err)

		mockBoardRepo.AssertExpectations(t)
		mockWorkspaceRepo.AssertExpectations(t)
		mockItemRepo.AssertExpectations(t)
	})
}
