package services

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// FilterService handles filtering operations across different entities
type FilterService struct {
	itemRepo      repository.ItemRepository
	commentRepo   repository.CommentRepository
	boardRepo     repository.BoardRepository
	activityRepo  repository.ActivityRepository
	searchService *SearchService
}

// NewFilterService creates a new filter service
func NewFilterService(
	itemRepo repository.ItemRepository,
	commentRepo repository.CommentRepository,
	boardRepo repository.BoardRepository,
	activityRepo repository.ActivityRepository,
	searchService *SearchService,
) *FilterService {
	return &FilterService{
		itemRepo:      itemRepo,
		commentRepo:   commentRepo,
		boardRepo:     boardRepo,
		activityRepo:  activityRepo,
		searchService: searchService,
	}
}

// FilterItems filters items based on the provided filter query
func (fs *FilterService) FilterItems(ctx context.Context, filterQuery models.FilterQuery, options models.FilterOptions) (*models.FilterResult, error) {
	startTime := time.Now()

	// Build MongoDB query from filter
	builder := NewFilterBuilder("item")
	query, err := builder.BuildQuery(filterQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to build filter query: %w", err)
	}

	// Add workspace filtering
	query = builder.CombineWithWorkspaceFilter(query, options.WorkspaceID)

	// Add board filtering if specified
	query = builder.CombineWithBoardFilter(query, options.BoardIDs)

	// Set up find options
	findOptions := options.BuildFindOptions()

	// Execute query
	items, err := fs.itemRepo.FindWithFilter(ctx, query, findOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to execute filter query: %w", err)
	}

	// Get total count
	totalCount, err := fs.itemRepo.CountWithFilter(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to count filtered items: %w", err)
	}

	// Convert to interface slice
	result := make([]interface{}, len(items))
	for i, item := range items {
		result[i] = item
	}

	return &models.FilterResult{
		Items:      result,
		TotalCount: totalCount,
		HasMore:    int64(len(items)) == options.Limit && totalCount > options.Skip+options.Limit,
		Query:      filterQuery,
		TimeTaken:  time.Since(startTime),
	}, nil
} // FilterComments filters comments based on the provided filter query
func (fs *FilterService) FilterComments(ctx context.Context, filterQuery models.FilterQuery, options models.FilterOptions) (*models.FilterResult, error) {
	startTime := time.Now()

	// Build MongoDB query from filter
	builder := NewFilterBuilder("comment")
	query, err := builder.BuildQuery(filterQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to build filter query: %w", err)
	}

	// For now, skip workspace filtering for comments - TODO: implement proper workspace filtering
	// This is a simplified implementation that will be improved later

	// Simple query without workspace filtering
	findOptions := options.BuildFindOptions()
	comments, err := fs.commentRepo.FindWithFilter(ctx, query, findOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to execute filter query: %w", err)
	}

	totalCount, err := fs.commentRepo.CountWithFilter(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to count filtered comments: %w", err)
	}

	result := make([]interface{}, len(comments))
	for i, comment := range comments {
		result[i] = comment
	}

	return &models.FilterResult{
		Items:      result,
		TotalCount: totalCount,
		HasMore:    int64(len(comments)) == options.Limit && totalCount > options.Skip+options.Limit,
		Query:      filterQuery,
		TimeTaken:  time.Since(startTime),
	}, nil
} // FilterBoards filters boards based on the provided filter query
func (fs *FilterService) FilterBoards(ctx context.Context, filterQuery models.FilterQuery, options models.FilterOptions) (*models.FilterResult, error) {
	startTime := time.Now()

	// Build MongoDB query from filter
	builder := NewFilterBuilder("board")
	query, err := builder.BuildQuery(filterQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to build filter query: %w", err)
	}

	// Add workspace filtering
	query = builder.CombineWithWorkspaceFilter(query, options.WorkspaceID)

	// Set up find options
	findOptions := options.BuildFindOptions()

	// Execute query
	boards, err := fs.boardRepo.FindWithFilter(ctx, query, findOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to execute filter query: %w", err)
	}

	// Get total count
	totalCount, err := fs.boardRepo.CountWithFilter(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to count filtered boards: %w", err)
	}

	// Convert to interface slice
	result := make([]interface{}, len(boards))
	for i, board := range boards {
		result[i] = board
	}

	return &models.FilterResult{
		Items:      result,
		TotalCount: totalCount,
		HasMore:    int64(len(boards)) == options.Limit && totalCount > options.Skip+options.Limit,
		Query:      filterQuery,
		TimeTaken:  time.Since(startTime),
	}, nil
}

