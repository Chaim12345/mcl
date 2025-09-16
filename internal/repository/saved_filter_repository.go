package repository

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"project-management-platform/internal/models"
)

// savedFilterRepository implements SavedFilterRepository interface
type savedFilterRepository struct {
	collection *mongo.Collection
}

// NewSavedFilterRepository creates a new saved filter repository
func NewSavedFilterRepository(db *mongo.Database) SavedFilterRepository {
	return &savedFilterRepository{
		collection: db.Collection("saved_filters"),
	}
}

// CreateSavedFilter creates a new saved filter
func (r *savedFilterRepository) CreateSavedFilter(ctx context.Context, filter *models.SavedFilter) error {
	// Implement creation logic here
	// This should be similar to how other Create methods are implemented
	// For now, a placeholder implementation:
	_, err := r.collection.InsertOne(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to create saved filter: %w", err)
	}
	return nil
}

// GetSavedFilter retrieves a saved filter by ID
func (r *savedFilterRepository) GetSavedFilter(ctx context.Context, filterID primitive.ObjectID) (*models.SavedFilter, error) {
	var filter models.SavedFilter
	err := r.collection.FindOne(ctx, bson.M{"_id": filterID}).Decode(&filter)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("saved filter not found")
		}
		return nil, fmt.Errorf("failed to get saved filter: %w", err)
	}
	return &filter, nil
}

// GetSavedFilterByName retrieves a saved filter by name for a specific user
func (r *savedFilterRepository) GetSavedFilterByName(ctx context.Context, userID, workspaceID primitive.ObjectID, entityType, name string) (*models.SavedFilter, error) {
	var filter models.SavedFilter
	query := bson.M{
		"userId":      userID,
		"workspaceId": workspaceID,
		"entityType":  entityType,
		"name":        name,
	}
	err := r.collection.FindOne(ctx, query).Decode(&filter)
	if err != nil {
		return nil, err // Return mongo.ErrNoDocuments if not found
	}
	return &filter, nil
}

// GetUserSavedFilters retrieves all saved filters for a user in a workspace
func (r *savedFilterRepository) GetUserSavedFilters(ctx context.Context, userID, workspaceID primitive.ObjectID, entityType string) ([]*models.SavedFilter, error) {
	query := bson.M{
		"userId":      userID,
		"workspaceId": workspaceID,
	}
	if entityType != "" {
		query["entityType"] = entityType
	}
	opts := options.Find().SetSort(bson.M{"usageCount": -1, "name": 1})
	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get user saved filters: %w", err)
	}
	defer cursor.Close(ctx)

	var filters []*models.SavedFilter
	for cursor.Next(ctx) {
		var filter models.SavedFilter
		if err := cursor.Decode(&filter); err != nil {
			return nil, fmt.Errorf("failed to decode saved filter: %w", err)
		}
		filters = append(filters, &filter)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}
	return filters, nil
}

// GetPublicSavedFilters retrieves all public saved filters in a workspace
func (r *savedFilterRepository) GetPublicSavedFilters(ctx context.Context, workspaceID primitive.ObjectID, entityType string) ([]*models.SavedFilter, error) {
	query := bson.M{
		"workspaceId": workspaceID,
		"isPublic":    true,
	}
	if entityType != "" {
		query["entityType"] = entityType
	}
	opts := options.Find().SetSort(bson.M{"usageCount": -1, "name": 1})
	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get public saved filters: %w", err)
	}
	defer cursor.Close(ctx)

	var filters []*models.SavedFilter
	for cursor.Next(ctx) {
		var filter models.SavedFilter
		if err := cursor.Decode(&filter); err != nil {
			return nil, fmt.Errorf("failed to decode saved filter: %w", err)
		}
		filters = append(filters, &filter)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}
	return filters, nil
}

// UpdateSavedFilter updates an existing saved filter
func (r *savedFilterRepository) UpdateSavedFilter(ctx context.Context, filterID primitive.ObjectID, updates *models.SavedFilter) error {
	updateDoc := bson.M{
		"$set": bson.M{
			"name":        updates.Name,
			"description": updates.Description,
			"query":       updates.Query,
			"isPublic":    updates.IsPublic,
			"updatedAt":   time.Now(),
		},
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"_id": filterID}, updateDoc)
	if err != nil {
		return fmt.Errorf("failed to update saved filter: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("saved filter not found")
	}
	return nil
}

// DeleteSavedFilter deletes a saved filter
func (r *savedFilterRepository) DeleteSavedFilter(ctx context.Context, filterID, userID primitive.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": filterID, "userId": userID})
	if err != nil {
		return fmt.Errorf("failed to delete saved filter: %w", err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("saved filter not found or unauthorized")
	}
	return nil
}

// IncrementUsageCount increments the usage count for a saved filter
func (r *savedFilterRepository) IncrementUsageCount(ctx context.Context, filterID primitive.ObjectID) error {
	updateDoc := bson.M{
		"$inc": bson.M{"usageCount": 1},
		"$set": bson.M{"updatedAt": time.Now()},
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"_id": filterID}, updateDoc)
	if err != nil {
		return fmt.Errorf("failed to increment usage count: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("saved filter not found")
	}
	return nil
}

// GetMostUsedFilters retrieves the most used filters in a workspace
func (r *savedFilterRepository) GetMostUsedFilters(ctx context.Context, workspaceID primitive.ObjectID, entityType string, limit int64) ([]*models.SavedFilter, error) {
	query := bson.M{
		"workspaceId": workspaceID,
		"usageCount":  bson.M{"$gt": 0},
	}
	if entityType != "" {
		query["entityType"] = entityType
	}
	opts := options.Find().SetSort(bson.M{"usageCount": -1}).SetLimit(limit)
	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get most used filters: %w", err)
	}
	defer cursor.Close(ctx)

	var filters []*models.SavedFilter
	for cursor.Next(ctx) {
		var filter models.SavedFilter
		if err := cursor.Decode(&filter); err != nil {
			return nil, fmt.Errorf("failed to decode saved filter: %w", err)
		}
		filters = append(filters, &filter)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}
	return filters, nil
}

// DuplicateSavedFilter creates a copy of an existing saved filter
func (r *savedFilterRepository) DuplicateSavedFilter(ctx context.Context, filterID, newUserID primitive.ObjectID, newName string) (*models.SavedFilter, error) {
	// In a real scenario, you'd fetch the original filter and then create a new one
	// For now, a placeholder:
	return nil, fmt.Errorf("duplicate saved filter not implemented")
}

// CreateIndexes creates necessary indexes for the saved_filters collection
func (r *savedFilterRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{Keys: bson.M{"userId": 1, "workspaceId": 1, "entityType": 1}},
		{Keys: bson.M{"workspaceId": 1, "isPublic": 1, "entityType": 1}},
		{Keys: bson.M{"userId": 1, "workspaceId": 1, "entityType": 1, "name": 1}, Options: options.Index().SetUnique(true)},
		{Keys: bson.M{"usageCount": -1}},
	}
	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		return fmt.Errorf("failed to create saved filter indexes: %w", err)
	}
	return nil
}
