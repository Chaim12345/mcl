package repository

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"project-management-platform/internal/models"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	Create(ctx context.Context, user *models.User) (*mongo.InsertOneResult, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
	Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
	List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.User, error)
	Count(ctx context.Context, filter bson.M) (int64, error)
	UpdateLastLogin(ctx context.Context, id primitive.ObjectID) error
	SetEmailVerified(ctx context.Context, id primitive.ObjectID) error
}

// WorkspaceRepository defines the interface for workspace data access
type WorkspaceRepository interface {
	Create(ctx context.Context, workspace *models.Workspace) (*mongo.InsertOneResult, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Workspace, error)
	GetByUserID(ctx context.Context, userID primitive.ObjectID) ([]*models.Workspace, error)
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
	Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
	List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Workspace, error)
	Count(ctx context.Context, filter bson.M) (int64, error)
	AddMember(ctx context.Context, workspaceID, userID primitive.ObjectID, role string) error
	RemoveMember(ctx context.Context, workspaceID, userID primitive.ObjectID) error
	UpdateMemberRole(ctx context.Context, workspaceID, userID primitive.ObjectID, role string) error
	GetMembers(ctx context.Context, workspaceID primitive.ObjectID) ([]models.WorkspaceMember, error)
}

// BoardRepository defines the interface for board data access
type BoardRepository interface {
	Create(ctx context.Context, board *models.Board) (*mongo.InsertOneResult, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Board, error)
	GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID) ([]*models.Board, error)
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
	Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
	List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Board, error)
	Count(ctx context.Context, filter bson.M) (int64, error)
	FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Board, error)
	CountWithFilter(ctx context.Context, filter bson.M) (int64, error)
	Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error)
	AddColumn(ctx context.Context, boardID primitive.ObjectID, column models.BoardColumn) error
	UpdateColumn(ctx context.Context, boardID primitive.ObjectID, columnID string, column models.BoardColumn) error
	RemoveColumn(ctx context.Context, boardID primitive.ObjectID, columnID string) error
	ReorderColumns(ctx context.Context, boardID primitive.ObjectID, columns []models.BoardColumn) error
	UpdatePermission(ctx context.Context, boardID primitive.ObjectID, permission models.BoardPermission) error
	GetPermissions(ctx context.Context, boardID primitive.ObjectID) ([]models.BoardPermission, error)
	RemovePermission(ctx context.Context, boardID primitive.ObjectID, userID primitive.ObjectID) error
}

// ItemRepository defines the interface for item data access
type ItemRepository interface {
	SearchText(ctx context.Context, query string, limit, skip int64) ([]*models.Item, error)
	Create(ctx context.Context, item *models.Item) (*mongo.InsertOneResult, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Item, error)
	GetByBoardID(ctx context.Context, boardID primitive.ObjectID) ([]*models.Item, error)
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
	Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
	List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Item, error)
	Count(ctx context.Context, filter bson.M) (int64, error)
	FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Item, error)
	CountWithFilter(ctx context.Context, filter bson.M) (int64, error)
	Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error)
	UpdatePosition(ctx context.Context, id primitive.ObjectID, position int) error
	UpdateFieldValue(ctx context.Context, itemID primitive.ObjectID, fieldValue models.ItemFieldValue) error
	AddAssignee(ctx context.Context, itemID, userID primitive.ObjectID) error
	RemoveAssignee(ctx context.Context, itemID, userID primitive.ObjectID) error
	AddWatcher(ctx context.Context, itemID, userID primitive.ObjectID) error
	RemoveWatcher(ctx context.Context, itemID, userID primitive.ObjectID) error
	GetByAssignee(ctx context.Context, userID primitive.ObjectID) ([]*models.Item, error)
}

// CommentRepository defines the interface for comment data access
type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) (*mongo.InsertOneResult, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error)
	GetByItemID(ctx context.Context, itemID primitive.ObjectID) ([]*models.Comment, error)
	GetReplies(ctx context.Context, parentID primitive.ObjectID) ([]*models.Comment, error)
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
	Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
	List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Comment, error)
	Count(ctx context.Context, filter bson.M) (int64, error)
	FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Comment, error)
	CountWithFilter(ctx context.Context, filter bson.M) (int64, error)
	Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error)

	AddMention(ctx context.Context, commentID, userID primitive.ObjectID) error
	RemoveMention(ctx context.Context, commentID, userID primitive.ObjectID) error
	GetByAuthor(ctx context.Context, authorID primitive.ObjectID) ([]*models.Comment, error)
}

