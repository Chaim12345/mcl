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

func setupCommentService() (*CommentService, *mocks.CommentRepository, *mocks.ActivityRepository, *mocks.NotificationRepository, *mocks.UserRepository, *mocks.ItemRepository, *mocks.BoardRepository) {
	mockCommentRepo := new(mocks.CommentRepository)
	mockActivityRepo := new(mocks.ActivityRepository)
	mockNotificationRepo := new(mocks.NotificationRepository)
	mockUserRepo := new(mocks.UserRepository)
	mockItemRepo := new(mocks.ItemRepository)
	mockBoardRepo := new(mocks.BoardRepository)
	service := NewCommentService(
		mockCommentRepo,
		mockActivityRepo,
		mockNotificationRepo,
		mockUserRepo,
		mockItemRepo,
		mockBoardRepo,
	)
	return service, mockCommentRepo, mockActivityRepo, mockNotificationRepo, mockUserRepo, mockItemRepo, mockBoardRepo
}

func TestCommentService_CreateComment(t *testing.T) {
	service, mockCommentRepo, mockActivityRepo, mockNotificationRepo, mockUserRepo, mockItemRepo, mockBoardRepo := setupCommentService()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		comment := &models.Comment{
			Content:  "Test comment",
			ItemID:   primitive.NewObjectID(),
			AuthorID: primitive.NewObjectID(),
		}

		// Mock author user
		mockAuthor := &models.User{
			ID:        comment.AuthorID,
			FirstName: "Test",
			LastName:  "Author",
			Email:     "test@example.com",
		}

		// Mock item to provide BoardID
		mockItem := &models.Item{
			ID:      comment.ItemID,
			BoardID: primitive.NewObjectID(),
			Name:    "Test Item",
		}

		// Mock board for activity logging
		mockBoard := &models.Board{
			ID:          mockItem.BoardID,
			WorkspaceID: primitive.NewObjectID(),
			Name:        "Test Board",
		}

		mockUserRepo.On("GetByID", ctx, comment.AuthorID).Return(mockAuthor, nil).Once()
		mockItemRepo.On("GetByID", ctx, comment.ItemID).Return(mockItem, nil).Once()
		mockBoardRepo.On("GetByID", ctx, mockItem.BoardID).Return(mockBoard, nil).Once()
		mockCommentRepo.On("Create", ctx, mock.MatchedBy(func(c *models.Comment) bool {
			return c.Content == comment.Content &&
				c.ItemID == comment.ItemID &&
				c.AuthorID == comment.AuthorID
		})).Return(&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil).Once()
		mockActivityRepo.On("Create", ctx, mock.AnythingOfType("*models.Activity")).Return(&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil).Once()
		// Mock notification creation (might be called for mentions)
		mockNotificationRepo.On("Create", ctx, mock.AnythingOfType("*models.Notification")).Return(&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil).Maybe()

		res, err := service.Create(ctx, comment.Content, comment.ItemID, comment.AuthorID, comment.ParentID)
		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, "Test comment", res.Content)
		mockUserRepo.AssertExpectations(t)
		mockCommentRepo.AssertExpectations(t)
		mockActivityRepo.AssertExpectations(t)
		mockItemRepo.AssertExpectations(t)
		mockBoardRepo.AssertExpectations(t)
		mockNotificationRepo.AssertExpectations(t)
	})
}
