package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestUser_NewUser(t *testing.T) {
	email := "test@example.com"
	password := "password123"
	firstName := "John"
	lastName := "Doe"

	user := NewUser(email, password, firstName, lastName)

	assert.NotNil(t, user)
	assert.False(t, user.ID.IsZero())
	assert.Equal(t, email, user.Email)
	assert.Equal(t, password, user.Password)
	assert.Equal(t, firstName, user.FirstName)
	assert.Equal(t, lastName, user.LastName)
	assert.False(t, user.EmailVerified)
	assert.Equal(t, "light", user.Preferences.Theme)
	assert.True(t, user.Preferences.Notifications.Email)
}

func TestUser_Validate(t *testing.T) {
	tests := []struct {
		name    string
		user    *User
		wantErr bool
	}{
		{
			name: "valid user",
			user: NewUser("test@example.com", "password123", "John", "Doe"),
			wantErr: false,
		},
		{
			name: "empty email",
			user: &User{Password: "password123", FirstName: "John", LastName: "Doe"},
			wantErr: true,
		},
		{
			name: "invalid email",
			user: &User{Email: "invalid-email", Password: "password123", FirstName: "John", LastName: "Doe"},
			wantErr: true,
		},
		{
			name: "short password",
			user: &User{Email: "test@example.com", Password: "123", FirstName: "John", LastName: "Doe"},
			wantErr: true,
		},
		{
			name: "empty first name",
			user: &User{Email: "test@example.com", Password: "password123", LastName: "Doe"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.user.Validate()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestUser_ToBSONAndFromBSON(t *testing.T) {
	user := NewUser("test@example.com", "password123", "John", "Doe")
	
	// Convert to BSON
	bsonData, err := user.ToBSON()
	require.NoError(t, err)
	assert.NotNil(t, bsonData)

	// Convert back from BSON
	var newUser User
	err = newUser.FromBSON(bsonData)
	require.NoError(t, err)

	assert.Equal(t, user.Email, newUser.Email)
	assert.Equal(t, user.FirstName, newUser.FirstName)
	assert.Equal(t, user.LastName, newUser.LastName)
}

func TestWorkspace_NewWorkspace(t *testing.T) {
	name := "Test Workspace"
	description := "Test Description"
	ownerID := primitive.NewObjectID()

	workspace := NewWorkspace(name, description, ownerID)

	assert.NotNil(t, workspace)
	assert.False(t, workspace.ID.IsZero())
	assert.Equal(t, name, workspace.Name)
	assert.Equal(t, description, workspace.Description)
	assert.Equal(t, ownerID, workspace.OwnerID)
	assert.Len(t, workspace.Members, 1)
	assert.Equal(t, ownerID, workspace.Members[0].UserID)
	assert.Equal(t, WorkspaceRoleAdmin, workspace.Members[0].Role)
	assert.Equal(t, WorkspaceVisibilityPrivate, workspace.Settings.Visibility)
}

func TestWorkspace_AddMember(t *testing.T) {
	workspace := NewWorkspace("Test", "Description", primitive.NewObjectID())
	userID := primitive.NewObjectID()

	err := workspace.AddMember(userID, WorkspaceRoleMember)
	assert.NoError(t, err)
	assert.Len(t, workspace.Members, 2)

	// Try to add the same user again
	err = workspace.AddMember(userID, WorkspaceRoleMember)
	assert.Error(t, err)
}

func TestWorkspace_RemoveMember(t *testing.T) {
	ownerID := primitive.NewObjectID()
	workspace := NewWorkspace("Test", "Description", ownerID)
	userID := primitive.NewObjectID()

	// Add a member first
	err := workspace.AddMember(userID, WorkspaceRoleMember)
	require.NoError(t, err)

	// Remove the member
	err = workspace.RemoveMember(userID)
	assert.NoError(t, err)
	assert.Len(t, workspace.Members, 1)

	// Try to remove the owner
	err = workspace.RemoveMember(ownerID)
	assert.Error(t, err)
}

func TestBoard_NewBoard(t *testing.T) {
	name := "Test Board"
	description := "Test Description"
	workspaceID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()

	board := NewBoard(name, description, workspaceID, createdBy)

	assert.NotNil(t, board)
	assert.False(t, board.ID.IsZero())
	assert.Equal(t, name, board.Name)
	assert.Equal(t, description, board.Description)
	assert.Equal(t, workspaceID, board.WorkspaceID)
	assert.Equal(t, createdBy, board.CreatedBy)
	assert.Len(t, board.Columns, 3) // Default columns
	assert.Equal(t, "#4F46E5", board.Color)
}

func TestBoard_AddColumn(t *testing.T) {
	board := NewBoard("Test", "Description", primitive.NewObjectID(), primitive.NewObjectID())
	initialColumnCount := len(board.Columns)

	err := board.AddColumn("New Column", ColumnTypeText, nil)
	assert.NoError(t, err)
	assert.Len(t, board.Columns, initialColumnCount+1)

	// Test invalid column type
	err = board.AddColumn("Invalid Column", "invalid_type", nil)
	assert.Error(t, err)
}

func TestBoard_RemoveColumn(t *testing.T) {
	board := NewBoard("Test", "Description", primitive.NewObjectID(), primitive.NewObjectID())
	columnID := board.Columns[0].ID

	err := board.RemoveColumn(columnID)
	assert.NoError(t, err)
	assert.Len(t, board.Columns, 2)

	// Try to remove non-existent column
	err = board.RemoveColumn("non-existent")
	assert.Error(t, err)
}

func TestItem_NewItem(t *testing.T) {
	name := "Test Item"
	boardID := primitive.NewObjectID()
	createdBy := primitive.NewObjectID()

	item := NewItem(name, boardID, createdBy)

	assert.NotNil(t, item)
	assert.False(t, item.ID.IsZero())
	assert.Equal(t, name, item.Name)
	assert.Equal(t, boardID, item.BoardID)
	assert.Equal(t, createdBy, item.CreatedBy)
	assert.Equal(t, 0, item.Position)
	assert.Empty(t, item.FieldValues)
	assert.Contains(t, item.Watchers, createdBy)
}

func TestItem_SetFieldValue(t *testing.T) {
	item := NewItem("Test", primitive.NewObjectID(), primitive.NewObjectID())
	columnID := "col_1"
	value := "Test Value"
	updatedBy := primitive.NewObjectID()

	err := item.SetFieldValue(columnID, value, updatedBy)
	assert.NoError(t, err)
	assert.Len(t, item.FieldValues, 1)

	retrievedValue, exists := item.GetFieldValue(columnID)
	assert.True(t, exists)
	assert.Equal(t, value, retrievedValue)

	// Update existing field value
	newValue := "Updated Value"
	err = item.SetFieldValue(columnID, newValue, updatedBy)
	assert.NoError(t, err)
	assert.Len(t, item.FieldValues, 1) // Should still be 1

	retrievedValue, exists = item.GetFieldValue(columnID)
	assert.True(t, exists)
	assert.Equal(t, newValue, retrievedValue)
}

func TestItem_AddAssignee(t *testing.T) {
	item := NewItem("Test", primitive.NewObjectID(), primitive.NewObjectID())
	userID := primitive.NewObjectID()

	err := item.AddAssignee(userID)
	assert.NoError(t, err)
	assert.Contains(t, item.Assignees, userID)
	assert.True(t, item.IsAssignee(userID))

	// Try to add the same assignee again
	err = item.AddAssignee(userID)
	assert.Error(t, err)
}

func TestComment_NewComment(t *testing.T) {
	content := "Test comment"
	itemID := primitive.NewObjectID()
	authorID := primitive.NewObjectID()

	comment := NewComment(content, itemID, authorID)

	assert.NotNil(t, comment)
	assert.False(t, comment.ID.IsZero())
	assert.Equal(t, content, comment.Content)
	assert.Equal(t, itemID, comment.ItemID)
	assert.Equal(t, authorID, comment.AuthorID)
	assert.Nil(t, comment.ParentID)
	assert.False(t, comment.IsReply())
}

func TestComment_NewReply(t *testing.T) {
	content := "Test reply"
	itemID := primitive.NewObjectID()
	parentID := primitive.NewObjectID()
	authorID := primitive.NewObjectID()

	reply := NewReply(content, itemID, parentID, authorID)

	assert.NotNil(t, reply)
	assert.Equal(t, content, reply.Content)
	assert.Equal(t, itemID, reply.ItemID)
	assert.Equal(t, authorID, reply.AuthorID)
	assert.NotNil(t, reply.ParentID)
	assert.Equal(t, parentID, *reply.ParentID)
	assert.True(t, reply.IsReply())
}

func TestComment_UpdateContent(t *testing.T) {
	comment := NewComment("Original content", primitive.NewObjectID(), primitive.NewObjectID())
	newContent := "Updated content"

	err := comment.UpdateContent(newContent)
	assert.NoError(t, err)
	assert.Equal(t, newContent, comment.Content)
	assert.Len(t, comment.EditHistory, 1)
	assert.Equal(t, "Original content", comment.EditHistory[0].Content)
	assert.True(t, comment.IsEdited())
}

func TestComment_AddMention(t *testing.T) {
	comment := NewComment("Test", primitive.NewObjectID(), primitive.NewObjectID())
	userID := primitive.NewObjectID()

	err := comment.AddMention(userID)
	assert.NoError(t, err)
	assert.Contains(t, comment.Mentions, userID)
	assert.True(t, comment.IsMentioned(userID))

	// Try to add the same mention again
	err = comment.AddMention(userID)
	assert.Error(t, err)
}

func TestActivity_NewActivity(t *testing.T) {
	activityType := ActivityItemCreated
	entityType := EntityTypeItem
	entityID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	activity := NewActivity(activityType, entityType, entityID, userID, workspaceID)

	assert.NotNil(t, activity)
	assert.False(t, activity.ID.IsZero())
	assert.Equal(t, activityType, activity.Type)
	assert.Equal(t, entityType, activity.EntityType)
	assert.Equal(t, entityID, activity.EntityID)
	assert.Equal(t, userID, activity.UserID)
	assert.Equal(t, workspaceID, activity.WorkspaceID)
	assert.NotNil(t, activity.Data)
}

func TestActivity_NewItemActivity(t *testing.T) {
	itemID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	activity := NewItemActivity(ActivityItemCreated, itemID, userID, workspaceID, boardID)

	assert.Equal(t, ActivityItemCreated, activity.Type)
	assert.Equal(t, EntityTypeItem, activity.EntityType)
	assert.Equal(t, itemID, activity.EntityID)
	assert.NotNil(t, activity.BoardID)
	assert.Equal(t, boardID, *activity.BoardID)
	assert.NotNil(t, activity.ItemID)
	assert.Equal(t, itemID, *activity.ItemID)
	assert.True(t, activity.IsItemActivity())
}

func TestActivity_SetData(t *testing.T) {
	activity := NewActivity(ActivityItemUpdated, EntityTypeItem, primitive.NewObjectID(), primitive.NewObjectID(), primitive.NewObjectID())

	activity.SetData("key1", "value1")
	activity.SetData("key2", 123)

	value1, exists1 := activity.GetData("key1")
	assert.True(t, exists1)
	assert.Equal(t, "value1", value1)

	value2, exists2 := activity.GetData("key2")
	assert.True(t, exists2)
	assert.Equal(t, 123, value2)

	_, exists3 := activity.GetData("nonexistent")
	assert.False(t, exists3)
}

func TestNotification_NewNotification(t *testing.T) {
	userID := primitive.NewObjectID()
	notificationType := NotificationTypeMention
	title := "Test Notification"
	message := "Test message"

	notification := NewNotification(userID, notificationType, title, message)

	assert.NotNil(t, notification)
	assert.False(t, notification.ID.IsZero())
	assert.Equal(t, userID, notification.UserID)
	assert.Equal(t, notificationType, notification.Type)
	assert.Equal(t, title, notification.Title)
	assert.Equal(t, message, notification.Message)
	assert.False(t, notification.Read)
	assert.Nil(t, notification.ReadAt)
	assert.True(t, notification.Channels.InApp)
	assert.False(t, notification.Channels.Email)
}

func TestNotification_NewMentionNotification(t *testing.T) {
	userID := primitive.NewObjectID()
	mentionedBy := primitive.NewObjectID()
	itemID := primitive.NewObjectID()
	itemName := "Test Item"
	mentionedByName := "John Doe"

	notification := NewMentionNotification(userID, mentionedBy, itemID, itemName, mentionedByName)

	assert.Equal(t, NotificationTypeMention, notification.Type)
	assert.Equal(t, "You were mentioned", notification.Title)
	assert.Contains(t, notification.Message, mentionedByName)
	assert.Contains(t, notification.Message, itemName)
	assert.True(t, notification.Channels.Email)

	mentionedByData, exists := notification.GetData("mentionedBy")
	assert.True(t, exists)
	assert.Equal(t, mentionedBy, mentionedByData)
}

func TestNotification_MarkAsRead(t *testing.T) {
	notification := NewNotification(primitive.NewObjectID(), NotificationTypeMention, "Title", "Message")

	assert.False(t, notification.Read)
	assert.Nil(t, notification.ReadAt)

	notification.MarkAsRead()

	assert.True(t, notification.Read)
	assert.NotNil(t, notification.ReadAt)
	assert.True(t, notification.ReadAt.Before(time.Now().Add(time.Second)))
}

func TestNotification_SetEmailSent(t *testing.T) {
	notification := NewNotification(primitive.NewObjectID(), NotificationTypeMention, "Title", "Message")

	assert.False(t, notification.IsEmailSent())

	notification.SetEmailSent()

	assert.True(t, notification.IsEmailSent())
	assert.NotNil(t, notification.Channels.EmailSentAt)
}

func TestNotification_ShouldSendEmail(t *testing.T) {
	notification := NewNotification(primitive.NewObjectID(), NotificationTypeMention, "Title", "Message")
	notification.Channels.Email = true

	assert.True(t, notification.ShouldSendEmail())

	notification.SetEmailSent()

	assert.False(t, notification.ShouldSendEmail())
}

func TestNotification_IsActionable(t *testing.T) {
	tests := []struct {
		name           string
		notificationType string
		expected       bool
	}{
		{"workspace invite", NotificationTypeWorkspaceInvite, true},
		{"password reset", NotificationTypePasswordReset, true},
		{"email verification", NotificationTypeEmailVerification, true},
		{"mention", NotificationTypeMention, false},
		{"comment added", NotificationTypeCommentAdded, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			notification := NewNotification(primitive.NewObjectID(), tt.notificationType, "Title", "Message")
			assert.Equal(t, tt.expected, notification.IsActionable())
		})
	}
}