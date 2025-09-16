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

func setupSavedFilterService() (*SavedFilterService, *mocks.SavedFilterRepository) {
	mockSavedFilterRepo := new(mocks.SavedFilterRepository)
	service := NewSavedFilterService(mockSavedFilterRepo)
	return service, mockSavedFilterRepo
}

func TestSavedFilterService_CreateSavedFilter(t *testing.T) {
	service, mockSavedFilterRepo := setupSavedFilterService()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		filter := &models.SavedFilter{
			Name:        "My Test Filter",
			UserID:      primitive.NewObjectID(),
			WorkspaceID: primitive.NewObjectID(),
			EntityType:  "item",
			Query: models.FilterQuery{
				Logic: models.FilterLogicAnd,
				Groups: []models.FilterGroup{
					{
						Logic: models.FilterLogicAnd,
						Conditions: []models.FilterCondition{
							{
								Field:    "name",
								Operator: models.FilterOpContains,
								Value:    "test",
								Type:     models.FilterFieldTypeText,
							},
						},
					},
				},
			},
			IsPublic: false,
		}

		mockSavedFilterRepo.On("CreateSavedFilter", ctx, mock.MatchedBy(func(f *models.SavedFilter) bool {
			return f.Name == filter.Name &&
				f.UserID == filter.UserID &&
				f.WorkspaceID == filter.WorkspaceID &&
				f.EntityType == filter.EntityType &&
				!f.IsPublic // Ensure IsPublic is set correctly
		})).Return(nil).Once()

		err := service.CreateSavedFilter(ctx, filter)
		assert.NoError(t, err)
		mockSavedFilterRepo.AssertExpectations(t)
	})

	t.Run("error - duplicate name", func(t *testing.T) {
		filter := &models.SavedFilter{
			Name:        "My Test Filter",
			UserID:      primitive.NewObjectID(),
			WorkspaceID: primitive.NewObjectID(),
			EntityType:  "item",
			IsPublic:    false,
		}

		mockSavedFilterRepo.On("CreateSavedFilter", ctx, mock.AnythingOfType("*models.SavedFilter")).Return(mongo.WriteException{}).Once()

		err := service.CreateSavedFilter(ctx, filter)
		assert.Error(t, err)
		mockSavedFilterRepo.AssertExpectations(t)
	})
}
