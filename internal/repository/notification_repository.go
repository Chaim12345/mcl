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

// notificationRepository implements NotificationRepository interface
type notificationRepository struct {
	collection *mongo.Collection
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *mongo.Database) NotificationRepository {
	return &notificationRepository{
		collection: db.Collection("notifications"),
	}
}

// Create creates a new notification
func (r *notificationRepository) Create(ctx context.Context, notification *models.Notification) (*mongo.InsertOneResult, error) {
	if err := notification.Validate(); err != nil {
		return nil, fmt.Errorf("notification validation failed: %w", err)
	}

	// Set timestamp
	notification.CreatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, notification)
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	return result, nil
}

// GetByID retrieves a notification by ID
func (r *notificationRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Notification, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("notification ID is required")
	}

	var notification models.Notification
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&notification)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("notification not found")
		}
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}

	return &notification, nil
}

// GetByUserID retrieves notifications by user ID
func (r *notificationRepository) GetByUserID(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Notification, error) {
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
		return nil, fmt.Errorf("failed to get notifications by user ID: %w", err)
	}
	defer cursor.Close(ctx)

	var notifications []*models.Notification
	for cursor.Next(ctx) {
		var notification models.Notification
		if err := cursor.Decode(&notification); err != nil {
			return nil, fmt.Errorf("failed to decode notification: %w", err)
		}
		notifications = append(notifications, &notification)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return notifications, nil
}

// GetUnreadByUserID retrieves unread notifications by user ID
func (r *notificationRepository) GetUnreadByUserID(ctx context.Context, userID primitive.ObjectID) ([]*models.Notification, error) {
	if userID.IsZero() {
		return nil, fmt.Errorf("user ID is required")
	}

	filter := bson.M{
		"userId": userID,
		"read":   false,
	}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get unread notifications: %w", err)
	}
	defer cursor.Close(ctx)

	var notifications []*models.Notification
	for cursor.Next(ctx) {
		var notification models.Notification
		if err := cursor.Decode(&notification); err != nil {
			return nil, fmt.Errorf("failed to decode notification: %w", err)
		}
		notifications = append(notifications, &notification)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return notifications, nil
}

// Update updates a notification
func (r *notificationRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("notification ID is required")
	}

	if update == nil {
		return nil, fmt.Errorf("update data is required")
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification: %w", err)
	}

	if result.MatchedCount == 0 {
		return nil, fmt.Errorf("notification not found")
	}

	return result, nil
}

// Delete deletes a notification
func (r *notificationRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("notification ID is required")
	}

	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return nil, fmt.Errorf("failed to delete notification: %w", err)
	}

	if result.DeletedCount == 0 {
		return nil, fmt.Errorf("notification not found")
	}

	return result, nil
}

// List retrieves notifications with pagination
func (r *notificationRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Notification, error) {
	if filter == nil {
		filter = bson.M{}
	}

	opts := options.Find()
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}
	opts.SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}
	defer cursor.Close(ctx)

	var notifications []*models.Notification
	for cursor.Next(ctx) {
		var notification models.Notification
		if err := cursor.Decode(&notification); err != nil {
			return nil, fmt.Errorf("failed to decode notification: %w", err)
		}
		notifications = append(notifications, &notification)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return notifications, nil
}

// Count counts notifications matching the filter
func (r *notificationRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	if filter == nil {
		filter = bson.M{}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count notifications: %w", err)
	}

	return count, nil
}

// MarkAsRead marks a notification as read
func (r *notificationRepository) MarkAsRead(ctx context.Context, id primitive.ObjectID) error {
	if id.IsZero() {
		return fmt.Errorf("notification ID is required")
	}

	now := time.Now()
	update := bson.M{
		"read":   true,
		"readAt": now,
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "read": false}, // Only update if not already read
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("notification not found or already read")
	}

	return nil
}

// MarkAllAsRead marks all notifications for a user as read
func (r *notificationRepository) MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	now := time.Now()
	update := bson.M{
		"read":   true,
		"readAt": now,
	}

	filter := bson.M{
		"userId": userID,
		"read":   false,
	}

	_, err := r.collection.UpdateMany(
		ctx,
		filter,
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	return nil
}

// GetUnreadCount returns the count of unread notifications for a user
func (r *notificationRepository) GetUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	if userID.IsZero() {
		return 0, fmt.Errorf("user ID is required")
	}

	filter := bson.M{
		"userId": userID,
		"read":   false,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return count, nil
}

// GetPendingEmails retrieves notifications that need email delivery
func (r *notificationRepository) GetPendingEmails(ctx context.Context, limit int64) ([]*models.Notification, error) {
	filter := bson.M{
		"channels.email":       true,
		"channels.emailSentAt": bson.M{"$exists": false},
	}

	opts := options.Find().SetSort(bson.M{"createdAt": 1})
	if limit > 0 {
		opts.SetLimit(limit)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending emails: %w", err)
	}
	defer cursor.Close(ctx)

	var notifications []*models.Notification
	for cursor.Next(ctx) {
		var notification models.Notification
		if err := cursor.Decode(&notification); err != nil {
			return nil, fmt.Errorf("failed to decode notification: %w", err)
		}
		notifications = append(notifications, &notification)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return notifications, nil
}

// MarkEmailSent marks a notification's email as sent
func (r *notificationRepository) MarkEmailSent(ctx context.Context, id primitive.ObjectID) error {
	if id.IsZero() {
		return fmt.Errorf("notification ID is required")
	}

	now := time.Now()
	update := bson.M{
		"channels.emailSentAt": now,
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("failed to mark email as sent: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// DeleteExpired deletes notifications older than specified days
func (r *notificationRepository) DeleteExpired(ctx context.Context, olderThanDays int) (*mongo.DeleteResult, error) {
	if olderThanDays <= 0 {
		return nil, fmt.Errorf("olderThanDays must be positive")
	}

	cutoffTime := time.Now().AddDate(0, 0, -olderThanDays)

	filter := bson.M{
		"createdAt": bson.M{"$lt": cutoffTime},
	}

	result, err := r.collection.DeleteMany(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to delete expired notifications: %w", err)
	}

	return result, nil
}