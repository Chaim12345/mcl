package services

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// SavedFilterService handles saved filter operations
type SavedFilterService struct {
	savedFilterRepo repository.SavedFilterRepository
}

// NewSavedFilterService creates a new saved filter service
func NewSavedFilterService(savedFilterRepo repository.SavedFilterRepository) *SavedFilterService {
	return &SavedFilterService{
		savedFilterRepo: savedFilterRepo,
	}
}

// CreateSavedFilter creates a new saved filter
func (sfs *SavedFilterService) CreateSavedFilter(ctx context.Context, filter *models.SavedFilter) error {
	return sfs.savedFilterRepo.CreateSavedFilter(ctx, filter)
}

// GetSavedFilter retrieves a saved filter by ID
func (sfs *SavedFilterService) GetSavedFilter(ctx context.Context, filterID primitive.ObjectID) (*models.SavedFilter, error) {
	return sfs.savedFilterRepo.GetSavedFilter(ctx, filterID)
}

// GetSavedFilterByName retrieves a saved filter by name for a specific user, workspace, and entity type
func (sfs *SavedFilterService) GetSavedFilterByName(ctx context.Context, userID, workspaceID primitive.ObjectID, entityType, name string) (*models.SavedFilter, error) {
	return sfs.savedFilterRepo.GetSavedFilterByName(ctx, userID, workspaceID, entityType, name)
}

// GetUserSavedFilters retrieves all saved filters for a user in a workspace
func (sfs *SavedFilterService) GetUserSavedFilters(ctx context.Context, userID, workspaceID primitive.ObjectID, entityType string) ([]*models.SavedFilter, error) {
	return sfs.savedFilterRepo.GetUserSavedFilters(ctx, userID, workspaceID, entityType)
}

// GetPublicSavedFilters retrieves all public saved filters for a workspace
func (sfs *SavedFilterService) GetPublicSavedFilters(ctx context.Context, workspaceID primitive.ObjectID, entityType string) ([]*models.SavedFilter, error) {
	return sfs.savedFilterRepo.GetPublicSavedFilters(ctx, workspaceID, entityType)
}

// UpdateSavedFilter updates an existing saved filter
func (sfs *SavedFilterService) UpdateSavedFilter(ctx context.Context, filterID primitive.ObjectID, updates *models.SavedFilter) error {
	return sfs.savedFilterRepo.UpdateSavedFilter(ctx, filterID, updates)
}

// DeleteSavedFilter deletes a saved filter
func (sfs *SavedFilterService) DeleteSavedFilter(ctx context.Context, filterID, userID primitive.ObjectID) error {
	return sfs.savedFilterRepo.DeleteSavedFilter(ctx, filterID, userID)
}

// IncrementUsageCount increments the usage count for a saved filter
func (sfs *SavedFilterService) IncrementUsageCount(ctx context.Context, filterID primitive.ObjectID) error {
	return sfs.savedFilterRepo.IncrementUsageCount(ctx, filterID)
}

// GetMostUsedFilters retrieves the most popular saved filters for a workspace
func (sfs *SavedFilterService) GetMostUsedFilters(ctx context.Context, workspaceID primitive.ObjectID, entityType string, limit int64) ([]*models.SavedFilter, error) {
	return sfs.savedFilterRepo.GetMostUsedFilters(ctx, workspaceID, entityType, limit)
}

// DuplicateSavedFilter creates a copy of an existing saved filter.
func (sfs *SavedFilterService) DuplicateSavedFilter(ctx context.Context, filterID, newUserID primitive.ObjectID, newName string) (*models.SavedFilter, error) {
	return sfs.savedFilterRepo.DuplicateSavedFilter(ctx, filterID, newUserID, newName)
}

// CreateIndexes creates necessary indexes for saved filters
func (sfs *SavedFilterService) CreateIndexes(ctx context.Context) error {
	return sfs.savedFilterRepo.CreateIndexes(ctx)
}
