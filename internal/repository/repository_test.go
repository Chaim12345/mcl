package repository

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/database"
	"project-management-platform/internal/models"
)

func setupTestRepositories(t *testing.T) (*Repositories, func()) {
	// Use the same test database setup from database package
	if !isMongoDBAvailable() {
		t.Skip("MongoDB not available, skipping repository tests")
	}

	uri := getTestMongoURI()
	client, err := database.NewClient(uri)
	require.NoError(t, err)

	dbName := "test_project_management_repo_" + t.Name()
	db := client.Database(dbName)

	repos := NewRepositories(db)

	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		db.Drop(ctx)
		client.Disconnect(ctx)
	}

	return repos, cleanup
}

func TestUserRepository_Create(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	user := models.NewUser("test@example.com", "password123", "John", "Doe")

	result, err := repos.User.Create(ctx, user)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.InsertedID)

	// Test duplicate email
	user2 := models.NewUser("test@example.com", "password456", "Jane", "Smith")
	_, err = repos.User.Create(ctx, user2)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already exists")
}

func TestUserRepository_GetByEmail(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	user := models.NewUser("test@example.com", "password123", "John", "Doe")

	_, err := repos.User.Create(ctx, user)
	require.NoError(t, err)

	retrievedUser, err := repos.User.GetByEmail(ctx, "test@example.com")
	assert.NoError(t, err)
	assert.Equal(t, user.Email, retrievedUser.Email)
	assert.Equal(t, user.FirstName, retrievedUser.FirstName)
	assert.Equal(t, user.LastName, retrievedUser.LastName)

	// Test non-existent email
	_, err = repos.User.GetByEmail(ctx, "nonexistent@example.com")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestUserRepository_UpdateLastLogin(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	user := models.NewUser("test@example.com", "password123", "John", "Doe")

	result, err := repos.User.Create(ctx, user)
	require.NoError(t, err)

	userID := result.InsertedID.(primitive.ObjectID)

	err = repos.User.UpdateLastLogin(ctx, userID)
	assert.NoError(t, err)

	retrievedUser, err := repos.User.GetByID(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, retrievedUser.LastLoginAt)
}

func TestWorkspaceRepository_Create(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	ownerID := primitive.NewObjectID()
	workspace := models.NewWorkspace("Test Workspace", "Test Description", ownerID)

	result, err := repos.Workspace.Create(ctx, workspace)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.InsertedID)
}

func TestWorkspaceRepository_AddMember(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	ownerID := primitive.NewObjectID()
	workspace := models.NewWorkspace("Test Workspace", "Test Description", ownerID)

	result, err := repos.Workspace.Create(ctx, workspace)
	require.NoError(t, err)

	workspaceID := result.InsertedID.(primitive.ObjectID)
	userID := primitive.NewObjectID()

	err = repos.Workspace.AddMember(ctx, workspaceID, userID, models.WorkspaceRoleMember)
	assert.NoError(t, err)

	members, err := repos.Workspace.GetMembers(ctx, workspaceID)
	require.NoError(t, err)
	assert.Len(t, members, 2) // Owner + new member

	// Test adding duplicate member
	err = repos.Workspace.AddMember(ctx, workspaceID, userID, models.WorkspaceRoleMember)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already a member")
}

func TestWorkspaceRepository_RemoveMember(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	ownerID := primitive.NewObjectID()
	workspace := models.NewWorkspace("Test Workspace", "Test Description", ownerID)

	result, err := repos.Workspace.Create(ctx, workspace)
	require.NoError(t, err)

	workspaceID := result.InsertedID.(primitive.ObjectID)
	userID := primitive.NewObjectID()

	// Add member first
	err = repos.Workspace.AddMember(ctx, workspaceID, userID, models.WorkspaceRoleMember)
	require.NoError(t, err)

	// Remove member
	err = repos.Workspace.RemoveMember(ctx, workspaceID, userID)
	assert.NoError(t, err)

	members, err := repos.Workspace.GetMembers(ctx, workspaceID)
	require.NoError(t, err)
	assert.Len(t, members, 1) // Only owner remains

	// Test removing owner
	err = repos.Workspace.RemoveMember(ctx, workspaceID, ownerID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot remove workspace owner")
}

func TestBoardRepository_Create(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	workspaceID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()
	board := models.NewBoard("Test Board", "Test Description", workspaceID, createdBy)

	result, err := repos.Board.Create(ctx, board)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.InsertedID)
}

