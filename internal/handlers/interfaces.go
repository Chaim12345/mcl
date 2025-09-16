package handlers

import (
	"context"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// CommentServiceInterface defines the interface for comment service operations
type CommentServiceInterface interface {
	Create(ctx context.Context, content string, itemID, authorID primitive.ObjectID, parentID *primitive.ObjectID) (*models.Comment, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error)
	GetByItemID(ctx context.Context, itemID primitive.ObjectID) ([]*models.Comment, error)
	GetCommentsWithReplies(ctx context.Context, itemID primitive.ObjectID) ([]*services.CommentWithReplies, error)
	GetReplies(ctx context.Context, parentID primitive.ObjectID) ([]*models.Comment, error)
	Update(ctx context.Context, id primitive.ObjectID, newContent string, userID primitive.ObjectID) (*models.Comment, error)
	Delete(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) error
	AddMention(ctx context.Context, commentID, userID primitive.ObjectID) error
	RemoveMention(ctx context.Context, commentID, userID primitive.ObjectID) error
	GetByAuthor(ctx context.Context, authorID primitive.ObjectID) ([]*models.Comment, error)
	AddAttachment(ctx context.Context, commentID primitive.ObjectID, filename, url, mimeType string, size int64) error
	RemoveAttachment(ctx context.Context, commentID primitive.ObjectID, filename string) error
}

// ActivityServiceInterface defines the interface for activity service operations
type ActivityServiceInterface interface {
	ListActivitiesByEntity(ctx context.Context, entityType string, entityID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error)
	ListActivitiesByUser(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error)
	GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error)
	GetActivityTimeline(ctx context.Context, filter services.ActivityFilter) (*services.ActivityTimeline, error)
	GetRecentActivity(ctx context.Context, workspaceID primitive.ObjectID, hours int, limit int64) ([]*models.Activity, error)
	GetActivityStats(ctx context.Context, workspaceID primitive.ObjectID, days int) (*services.ActivityStats, error)
	GetUserActivitySummary(ctx context.Context, userID primitive.ObjectID, days int) (*services.UserActivitySummary, error)
	GetActivityByID(ctx context.Context, id primitive.ObjectID) (*models.Activity, error)
}