// ActivityRepository defines the interface for activity data access
type ActivityRepository interface {
	Create(ctx context.Context, activity *models.Activity) (*mongo.InsertOneResult, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Activity, error)
	GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error)
	GetByUserID(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error)
	GetByEntityID(ctx context.Context, entityType string, entityID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error)
	List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Activity, error)
	Count(ctx context.Context, filter bson.M) (int64, error)
	FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Activity, error)
	CountWithFilter(ctx context.Context, filter bson.M) (int64, error)
	Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error)
	Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
	DeleteByEntityID(ctx context.Context, entityType string, entityID primitive.ObjectID) (*mongo.DeleteResult, error)
	GetRecentActivity(ctx context.Context, workspaceID primitive.ObjectID, hours int, limit int64) ([]*models.Activity, error)
}

// NotificationRepository defines the interface for notification data access
type NotificationRepository interface {
	Create(ctx context.Context, notification *models.Notification) (*mongo.InsertOneResult, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Notification, error)
	GetByUserID(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Notification, error)
	GetUnreadByUserID(ctx context.Context, userID primitive.ObjectID) ([]*models.Notification, error)
	Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error)
	Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error)
	List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Notification, error)
	Count(ctx context.Context, filter bson.M) (int64, error)
	MarkAsRead(ctx context.Context, id primitive.ObjectID) error
	MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error
	GetUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error)
	GetPendingEmails(ctx context.Context, limit int64) ([]*models.Notification, error)
	MarkEmailSent(ctx context.Context, id primitive.ObjectID) error
	DeleteExpired(ctx context.Context, olderThan int) (*mongo.DeleteResult, error)
}

// SavedFilterRepository defines the interface for saved filter data access
type SavedFilterRepository interface {
	CreateSavedFilter(ctx context.Context, filter *models.SavedFilter) error
	GetSavedFilter(ctx context.Context, filterID primitive.ObjectID) (*models.SavedFilter, error)
	GetSavedFilterByName(ctx context.Context, userID, workspaceID primitive.ObjectID, entityType, name string) (*models.SavedFilter, error)
	GetUserSavedFilters(ctx context.Context, userID, workspaceID primitive.ObjectID, entityType string) ([]*models.SavedFilter, error)
	GetPublicSavedFilters(ctx context.Context, workspaceID primitive.ObjectID, entityType string) ([]*models.SavedFilter, error)
	UpdateSavedFilter(ctx context.Context, filterID primitive.ObjectID, updates *models.SavedFilter) error
	DeleteSavedFilter(ctx context.Context, filterID, userID primitive.ObjectID) error
	IncrementUsageCount(ctx context.Context, filterID primitive.ObjectID) error
	GetMostUsedFilters(ctx context.Context, workspaceID primitive.ObjectID, entityType string, limit int64) ([]*models.SavedFilter, error)
	DuplicateSavedFilter(ctx context.Context, filterID, newUserID primitive.ObjectID, newName string) (*models.SavedFilter, error)
	CreateIndexes(ctx context.Context) error
}

// Repositories aggregates all repository interfaces
type Repositories struct {
	User         UserRepository
	Workspace    WorkspaceRepository
	Board        BoardRepository
	Item         ItemRepository
	Comment      CommentRepository
	Activity     ActivityRepository
	Notification NotificationRepository
	SavedFilter  SavedFilterRepository
}

// NewRepositories creates a new Repositories instance with all repository implementations
func NewRepositories(db *mongo.Database) *Repositories {
	return &Repositories{
		User:         NewUserRepository(db),
		Workspace:    NewWorkspaceRepository(db),
		Board:        NewBoardRepository(db),
		Item:         NewItemRepository(db),
		Comment:      NewCommentRepository(db),
		Activity:     NewActivityRepository(db),
		Notification: NewNotificationRepository(db),
		SavedFilter:  NewSavedFilterRepository(db),
	}
}