func TestBoardRepository_GetByWorkspaceID(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	workspaceID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()

	// Create multiple boards
	board1 := models.NewBoard("Board 1", "Description 1", workspaceID, createdBy)
	board2 := models.NewBoard("Board 2", "Description 2", workspaceID, createdBy)

	_, err := repos.Board.Create(ctx, board1)
	require.NoError(t, err)
	_, err = repos.Board.Create(ctx, board2)
	require.NoError(t, err)

	boards, err := repos.Board.GetByWorkspaceID(ctx, workspaceID)
	assert.NoError(t, err)
	assert.Len(t, boards, 2)
}

func TestBoardRepository_AddColumn(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	workspaceID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()
	board := models.NewBoard("Test Board", "Test Description", workspaceID, createdBy)

	result, err := repos.Board.Create(ctx, board)
	require.NoError(t, err)

	boardID := result.InsertedID.(primitive.ObjectID)
	column := models.BoardColumn{
		ID:       "col_test",
		Name:     "Test Column",
		Type:     models.ColumnTypeText,
		Position: 10,
	}

	err = repos.Board.AddColumn(ctx, boardID, column)
	assert.NoError(t, err)

	retrievedBoard, err := repos.Board.GetByID(ctx, boardID)
	require.NoError(t, err)
	assert.Len(t, retrievedBoard.Columns, 4) // 3 default + 1 new
}

func TestItemRepository_Create(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	boardID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()
	item := models.NewItem("Test Item", boardID, createdBy)

	result, err := repos.Item.Create(ctx, item)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.InsertedID)
}

func TestItemRepository_UpdateFieldValue(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	boardID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()
	item := models.NewItem("Test Item", boardID, createdBy)

	result, err := repos.Item.Create(ctx, item)
	require.NoError(t, err)

	itemID := result.InsertedID.(primitive.ObjectID)
	fieldValue := models.ItemFieldValue{
		ColumnID:  "col_test",
		Value:     "Test Value",
		UpdatedBy: createdBy,
	}

	err = repos.Item.UpdateFieldValue(ctx, itemID, fieldValue)
	assert.NoError(t, err)

	retrievedItem, err := repos.Item.GetByID(ctx, itemID)
	require.NoError(t, err)
	assert.Len(t, retrievedItem.FieldValues, 1)
	assert.Equal(t, "Test Value", retrievedItem.FieldValues[0].Value)
}

func TestItemRepository_AddAssignee(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	boardID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()
	item := models.NewItem("Test Item", boardID, createdBy)

	result, err := repos.Item.Create(ctx, item)
	require.NoError(t, err)

	itemID := result.InsertedID.(primitive.ObjectID)
	userID := primitive.NewObjectID()

	err = repos.Item.AddAssignee(ctx, itemID, userID)
	assert.NoError(t, err)

	retrievedItem, err := repos.Item.GetByID(ctx, itemID)
	require.NoError(t, err)
	assert.Contains(t, retrievedItem.Assignees, userID)

	// Test adding duplicate assignee
	err = repos.Item.AddAssignee(ctx, itemID, userID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already assigned")
}

func TestCommentRepository_Create(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	itemID := primitive.NewObjectID()
	authorID := primitive.NewObjectID()
	comment := models.NewComment("Test comment", itemID, authorID)

	result, err := repos.Comment.Create(ctx, comment)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.InsertedID)
}

