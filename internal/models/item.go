package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Item represents an item document in MongoDB
type Item struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Name        string               `bson:"name" json:"name"`
	BoardID     primitive.ObjectID   `bson:"boardId" json:"boardId"`
	Position    int                  `bson:"position" json:"position"`
	FieldValues []ItemFieldValue     `bson:"fieldValues" json:"fieldValues"`
	Assignees   []primitive.ObjectID `bson:"assignees,omitempty" json:"assignees,omitempty"`
	Watchers    []primitive.ObjectID `bson:"watchers,omitempty" json:"watchers,omitempty"`
	CreatedAt   time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time            `bson:"updatedAt" json:"updatedAt"`
	CreatedBy   primitive.ObjectID   `bson:"createdBy" json:"createdBy"`
}

// ItemFieldValue represents a field value for an item
type ItemFieldValue struct {
	ColumnID  string             `bson:"columnId" json:"columnId"`
	Value     interface{}        `bson:"value" json:"value"` // Can be string, number, date, array
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
	UpdatedBy primitive.ObjectID `bson:"updatedBy" json:"updatedBy"`
}

// NewItem creates a new item with default values
func NewItem(name string, boardID, createdBy primitive.ObjectID) *Item {
	now := time.Now()
	return &Item{
		ID:          primitive.NewObjectID(),
		Name:        name,
		BoardID:     boardID,
		Position:    0, // Will be set based on board's current items
		FieldValues: []ItemFieldValue{},
		Assignees:   []primitive.ObjectID{},
		Watchers:    []primitive.ObjectID{createdBy}, // Creator watches by default
		CreatedAt:   now,
		UpdatedAt:   now,
		CreatedBy:   createdBy,
	}
}

// Validate validates the item data
func (i *Item) Validate() error {
	if i.Name == "" {
		return fmt.Errorf("item name is required (current value: '%s')", i.Name)
	}

	if len(i.Name) > 200 {
		return fmt.Errorf("item name must be less than 200 characters")
	}

	if i.BoardID.IsZero() {
		return fmt.Errorf("board ID is required")
	}

	if i.CreatedBy.IsZero() {
		return fmt.Errorf("created by user ID is required")
	}

	if i.Position < 0 {
		return fmt.Errorf("position must be non-negative")
	}

	// Validate field values
	columnIDs := make(map[string]bool)
	for j, fieldValue := range i.FieldValues {
		if fieldValue.ColumnID == "" {
			return fmt.Errorf("field value %d: column ID is required", j)
		}

		if columnIDs[fieldValue.ColumnID] {
			return fmt.Errorf("field value %d: duplicate column ID: %s", j, fieldValue.ColumnID)
		}
		columnIDs[fieldValue.ColumnID] = true

		if fieldValue.UpdatedBy.IsZero() {
			return fmt.Errorf("field value %d: updated by user ID is required", j)
		}
	}

	return nil
}

// ValidateForUpdate validates item data for update operations
func (i *Item) ValidateForUpdate() error {
	if i.Name != "" && len(i.Name) > 200 {
		return fmt.Errorf("item name must be less than 200 characters")
	}

	if i.Position < 0 {
		return fmt.Errorf("position must be non-negative")
	}

	return nil
}

// ToBSON converts the item to BSON for MongoDB operations
func (i *Item) ToBSON() (bson.M, error) {
	data, err := bson.Marshal(i)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal item to BSON: %w", err)
	}

	var bsonDoc bson.M
	err = bson.Unmarshal(data, &bsonDoc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal item BSON: %w", err)
	}

	return bsonDoc, nil
}

// FromBSON populates the item from BSON data
func (i *Item) FromBSON(data bson.M) error {
	bsonData, err := bson.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal BSON data: %w", err)
	}

	err = bson.Unmarshal(bsonData, i)
	if err != nil {
		return fmt.Errorf("failed to unmarshal BSON to item: %w", err)
	}

	return nil
}

// SetFieldValue sets or updates a field value
func (i *Item) SetFieldValue(columnID string, value interface{}, updatedBy primitive.ObjectID) error {
	if columnID == "" {
		return fmt.Errorf("column ID is required")
	}

	if updatedBy.IsZero() {
		return fmt.Errorf("updated by user ID is required")
	}

	now := time.Now()

	// Find existing field value
	for j, fieldValue := range i.FieldValues {
		if fieldValue.ColumnID == columnID {
			i.FieldValues[j].Value = value
			i.FieldValues[j].UpdatedAt = now
			i.FieldValues[j].UpdatedBy = updatedBy
			i.UpdatedAt = now
			return nil
		}
	}

	// Add new field value
	i.FieldValues = append(i.FieldValues, ItemFieldValue{
		ColumnID:  columnID,
		Value:     value,
		UpdatedAt: now,
		UpdatedBy: updatedBy,
	})

	i.UpdatedAt = now
	return nil
}

// GetFieldValue returns the value for a specific column
func (i *Item) GetFieldValue(columnID string) (interface{}, bool) {
	for _, fieldValue := range i.FieldValues {
		if fieldValue.ColumnID == columnID {
			return fieldValue.Value, true
		}
	}
	return nil, false
}

// RemoveFieldValue removes a field value
func (i *Item) RemoveFieldValue(columnID string) error {
	if columnID == "" {
		return fmt.Errorf("column ID is required")
	}

	for j, fieldValue := range i.FieldValues {
		if fieldValue.ColumnID == columnID {
			i.FieldValues = append(i.FieldValues[:j], i.FieldValues[j+1:]...)
			i.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("field value not found for column: %s", columnID)
}

// AddAssignee adds a user as an assignee
func (i *Item) AddAssignee(userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Check if already assigned
	for _, assignee := range i.Assignees {
		if assignee == userID {
			return fmt.Errorf("user is already assigned to this item")
		}
	}

	i.Assignees = append(i.Assignees, userID)
	i.UpdatedAt = time.Now()
	return nil
}

// RemoveAssignee removes a user from assignees
func (i *Item) RemoveAssignee(userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	for j, assignee := range i.Assignees {
		if assignee == userID {
			i.Assignees = append(i.Assignees[:j], i.Assignees[j+1:]...)
			i.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("user is not assigned to this item")
}

// AddWatcher adds a user as a watcher
func (i *Item) AddWatcher(userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Check if already watching
	for _, watcher := range i.Watchers {
		if watcher == userID {
			return fmt.Errorf("user is already watching this item")
		}
	}

	i.Watchers = append(i.Watchers, userID)
	i.UpdatedAt = time.Now()
	return nil
}

// RemoveWatcher removes a user from watchers
func (i *Item) RemoveWatcher(userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	for j, watcher := range i.Watchers {
		if watcher == userID {
			i.Watchers = append(i.Watchers[:j], i.Watchers[j+1:]...)
			i.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("user is not watching this item")
}

// IsAssignee checks if a user is assigned to the item
func (i *Item) IsAssignee(userID primitive.ObjectID) bool {
	for _, assignee := range i.Assignees {
		if assignee == userID {
			return true
		}
	}
	return false
}

// IsWatcher checks if a user is watching the item
func (i *Item) IsWatcher(userID primitive.ObjectID) bool {
	for _, watcher := range i.Watchers {
		if watcher == userID {
			return true
		}
	}
	return false
}

// UpdatePosition updates the item's position
func (i *Item) UpdatePosition(newPosition int) error {
	if newPosition < 0 {
		return fmt.Errorf("position must be non-negative")
	}

	i.Position = newPosition
	i.UpdatedAt = time.Now()
	return nil
}
