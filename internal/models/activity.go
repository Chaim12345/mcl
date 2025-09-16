package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Activity represents an activity document in MongoDB
type Activity struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Type        string              `bson:"type" json:"type"` // 'item_created', 'item_updated', 'comment_added', etc.
	EntityType  string              `bson:"entityType" json:"entityType"` // 'item', 'board', 'workspace'
	EntityID    primitive.ObjectID  `bson:"entityId" json:"entityId"`
	UserID      primitive.ObjectID  `bson:"userId" json:"userId"`
	Data        map[string]interface{} `bson:"data,omitempty" json:"data,omitempty"` // Action-specific data
	WorkspaceID primitive.ObjectID  `bson:"workspaceId" json:"workspaceId"`
	BoardID     *primitive.ObjectID `bson:"boardId,omitempty" json:"boardId,omitempty"`
	ItemID      *primitive.ObjectID `bson:"itemId,omitempty" json:"itemId,omitempty"`
	CreatedAt   time.Time           `bson:"createdAt" json:"createdAt"`
}

// Activity type constants
const (
	// Item activities
	ActivityItemCreated   = "item_created"
	ActivityItemUpdated   = "item_updated"
	ActivityItemDeleted   = "item_deleted"
	ActivityItemMoved     = "item_moved"
	ActivityItemAssigned  = "item_assigned"
	ActivityItemUnassigned = "item_unassigned"

	// Board activities
	ActivityBoardCreated = "board_created"
	ActivityBoardUpdated = "board_updated"
	ActivityBoardDeleted = "board_deleted"
	ActivityColumnAdded  = "column_added"
	ActivityColumnUpdated = "column_updated"
	ActivityColumnDeleted = "column_deleted"

	// Workspace activities
	ActivityWorkspaceCreated = "workspace_created"
	ActivityWorkspaceUpdated = "workspace_updated"
	ActivityWorkspaceDeleted = "workspace_deleted"
	ActivityMemberAdded      = "member_added"
	ActivityMemberRemoved    = "member_removed"
	ActivityMemberRoleChanged = "member_role_changed"

	// Comment activities
	ActivityCommentAdded   = "comment_added"
	ActivityCommentUpdated = "comment_updated"
	ActivityCommentDeleted = "comment_deleted"
)

// Entity type constants
const (
	EntityTypeItem      = "item"
	EntityTypeBoard     = "board"
	EntityTypeWorkspace = "workspace"
	EntityTypeComment   = "comment"
)

// NewActivity creates a new activity with default values
func NewActivity(activityType, entityType string, entityID, userID, workspaceID primitive.ObjectID) *Activity {
	return &Activity{
		ID:          primitive.NewObjectID(),
		Type:        activityType,
		EntityType:  entityType,
		EntityID:    entityID,
		UserID:      userID,
		Data:        make(map[string]interface{}),
		WorkspaceID: workspaceID,
		CreatedAt:   time.Now(),
	}
}

// NewItemActivity creates a new item-related activity
func NewItemActivity(activityType string, itemID, userID, workspaceID, boardID primitive.ObjectID) *Activity {
	activity := NewActivity(activityType, EntityTypeItem, itemID, userID, workspaceID)
	activity.BoardID = &boardID
	activity.ItemID = &itemID
	return activity
}

// NewBoardActivity creates a new board-related activity
func NewBoardActivity(activityType string, boardID, userID, workspaceID primitive.ObjectID) *Activity {
	activity := NewActivity(activityType, EntityTypeBoard, boardID, userID, workspaceID)
	activity.BoardID = &boardID
	return activity
}

// NewWorkspaceActivity creates a new workspace-related activity
func NewWorkspaceActivity(activityType string, workspaceID, userID primitive.ObjectID) *Activity {
	return NewActivity(activityType, EntityTypeWorkspace, workspaceID, userID, workspaceID)
}

// NewCommentActivity creates a new comment-related activity
func NewCommentActivity(activityType string, commentID, userID, workspaceID, boardID, itemID primitive.ObjectID) *Activity {
	activity := NewActivity(activityType, EntityTypeComment, commentID, userID, workspaceID)
	activity.BoardID = &boardID
	activity.ItemID = &itemID
	return activity
}

