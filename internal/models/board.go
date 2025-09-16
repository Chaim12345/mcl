package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Board represents a board document in MongoDB
type Board struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	WorkspaceID primitive.ObjectID `bson:"workspaceId" json:"workspaceId"`
	Color       string             `bson:"color,omitempty" json:"color,omitempty"`
	Columns     []BoardColumn      `bson:"columns" json:"columns"`
	Permissions []BoardPermission  `bson:"permissions,omitempty" json:"permissions,omitempty"`
	Settings    BoardSettings      `bson:"settings" json:"settings"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy   primitive.ObjectID `bson:"createdBy" json:"createdBy"`
}

// BoardColumn represents a column in a board
type BoardColumn struct {
	ID       string                 `bson:"id" json:"id"`
	Name     string                 `bson:"name" json:"name"`
	Type     string                 `bson:"type" json:"type"` // 'text', 'status', 'date', 'number', 'person'
	Settings map[string]interface{} `bson:"settings,omitempty" json:"settings,omitempty"`
	Position int                    `bson:"position" json:"position"`
	CreatedAt time.Time             `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time             `bson:"updatedAt" json:"updatedAt"`
}

// BoardSettings holds board configuration
type BoardSettings struct {
	Permissions   map[string]interface{} `bson:"permissions,omitempty" json:"permissions,omitempty"`
	Notifications map[string]interface{} `bson:"notifications,omitempty" json:"notifications,omitempty"`
}

