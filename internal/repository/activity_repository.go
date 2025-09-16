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

// activityRepository implements ActivityRepository interface
type activityRepository struct {
	collection *mongo.Collection
}

// NewActivityRepository creates a new activity repository
func NewActivityRepository(db *mongo.Database) ActivityRepository {
	return &activityRepository{
		collection: db.Collection("activities"),
	}
}

// Create creates a new activity
func (r *activityRepository) Create(ctx context.Context, activity *models.Activity) (*mongo.InsertOneResult, error) {
	if err := activity.Validate(); err != nil {
		return nil, fmt.Errorf("activity validation failed: %w", err)
	}

	// Set timestamps
	now := time.Now()
	activity.CreatedAt = now

	result, err := r.collection.InsertOne(ctx, activity)
	if err != nil {
		return nil, fmt.Errorf("failed to create activity: %w", err)
	}

	return result, nil
}

// GetByID retrieves an activity by ID
func (r *activityRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Activity, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("activity ID is required")
	}

	var activity models.Activity
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&activity)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("activity not found")
		}
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}

	return &activity, nil
}

// GetByWorkspaceID retrieves activities by workspace ID with pagination
func (r *activityRepository) GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	if workspaceID.IsZero() {
		return nil, fmt.Errorf("workspace ID is required")
	}

	filter := bson.M{"workspaceId": workspaceID}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get activities by workspace ID: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	for cursor.Next(ctx) {
		var activity models.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, fmt.Errorf("failed to decode activity: %w", err)
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return activities, nil
}

// GetByUserID retrieves activities by user ID with pagination
func (r *activityRepository) GetByUserID(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	if userID.IsZero() {
		return nil, fmt.Errorf("user ID is required")
	}

	filter := bson.M{"userId": userID}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get activities by user ID: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	for cursor.Next(ctx) {
		var activity models.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, fmt.Errorf("failed to decode activity: %w", err)
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return activities, nil
}

// GetByEntityID retrieves activities by entity ID with pagination
func (r *activityRepository) GetByEntityID(ctx context.Context, entityType string, entityID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	if entityType == "" {
		return nil, fmt.Errorf("entity type is required")
	}
	if entityID.IsZero() {
		return nil, fmt.Errorf("entity ID is required")
	}

	filter := bson.M{
		"entityType": entityType,
		"entityId":   entityID,
	}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get activities by entity ID: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	for cursor.Next(ctx) {
		var activity models.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, fmt.Errorf("failed to decode activity: %w", err)
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return activities, nil
}

// List retrieves activities with pagination and filtering
func (r *activityRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Activity, error) {
	if filter == nil {
		filter = bson.M{}
	}

	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list activities: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	for cursor.Next(ctx) {
		var activity models.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, fmt.Errorf("failed to decode activity: %w", err)
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return activities, nil
}

// Count counts activities matching the filter
func (r *activityRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	if filter == nil {
		filter = bson.M{}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count activities: %w", err)
	}

	return count, nil
}

// FindWithFilter finds activities with a custom filter and options
func (r *activityRepository) FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Activity, error) {
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find activities with filter: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	for cursor.Next(ctx) {
		var activity models.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, fmt.Errorf("failed to decode activity: %w", err)
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return activities, nil
}

// CountWithFilter counts activities with a custom filter
func (r *activityRepository) CountWithFilter(ctx context.Context, filter bson.M) (int64, error) {
	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count activities with filter: %w", err)
	}
	return count, nil
}

// Aggregate performs aggregation operations on activities
func (r *activityRepository) Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error) {
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate activities: %w", err)
	}
	defer cursor.Close(ctx)

	var results []bson.M
	for cursor.Next(ctx) {
		var result bson.M
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode aggregation result: %w", err)
		}
		results = append(results, result)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return results, nil
}

// Delete deletes an activity
func (r *activityRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("activity ID is required")
	}

	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return nil, fmt.Errorf("failed to delete activity: %w", err)
	}

	if result.DeletedCount == 0 {
		return nil, fmt.Errorf("activity not found")
	}

	return result, nil
}

// DeleteByEntityID deletes activities by entity ID
func (r *activityRepository) DeleteByEntityID(ctx context.Context, entityType string, entityID primitive.ObjectID) (*mongo.DeleteResult, error) {
	if entityType == "" {
		return nil, fmt.Errorf("entity type is required")
	}
	if entityID.IsZero() {
		return nil, fmt.Errorf("entity ID is required")
	}

	filter := bson.M{
		"entityType": entityType,
		"entityId":   entityID,
	}

	result, err := r.collection.DeleteMany(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to delete activities by entity ID: %w", err)
	}

	return result, nil
}

// GetRecentActivity retrieves recent activities within specified hours
func (r *activityRepository) GetRecentActivity(ctx context.Context, workspaceID primitive.ObjectID, hours int, limit int64) ([]*models.Activity, error) {
	if workspaceID.IsZero() {
		return nil, fmt.Errorf("workspace ID is required")
	}
	if hours <= 0 {
		return nil, fmt.Errorf("hours must be positive")
	}

	cutoffTime := time.Now().Add(-time.Duration(hours) * time.Hour)
	filter := bson.M{
		"workspaceId": workspaceID,
		"createdAt":   bson.M{"$gte": cutoffTime},
	}

	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	if limit > 0 {
		opts.SetLimit(limit)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent activities: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	for cursor.Next(ctx) {
		var activity models.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, fmt.Errorf("failed to decode activity: %w", err)
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return activities, nil
}