func TestCommentRepository_GetByItemID(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	itemID := primitive.NewObjectID()
	authorID := primitive.NewObjectID()

	// Create multiple comments
	comment1 := models.NewComment("Comment 1", itemID, authorID)
	comment2 := models.NewComment("Comment 2", itemID, authorID)

	_, err := repos.Comment.Create(ctx, comment1)
	require.NoError(t, err)
	_, err = repos.Comment.Create(ctx, comment2)
	require.NoError(t, err)

	comments, err := repos.Comment.GetByItemID(ctx, itemID)
	assert.NoError(t, err)
	assert.Len(t, comments, 2)
}

func TestActivityRepository_Create(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	entityID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	activity := models.NewActivity(models.ActivityItemCreated, models.EntityTypeItem, entityID, userID, workspaceID)

	result, err := repos.Activity.Create(ctx, activity)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.InsertedID)
}

func TestActivityRepository_GetByWorkspaceID(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	workspaceID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	entityID := primitive.NewObjectID()

	// Create multiple activities
	activity1 := models.NewActivity(models.ActivityItemCreated, models.EntityTypeItem, entityID, userID, workspaceID)
	activity2 := models.NewActivity(models.ActivityItemUpdated, models.EntityTypeItem, entityID, userID, workspaceID)

	_, err := repos.Activity.Create(ctx, activity1)
	require.NoError(t, err)
	_, err = repos.Activity.Create(ctx, activity2)
	require.NoError(t, err)

	activities, err := repos.Activity.GetByWorkspaceID(ctx, workspaceID, 10, 0)
	assert.NoError(t, err)
	assert.Len(t, activities, 2)
}

func TestNotificationRepository_Create(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	userID := primitive.NewObjectID()
	notification := models.NewNotification(userID, models.NotificationTypeMention, "Test Title", "Test Message")

	result, err := repos.Notification.Create(ctx, notification)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.InsertedID)
}

func TestNotificationRepository_GetUnreadByUserID(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	userID := primitive.NewObjectID()

	// Create notifications
	notification1 := models.NewNotification(userID, models.NotificationTypeMention, "Title 1", "Message 1")
	notification2 := models.NewNotification(userID, models.NotificationTypeCommentAdded, "Title 2", "Message 2")

	result1, err := repos.Notification.Create(ctx, notification1)
	require.NoError(t, err)
	_, err = repos.Notification.Create(ctx, notification2)
	require.NoError(t, err)

	// Mark one as read
	notificationID := result1.InsertedID.(primitive.ObjectID)
	err = repos.Notification.MarkAsRead(ctx, notificationID)
	require.NoError(t, err)

	// Get unread notifications
	unreadNotifications, err := repos.Notification.GetUnreadByUserID(ctx, userID)
	assert.NoError(t, err)
	assert.Len(t, unreadNotifications, 1)
	assert.Equal(t, "Title 2", unreadNotifications[0].Title)
}

func TestNotificationRepository_GetUnreadCount(t *testing.T) {
	repos, cleanup := setupTestRepositories(t)
	defer cleanup()

	ctx := context.Background()
	userID := primitive.NewObjectID()

	// Create notifications
	notification1 := models.NewNotification(userID, models.NotificationTypeMention, "Title 1", "Message 1")
	notification2 := models.NewNotification(userID, models.NotificationTypeCommentAdded, "Title 2", "Message 2")

	_, err := repos.Notification.Create(ctx, notification1)
	require.NoError(t, err)
	_, err = repos.Notification.Create(ctx, notification2)
	require.NoError(t, err)

	count, err := repos.Notification.GetUnreadCount(ctx, userID)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), count)
}

// Helper functions (reuse from database tests)
func isMongoDBAvailable() bool {
	client, err := database.NewClient(getTestMongoURI())
	if err != nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err = client.Connect(ctx)
	if err != nil {
		return false
	}

	client.Disconnect(ctx)
	return true
}

func getTestMongoURI() string {
	// Use environment variable or default
	return "mongodb://localhost:27017"
}
