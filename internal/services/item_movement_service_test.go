package services

import (
	"context"
	"testing"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository/mocks"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func setupItemMovementService() (*ItemMovementService, *mocks.ItemRepository, *mocks.BoardRepository, *mocks.ActivityRepository) {
	mockItemRepo := new(mocks.ItemRepository)
	mockBoardRepo := new(mocks.BoardRepository)
	mockActivityRepo := new(mocks.ActivityRepository)
	service := NewItemMovementService(mockItemRepo, mockBoardRepo, mockActivityRepo)
	return service, mockItemRepo, mockBoardRepo, mockActivityRepo
}

func TestItemMovementService_MoveItem(t *testing.T) {
	service, mockItemRepo, mockBoardRepo, mockActivityRepo := setupItemMovementService()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		userID := primitive.NewObjectID()
		boardID := primitive.NewObjectID()
		itemID := primitive.NewObjectID()
		newColumnID := primitive.NewObjectID()

		movedItem := &models.Item{ID: itemID, Name: "Item 2", Position: 2000, BoardID: boardID}
		boardItems := []*models.Item{
			{ID: primitive.NewObjectID(), Name: "Item 1", Position: 1000, BoardID: boardID},
			movedItem,
			{ID: primitive.NewObjectID(), Name: "Item 3", Position: 3000, BoardID: boardID},
		}

		mockItemRepo.On("GetByID", ctx, itemID).Return(movedItem, nil).Once()
		mockBoardRepo.On("GetByID", ctx, boardID).Return(&models.Board{
			ID: boardID,
			Columns: []models.BoardColumn{
				{ID: newColumnID.Hex(), Name: "New Column", Type: "status"},
			},
		}, nil).Once()
		mockItemRepo.On("GetByBoardID", ctx, boardID).Return(boardItems, nil).Once()

		mockItemRepo.On("Update", ctx, mock.AnythingOfType("primitive.ObjectID"), mock.AnythingOfType("primitive.M")).Return(&mongo.UpdateResult{}, nil).Maybe()

		mockActivityRepo.On("Create", ctx, mock.AnythingOfType("*models.Activity")).Return(&mongo.InsertOneResult{}, nil).Once()

		err := service.MoveItem(ctx, ItemMoveRequest{
			ItemID:       itemID,
			TargetColumn: newColumnID.Hex(),
			NewPosition:  1,
			UserID:       userID,
		})
		assert.NoError(t, err)

		mockItemRepo.AssertExpectations(t)
		mockActivityRepo.AssertExpectations(t)
	})
}
