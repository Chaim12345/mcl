package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository/mocks"
)

func TestFilterService_FilterItems(t *testing.T) {
	mockItemRepo := new(mocks.ItemRepository)
	mockCommentRepo := new(mocks.CommentRepository)
	mockBoardRepo := new(mocks.BoardRepository)
	mockActivityRepo := new(mocks.ActivityRepository)
	mockSearchService := new(SearchService) // Assuming SearchService doesn't have an interface/mock

	service := NewFilterService(
		mockItemRepo,
		mockCommentRepo,
		mockBoardRepo,
		mockActivityRepo,
		mockSearchService,
	)

	ctx := context.Background()
	workspaceID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	// Mock data
	mockItems := []*models.Item{
		{
			ID:      primitive.NewObjectID(),
			Name:    "Test Item 1",
			BoardID: boardID,
		},
		{
			ID:      primitive.NewObjectID(),
			Name:    "Test Item 2",
			BoardID: boardID,
		},
	}

	// Set up mock expectations
	mockItemRepo.On("FindWithFilter", ctx, mock.MatchedBy(func(filter bson.M) bool {
		// Expecting a filter that includes both name and boardId
		return filter["$and"] != nil
	}), mock.Anything).Return(mockItems, nil).Once()
	mockItemRepo.On("CountWithFilter", ctx, mock.MatchedBy(func(filter bson.M) bool {
		// Expecting a filter that includes both name and boardId
		return filter["$and"] != nil
	})).Return(int64(2), nil).Once()

	filterQuery := models.FilterQuery{
		Logic: models.FilterLogicAnd,
		Groups: []models.FilterGroup{
			{
				Logic: models.FilterLogicAnd,
				Conditions: []models.FilterCondition{
					{
						Field:    "name",
						Operator: models.FilterOpEquals,
						Value:    "Test",
						Type:     models.FilterFieldTypeText,
					},
				},
			},
		},
	}

	options := models.FilterOptions{
		Limit:       10,
		Skip:        0,
		WorkspaceID: workspaceID,
		BoardIDs:    []primitive.ObjectID{boardID},
	}

	result, err := service.FilterItems(ctx, filterQuery, options)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	assert.Len(t, result.Items, 2)
	assert.Equal(t, int64(2), result.TotalCount)
	assert.False(t, result.HasMore)
	mockItemRepo.AssertExpectations(t)
}
