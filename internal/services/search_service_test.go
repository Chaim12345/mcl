package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository/mocks"
)

func setupSearchService() (*SearchService, *mocks.ItemRepository, *mocks.CommentRepository, *mocks.BoardRepository) {
	mockItemRepo := new(mocks.ItemRepository)
	mockCommentRepo := new(mocks.CommentRepository)
	mockBoardRepo := new(mocks.BoardRepository)

	service := NewSearchService(mockItemRepo, mockCommentRepo, mockBoardRepo)
	return service, mockItemRepo, mockCommentRepo, mockBoardRepo
}

func TestSearchService_SearchItems(t *testing.T) {
	service, mockItemRepo, _, mockBoardRepo := setupSearchService()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		opts := SearchOptions{
			Query: "test",
		}

		// Create test data
		testItems := []*models.Item{
			{
				ID:        primitive.NewObjectID(),
				Name:      "Test Item",
				BoardID:   primitive.NewObjectID(),
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		}

		testBoard := &models.Board{
			ID:          testItems[0].BoardID,
			WorkspaceID: primitive.NewObjectID(),
			Name:        "Test Board",
		}

		mockItemRepo.On("Count", ctx, mock.Anything).Return(int64(1), nil).Once()
		mockItemRepo.On("List", ctx, mock.Anything, mock.AnythingOfType("int64"), mock.AnythingOfType("int64")).Return(testItems, nil).Once()
		mockBoardRepo.On("GetByID", ctx, testItems[0].BoardID).Return(testBoard, nil).Once()

		results, total, err := service.SearchItems(ctx, opts)
		assert.NoError(t, err)
		assert.NotNil(t, results)
		assert.Len(t, results, 1)
		assert.Equal(t, int64(1), total)
		assert.Equal(t, "Test Item", results[0].Title)
		assert.Equal(t, "item", results[0].Type)
		mockItemRepo.AssertExpectations(t)
		mockBoardRepo.AssertExpectations(t)
	})
}