// FilterActivities filters activities based on the provided filter query
func (fs *FilterService) FilterActivities(ctx context.Context, filterQuery models.FilterQuery, options models.FilterOptions) (*models.FilterResult, error) {
	startTime := time.Now()

	// Build MongoDB query from filter
	builder := NewFilterBuilder("activity")
	query, err := builder.BuildQuery(filterQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to build filter query: %w", err)
	}

	// Add workspace filtering
	query = builder.CombineWithWorkspaceFilter(query, options.WorkspaceID)

	// Set up find options
	findOptions := options.BuildFindOptions()

	// Execute query
	activities, err := fs.activityRepo.FindWithFilter(ctx, query, findOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to execute filter query: %w", err)
	}

	// Get total count
	totalCount, err := fs.activityRepo.CountWithFilter(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to count filtered activities: %w", err)
	}

	// Convert to interface slice
	result := make([]interface{}, len(activities))
	for i, activity := range activities {
		result[i] = activity
	}

	return &models.FilterResult{
		Items:      result,
		TotalCount: totalCount,
		HasMore:    int64(len(activities)) == options.Limit && totalCount > options.Skip+options.Limit,
		Query:      filterQuery,
		TimeTaken:  time.Since(startTime),
	}, nil
} // CombineSearchAndFilter combines search functionality with filtering
func (fs *FilterService) CombineSearchAndFilter(ctx context.Context, entityType string, searchQuery string, filterQuery models.FilterQuery, options models.FilterOptions) (*models.FilterResult, error) {
	startTime := time.Now()

	// If no search query, just use filtering
	if searchQuery == "" {
		switch entityType {
		case "item":
			return fs.FilterItems(ctx, filterQuery, options)
		case "comment":
			return fs.FilterComments(ctx, filterQuery, options)
		case "board":
			return fs.FilterBoards(ctx, filterQuery, options)
		case "activity":
			return fs.FilterActivities(ctx, filterQuery, options)
		default:
			return nil, fmt.Errorf("unsupported entity type: %s", entityType)
		}
	}

	// Build filter query
	builder := NewFilterBuilder(entityType)
	filterBson, err := builder.BuildQuery(filterQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to build filter query: %w", err)
	}

	// Add workspace filtering
	filterBson = builder.CombineWithWorkspaceFilter(filterBson, options.WorkspaceID)

	// Add board filtering if specified
	filterBson = builder.CombineWithBoardFilter(filterBson, options.BoardIDs)

	// Combine search and filter queries
	var combinedQuery bson.M
	if len(filterBson) > 0 {
		combinedQuery = bson.M{
			"$and": []bson.M{
				{"$text": bson.M{"$search": searchQuery}},
				filterBson,
			},
		}
	} else {
		combinedQuery = bson.M{"$text": bson.M{"$search": searchQuery}}
	}

	// Execute combined query based on entity type
	switch entityType {
	case "item":
		findOptions := options.BuildFindOptions()
		// Add text score sorting for search relevance
		if findOptions.Sort == nil {
			findOptions.Sort = bson.M{"score": bson.M{"$meta": "textScore"}}
		}

		items, err := fs.itemRepo.FindWithFilter(ctx, combinedQuery, findOptions)
		if err != nil {
			return nil, fmt.Errorf("failed to execute combined search and filter: %w", err)
		}

		totalCount, err := fs.itemRepo.CountWithFilter(ctx, combinedQuery)
		if err != nil {
			return nil, fmt.Errorf("failed to count search and filter results: %w", err)
		}

		result := make([]interface{}, len(items))
		for i, item := range items {
			result[i] = item
		}

		return &models.FilterResult{
			Items:      result,
			TotalCount: totalCount,
			HasMore:    int64(len(items)) == options.Limit && totalCount > options.Skip+options.Limit,
			Query:      filterQuery,
			TimeTaken:  time.Since(startTime),
		}, nil

	default:
		return nil, fmt.Errorf("combined search and filter not yet implemented for entity type: %s", entityType)
	}
} // ValidateFilterQuery validates a filter query for a specific entity type
func (fs *FilterService) ValidateFilterQuery(entityType string, filterQuery models.FilterQuery) error {
	// Validate the basic structure
	if err := filterQuery.Validate(); err != nil {
		return err
	}

	// Validate field names are valid for the entity type
	for _, group := range filterQuery.Groups {
		for _, condition := range group.Conditions {
			if !fs.isValidFieldForEntity(entityType, condition.Field) {
				return fmt.Errorf("field '%s' is not valid for entity type '%s'", condition.Field, entityType)
			}
		}
	}

	return nil
}

// isValidFieldForEntity checks if a field is valid for a specific entity type
func (fs *FilterService) isValidFieldForEntity(entityType, field string) bool {
	switch entityType {
	case "item":
		validFields := []string{
			"id", "_id", "name", "boardId", "board_id", "position",
			"createdAt", "created_at", "updatedAt", "updated_at",
			"assignees", "watchers", "status", "priority", "description",
			"category", "tags", "labels", "type", "severity", "effort",
		}
		return contains(validFields, field)

	case "comment":
		validFields := []string{
			"id", "_id", "content", "itemId", "item_id", "authorId", "author_id",
			"parentId", "parent_id", "createdAt", "created_at", "updatedAt", "updated_at",
			"mentions", "attachments",
		}
		return contains(validFields, field)

	case "board":
		validFields := []string{
			"id", "_id", "name", "description", "workspaceId", "workspace_id",
			"createdAt", "created_at", "updatedAt", "updated_at", "permissions",
		}
		return contains(validFields, field)

	case "activity":
		validFields := []string{
			"id", "_id", "type", "userId", "user_id", "workspaceId", "workspace_id",
			"entityType", "entity_type", "entityId", "entity_id",
			"createdAt", "created_at", "details",
		}
		return contains(validFields, field)

	default:
		return false
	}
}
