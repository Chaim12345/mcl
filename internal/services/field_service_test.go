package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository/mocks"
)

func setupFieldService() (*FieldService, *mocks.ItemRepository, *mocks.BoardRepository, *mocks.ActivityRepository) {
	mockItemRepo := new(mocks.ItemRepository)
	mockBoardRepo := new(mocks.BoardRepository)
	mockActivityRepo := new(mocks.ActivityRepository)

	service := NewFieldService(mockItemRepo, mockBoardRepo, mockActivityRepo)
	return service, mockItemRepo, mockBoardRepo, mockActivityRepo
}

func TestFieldService_SetItemFieldValue(t *testing.T) {
	service, mockItemRepo, mockBoardRepo, mockActivityRepo := setupFieldService()

	ctx := context.Background()
	itemID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()
	columnID := "test_column"
	newValue := "new_value"

	item := &models.Item{
		ID:          itemID,
		BoardID:     boardID,
		FieldValues: []models.ItemFieldValue{},
	}

	board := &models.Board{
		ID: boardID,
		Columns: []models.BoardColumn{
			{ID: columnID, Name: "Test Column", Type: "text"},
		},
	}

	t.Run("success", func(t *testing.T) {
		mockItemRepo.On("GetByID", ctx, itemID).Return(item, nil).Once()
		mockBoardRepo.On("GetByID", ctx, boardID).Return(board, nil).Once()
		mockItemRepo.On("Update", ctx, itemID, mock.AnythingOfType("primitive.M")).Return(nil, nil).Once()
		mockActivityRepo.On("Create", ctx, mock.AnythingOfType("*models.Activity")).Return(nil, nil).Once()

		err := service.SetItemFieldValue(ctx, itemID, columnID, newValue, userID)
		assert.NoError(t, err)

		mockItemRepo.AssertExpectations(t)
		mockBoardRepo.AssertExpectations(t)
		mockActivityRepo.AssertExpectations(t)
	})
}