// Validate validates the activity data
func (a *Activity) Validate() error {
	if a.Type == "" {
		return fmt.Errorf("activity type is required")
	}

	if !isValidActivityType(a.Type) {
		return fmt.Errorf("invalid activity type: %s", a.Type)
	}

	if a.EntityType == "" {
		return fmt.Errorf("entity type is required")
	}

	if !isValidEntityType(a.EntityType) {
		return fmt.Errorf("invalid entity type: %s", a.EntityType)
	}

	if a.EntityID.IsZero() {
		return fmt.Errorf("entity ID is required")
	}

	if a.UserID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	if a.WorkspaceID.IsZero() {
		return fmt.Errorf("workspace ID is required")
	}

	// Validate entity-specific requirements
	switch a.EntityType {
	case EntityTypeItem:
		if a.BoardID == nil || a.BoardID.IsZero() {
			return fmt.Errorf("board ID is required for item activities")
		}
		if a.ItemID == nil || a.ItemID.IsZero() {
			return fmt.Errorf("item ID is required for item activities")
		}
	case EntityTypeBoard:
		if a.BoardID == nil || a.BoardID.IsZero() {
			return fmt.Errorf("board ID is required for board activities")
		}
	case EntityTypeComment:
		if a.BoardID == nil || a.BoardID.IsZero() {
			return fmt.Errorf("board ID is required for comment activities")
		}
		if a.ItemID == nil || a.ItemID.IsZero() {
			return fmt.Errorf("item ID is required for comment activities")
		}
	}

	return nil
}

// ToBSON converts the activity to BSON for MongoDB operations
func (a *Activity) ToBSON() (bson.M, error) {
	data, err := bson.Marshal(a)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal activity to BSON: %w", err)
	}

	var bsonDoc bson.M
	err = bson.Unmarshal(data, &bsonDoc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal activity BSON: %w", err)
	}

	return bsonDoc, nil
}

// FromBSON populates the activity from BSON data
func (a *Activity) FromBSON(data bson.M) error {
	bsonData, err := bson.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal BSON data: %w", err)
	}

	err = bson.Unmarshal(bsonData, a)
	if err != nil {
		return fmt.Errorf("failed to unmarshal BSON to activity: %w", err)
	}

	return nil
}

// SetData sets activity-specific data
func (a *Activity) SetData(key string, value interface{}) {
	if a.Data == nil {
		a.Data = make(map[string]interface{})
	}
	a.Data[key] = value
}

// GetData gets activity-specific data
func (a *Activity) GetData(key string) (interface{}, bool) {
	if a.Data == nil {
		return nil, false
	}
	value, exists := a.Data[key]
	return value, exists
}

// SetItemFieldChange sets data for item field change activities
func (a *Activity) SetItemFieldChange(columnID, columnName string, oldValue, newValue interface{}) {
	a.SetData("columnId", columnID)
	a.SetData("columnName", columnName)
	a.SetData("oldValue", oldValue)
	a.SetData("newValue", newValue)
}

// SetItemAssignment sets data for item assignment activities
func (a *Activity) SetItemAssignment(assigneeID primitive.ObjectID, assigneeName string, assigned bool) {
	a.SetData("assigneeId", assigneeID)
	a.SetData("assigneeName", assigneeName)
	a.SetData("assigned", assigned)
}

// SetMemberChange sets data for workspace member activities
func (a *Activity) SetMemberChange(memberID primitive.ObjectID, memberName, role string) {
	a.SetData("memberId", memberID)
	a.SetData("memberName", memberName)
	a.SetData("role", role)
}

// SetCommentData sets data for comment activities
func (a *Activity) SetCommentData(commentContent string, mentions []primitive.ObjectID) {
	a.SetData("commentContent", commentContent)
	a.SetData("mentions", mentions)
}

// IsItemActivity checks if this is an item-related activity
func (a *Activity) IsItemActivity() bool {
	return a.EntityType == EntityTypeItem
}

// IsBoardActivity checks if this is a board-related activity
func (a *Activity) IsBoardActivity() bool {
	return a.EntityType == EntityTypeBoard
}

// IsWorkspaceActivity checks if this is a workspace-related activity
func (a *Activity) IsWorkspaceActivity() bool {
	return a.EntityType == EntityTypeWorkspace
}

// IsCommentActivity checks if this is a comment-related activity
func (a *Activity) IsCommentActivity() bool {
	return a.EntityType == EntityTypeComment
}

// isValidActivityType checks if the activity type is valid
func isValidActivityType(activityType string) bool {
	validTypes := []string{
		ActivityItemCreated, ActivityItemUpdated, ActivityItemDeleted, ActivityItemMoved,
		ActivityItemAssigned, ActivityItemUnassigned,
		ActivityBoardCreated, ActivityBoardUpdated, ActivityBoardDeleted,
		ActivityColumnAdded, ActivityColumnUpdated, ActivityColumnDeleted,
		ActivityWorkspaceCreated, ActivityWorkspaceUpdated, ActivityWorkspaceDeleted,
		ActivityMemberAdded, ActivityMemberRemoved, ActivityMemberRoleChanged,
		ActivityCommentAdded, ActivityCommentUpdated, ActivityCommentDeleted,
	}

	for _, validType := range validTypes {
		if activityType == validType {
			return true
		}
	}

	return false
}

// isValidEntityType checks if the entity type is valid
func isValidEntityType(entityType string) bool {
	validTypes := []string{
		EntityTypeItem, EntityTypeBoard, EntityTypeWorkspace, EntityTypeComment,
	}

	for _, validType := range validTypes {
		if entityType == validType {
			return true
		}
	}

	return false
}