// BoardPermission represents user permissions for a board
type BoardPermission struct {
	UserID     primitive.ObjectID `bson:"userId" json:"userId"`
	Permission string             `bson:"permission" json:"permission"` // 'view', 'edit', 'admin'
	GrantedBy  primitive.ObjectID `bson:"grantedBy" json:"grantedBy"`
	GrantedAt  time.Time          `bson:"grantedAt" json:"grantedAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// Column type constants
const (
	ColumnTypeText     = "text"
	ColumnTypeStatus   = "status"
	ColumnTypePriority = "priority"
	ColumnTypeDate     = "date"
	ColumnTypeNumber   = "number"
	ColumnTypePerson   = "person"
)

// NewBoard creates a new board with default columns
func NewBoard(name, description string, workspaceID, createdBy primitive.ObjectID) *Board {
	now := time.Now()

	// Create default columns
	defaultColumns := []BoardColumn{
		{
			ID:       "col_" + primitive.NewObjectID().Hex(),
			Name:     "To Do",
			Type:     ColumnTypeStatus,
			Position: 0,
			Settings: map[string]interface{}{
				"options": []string{"To Do", "In Progress", "Done"},
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:       "col_" + primitive.NewObjectID().Hex(),
			Name:     "Status",
			Type:     ColumnTypeStatus,
			Position: 1,
			Settings: map[string]interface{}{
				"options": []string{"Not Started", "In Progress", "Completed"},
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:       "col_" + primitive.NewObjectID().Hex(),
			Name:     "Priority",
			Type:     ColumnTypeStatus,
			Position: 2,
			Settings: map[string]interface{}{
				"options": []string{"Low", "Medium", "High", "Critical"},
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	return &Board{
		ID:          primitive.NewObjectID(),
		Name:        name,
		Description: description,
		WorkspaceID: workspaceID,
		Color:       "#4F46E5", // Default indigo color
		Columns:     defaultColumns,
		Settings: BoardSettings{
			Permissions:   make(map[string]interface{}),
			Notifications: make(map[string]interface{}),
		},
		CreatedAt: now,
		UpdatedAt: now,
		CreatedBy: createdBy,
	}
}

// Validate validates the board data
func (b *Board) Validate() error {
	if b.Name == "" {
		return fmt.Errorf("board name is required")
	}

	if len(b.Name) > 100 {
		return fmt.Errorf("board name must be less than 100 characters")
	}

	if len(b.Description) > 500 {
		return fmt.Errorf("board description must be less than 500 characters")
	}

	if b.WorkspaceID.IsZero() {
		return fmt.Errorf("workspace ID is required")
	}

	if b.CreatedBy.IsZero() {
		return fmt.Errorf("created by user ID is required")
	}

	// Validate columns
	columnIDs := make(map[string]bool)
	for i, column := range b.Columns {
		if column.ID == "" {
			return fmt.Errorf("column %d: ID is required", i)
		}

		if columnIDs[column.ID] {
			return fmt.Errorf("column %d: duplicate column ID: %s", i, column.ID)
		}
		columnIDs[column.ID] = true

		if column.Name == "" {
			return fmt.Errorf("column %d: name is required", i)
		}

		if len(column.Name) > 50 {
			return fmt.Errorf("column %d: name must be less than 50 characters", i)
		}

		if !isValidColumnType(column.Type) {
			return fmt.Errorf("column %d: invalid type: %s", i, column.Type)
		}

		if column.Position < 0 {
			return fmt.Errorf("column %d: position must be non-negative", i)
		}
	}

	return nil
}

// ValidateForUpdate validates board data for update operations
func (b *Board) ValidateForUpdate() error {
	if b.Name != "" && len(b.Name) > 100 {
		return fmt.Errorf("board name must be less than 100 characters")
	}

	if len(b.Description) > 500 {
		return fmt.Errorf("board description must be less than 500 characters")
	}

	return nil
}

// ToBSON converts the board to BSON for MongoDB operations
func (b *Board) ToBSON() (bson.M, error) {
	data, err := bson.Marshal(b)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal board to BSON: %w", err)
	}

	var bsonDoc bson.M
	err = bson.Unmarshal(data, &bsonDoc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal board BSON: %w", err)
	}

	return bsonDoc, nil
}

// FromBSON populates the board from BSON data
func (b *Board) FromBSON(data bson.M) error {
	bsonData, err := bson.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal BSON data: %w", err)
	}

	err = bson.Unmarshal(bsonData, b)
	if err != nil {
		return fmt.Errorf("failed to unmarshal BSON to board: %w", err)
	}

	return nil
}

// AddColumn adds a new column to the board
func (b *Board) AddColumn(name, columnType string, settings map[string]interface{}) error {
	if name == "" {
		return fmt.Errorf("column name is required")
	}

	if len(name) > 50 {
		return fmt.Errorf("column name must be less than 50 characters")
	}

	if !isValidColumnType(columnType) {
		return fmt.Errorf("invalid column type: %s", columnType)
	}

	// Find the next position
	maxPosition := -1
	for _, col := range b.Columns {
		if col.Position > maxPosition {
			maxPosition = col.Position
		}
	}

	newColumn := BoardColumn{
		ID:       "col_" + primitive.NewObjectID().Hex(),
		Name:     name,
		Type:     columnType,
		Settings: settings,
		Position: maxPosition + 1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	b.Columns = append(b.Columns, newColumn)
	b.UpdatedAt = time.Now()

	return nil
}

// RemoveColumn removes a column from the board
func (b *Board) RemoveColumn(columnID string) error {
	if columnID == "" {
		return fmt.Errorf("column ID is required")
	}

	for i, column := range b.Columns {
		if column.ID == columnID {
			b.Columns = append(b.Columns[:i], b.Columns[i+1:]...)
			b.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("column not found: %s", columnID)
}

// UpdateColumn updates an existing column
func (b *Board) UpdateColumn(columnID, name, columnType string, settings map[string]interface{}) error {
	if columnID == "" {
		return fmt.Errorf("column ID is required")
	}

	for i, column := range b.Columns {
		if column.ID == columnID {
			if name != "" {
				if len(name) > 50 {
					return fmt.Errorf("column name must be less than 50 characters")
				}
				b.Columns[i].Name = name
			}

			if columnType != "" {
				if !isValidColumnType(columnType) {
					return fmt.Errorf("invalid column type: %s", columnType)
				}
				b.Columns[i].Type = columnType
			}

			if settings != nil {
				b.Columns[i].Settings = settings
			}

			b.Columns[i].UpdatedAt = time.Now()
			b.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("column not found: %s", columnID)
}

// GetColumn returns a column by ID
func (b *Board) GetColumn(columnID string) (*BoardColumn, error) {
	for _, column := range b.Columns {
		if column.ID == columnID {
			return &column, nil
		}
	}
	return nil, fmt.Errorf("column not found: %s", columnID)
}

// ReorderColumns reorders columns based on new positions
func (b *Board) ReorderColumns(columnOrder []string) error {
	if len(columnOrder) != len(b.Columns) {
		return fmt.Errorf("column order length mismatch")
	}

	// Create a map of existing columns
	columnMap := make(map[string]BoardColumn)
	for _, column := range b.Columns {
		columnMap[column.ID] = column
	}

	// Reorder columns
	newColumns := make([]BoardColumn, 0, len(columnOrder))
	for i, columnID := range columnOrder {
		column, exists := columnMap[columnID]
		if !exists {
			return fmt.Errorf("column not found: %s", columnID)
		}
		column.Position = i
		newColumns = append(newColumns, column)
	}

	b.Columns = newColumns
	b.UpdatedAt = time.Now()

	return nil
}

// isValidColumnType checks if the column type is valid
func isValidColumnType(columnType string) bool {
	validTypes := []string{
		ColumnTypeText,
		ColumnTypeStatus,
		ColumnTypePriority,
		ColumnTypeDate,
		ColumnTypeNumber,
		ColumnTypePerson,
	}

	for _, validType := range validTypes {
		if columnType == validType {
			return true
		}
	}

	return false
}
