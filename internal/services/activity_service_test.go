package services

import (
	"context"
	"testing"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository/mocks"
	"project-management-platform/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func setupActivityService() (*ActivityService, *mocks.ActivityRepository, *testutils.MockUserRepository) {
	mockActivityRepo := new(mocks.ActivityRepository)
	mockUserRepo := new(testutils.MockUserRepository)
	service := NewActivityService(mockActivityRepo, mockUserRepo)
	return service, mockActivityRepo, mockUserRepo
}

func TestActivityService_LogActivity(t *testing.T) {
	service, mockActivityRepo, _ := setupActivityService()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		boardID := primitive.NewObjectID()
		itemID := primitive.NewObjectID()
		activity := &models.Activity{
			WorkspaceID: primitive.NewObjectID(),
			UserID:      primitive.NewObjectID(),
			Type:        "item_created",
			EntityType:  "item",
			EntityID:    primitive.NewObjectID(),
			BoardID:     &boardID, // Use pointer to primitive.ObjectID
			ItemID:      &itemID,  // Add required ItemID for item activities
			Data:        map[string]interface{}{"foo": "bar"},
		}

		mockActivityRepo.On("Create", ctx, mock.MatchedBy(func(act *models.Activity) bool {
			return act.WorkspaceID == activity.WorkspaceID &&
				act.UserID == activity.UserID &&
				act.Type == activity.Type &&
				act.EntityType == activity.EntityType &&
				act.EntityID == activity.EntityID &&
				act.BoardID != nil && *act.BoardID == *activity.BoardID &&
				act.ItemID != nil && *act.ItemID == *activity.ItemID
		})).Return(&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil).Once()

		err := service.LogActivity(ctx, activity)
		assert.NoError(t, err)
		mockActivityRepo.AssertExpectations(t)
	})
}
