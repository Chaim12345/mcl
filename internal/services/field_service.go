package services

import (
	"context"
	"fmt"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FieldService handles field management operations
type FieldService struct {
	itemRepo     repository.ItemRepository
	boardRepo    repository.BoardRepository
	validator    *models.FieldValidator
	activityRepo repository.ActivityRepository
}

// NewFieldService creates a new field service
func NewFieldService(
	itemRepo repository.ItemRepository,
	boardRepo repository.BoardRepository,
	activityRepo repository.ActivityRepository,
) *FieldService {
	return &FieldService{
		itemRepo:     itemRepo,
		boardRepo:    boardRepo,
		validator:    models.NewFieldValidator(),
		activityRepo: activityRepo,
	}
}

// AddFieldToBoard adds a new field (column) to a board
func (fs *FieldService) AddFieldToBoard(ctx context.Context, boardID primitive.ObjectID, name, fieldType string, settings map[string]interface{}, userID primitive.ObjectID) (*models.BoardColumn, error) {
	// Validate field type
	if !fs.validator.IsValidFieldType(fieldType) {
		return nil, fmt.Errorf("invalid field type: %s", fieldType)
	}

	// Get the board
	board, err := fs.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Merge with default settings
	defaultSettings := fs.validator.GetDefaultFieldSettings(fieldType)
	if settings == nil {
		settings = defaultSettings
	} else {
		// Merge settings with defaults
		for key, value := range defaultSettings {
			if _, exists := settings[key]; !exists {
				settings[key] = value
			}
		}
	}

	// Add the column to the board
	err = board.AddColumn(name, fieldType, settings)
	if err != nil {
		return nil, fmt.Errorf("failed to add column to board: %w", err)
	}

	// Update the board in the database
	boardBSON, err := board.ToBSON()
	if err != nil {
		return nil, fmt.Errorf("failed to convert board to BSON: %w", err)
	}
	_, err = fs.boardRepo.Update(ctx, boardID, boardBSON)
	if err != nil {
		return nil, fmt.Errorf("failed to update board: %w", err)
	}

	// Get the newly added column
	var newColumn *models.BoardColumn
	for _, column := range board.Columns {
		if column.Name == name && column.Type == fieldType {
			newColumn = &column
			break
		}
	}

	if newColumn == nil {
		return nil, fmt.Errorf("failed to retrieve newly added column")
	}

	// Log activity
	activity := &models.Activity{
		Type:        "field_added",
		EntityType:  "board",
		EntityID:    boardID,
		UserID:      userID,
		WorkspaceID: board.WorkspaceID,
		BoardID:     &boardID,
		Data: map[string]interface{}{
			"fieldName": name,
			"fieldType": fieldType,
			"columnId":  newColumn.ID,
		},
	}

	if _, err := fs.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log activity: %v\n", err)
	}

	return newColumn, nil
}

// RemoveFieldFromBoard removes a field (column) from a board and all associated item values
func (fs *FieldService) RemoveFieldFromBoard(ctx context.Context, boardID primitive.ObjectID, columnID string, userID primitive.ObjectID) error {
	// Get the board
	board, err := fs.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}

	// Get the column before removing it
	column, err := board.GetColumn(columnID)
	if err != nil {
		return fmt.Errorf("column not found: %w", err)
	}

	// Remove the column from the board
	err = board.RemoveColumn(columnID)
	if err != nil {
		return fmt.Errorf("failed to remove column from board: %w", err)
	}

	// Update the board in the database
	boardBSON, err := board.ToBSON()
	if err != nil {
		return fmt.Errorf("failed to convert board to BSON: %w", err)
	}
	_, err = fs.boardRepo.Update(ctx, boardID, boardBSON)
	if err != nil {
		return fmt.Errorf("failed to update board: %w", err)
	}

	// Remove field values from all items in the board
	items, err := fs.itemRepo.GetByBoardID(ctx, boardID)
	if err != nil {
		return fmt.Errorf("failed to get board items: %w", err)
	}

	for _, item := range items {
		// Remove the field value if it exists
		if _, exists := item.GetFieldValue(columnID); exists {
			err = item.RemoveFieldValue(columnID)
			if err != nil {
				fmt.Printf("Failed to remove field value from item %s: %v\n", item.ID.Hex(), err)
				continue
			}

			// Update the item in the database
			itemBSON, err := item.ToBSON()
			if err != nil {
				fmt.Printf("Failed to convert item to BSON %s: %v\n", item.ID.Hex(), err)
				continue
			}
			_, err = fs.itemRepo.Update(ctx, item.ID, itemBSON)
			if err != nil {
				fmt.Printf("Failed to update item %s: %v\n", item.ID.Hex(), err)
				continue
			}
		}
	}

	// Log activity
	activity := &models.Activity{
		Type:        "field_removed",
		EntityType:  "board",
		EntityID:    boardID,
		UserID:      userID,
		WorkspaceID: board.WorkspaceID,
		BoardID:     &boardID,
		Data: map[string]interface{}{
			"fieldName": column.Name,
			"fieldType": column.Type,
			"columnId":  columnID,
		},
	}

	if _, err := fs.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log activity: %v\n", err)
	}

	return nil
}

// UpdateFieldInBoard updates a field (column) in a board
func (fs *FieldService) UpdateFieldInBoard(ctx context.Context, boardID primitive.ObjectID, columnID, name, fieldType string, settings map[string]interface{}, userID primitive.ObjectID) (*models.BoardColumn, error) {
	// Validate field type if provided
	if fieldType != "" && !fs.validator.IsValidFieldType(fieldType) {
		return nil, fmt.Errorf("invalid field type: %s", fieldType)
	}

	// Get the board
	board, err := fs.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Get the current column
	currentColumn, err := board.GetColumn(columnID)
	if err != nil {
		return nil, fmt.Errorf("column not found: %w", err)
	}

	// If field type is changing, validate all existing field values
	if fieldType != "" && fieldType != currentColumn.Type {
		items, err := fs.itemRepo.GetByBoardID(ctx, boardID)
		if err != nil {
			return nil, fmt.Errorf("failed to get board items: %w", err)
		}

		// Merge with default settings for the new type
		newSettings := settings
		if newSettings == nil {
			newSettings = fs.validator.GetDefaultFieldSettings(fieldType)
		} else {
			defaultSettings := fs.validator.GetDefaultFieldSettings(fieldType)
			for key, value := range defaultSettings {
				if _, exists := newSettings[key]; !exists {
					newSettings[key] = value
				}
			}
		}

		// Validate existing field values against the new type
		for _, item := range items {
			if value, exists := item.GetFieldValue(columnID); exists && value != nil {
				if err := fs.validator.ValidateFieldValue(fieldType, value, newSettings); err != nil {
					return nil, fmt.Errorf("existing field value in item %s is incompatible with new field type: %w", item.ID.Hex(), err)
				}
			}
		}
	}

	// Update the column
	err = board.UpdateColumn(columnID, name, fieldType, settings)
	if err != nil {
		return nil, fmt.Errorf("failed to update column: %w", err)
	}

	// Update the board in the database
	boardBSON, err := board.ToBSON()
	if err != nil {
		return nil, fmt.Errorf("failed to convert board to BSON: %w", err)
	}
	_, err = fs.boardRepo.Update(ctx, boardID, boardBSON)
	if err != nil {
		return nil, fmt.Errorf("failed to update board: %w", err)
	}

	// Get the updated column
	updatedColumn, err := board.GetColumn(columnID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated column: %w", err)
	}

	// Log activity
	activity := &models.Activity{
		Type:        "field_updated",
		EntityType:  "board",
		EntityID:    boardID,
		UserID:      userID,
		WorkspaceID: board.WorkspaceID,
		BoardID:     &boardID,
		Data: map[string]interface{}{
			"fieldName": updatedColumn.Name,
			"fieldType": updatedColumn.Type,
			"columnId":  columnID,
			"changes": map[string]interface{}{
				"name":     name,
				"type":     fieldType,
				"settings": settings,
			},
		},
	}

	if _, err := fs.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log activity: %v\n", err)
	}

	return updatedColumn, nil
}

// SetItemFieldValue sets a field value for an item
func (fs *FieldService) SetItemFieldValue(ctx context.Context, itemID primitive.ObjectID, columnID string, value interface{}, userID primitive.ObjectID) error {
	// Get the item
	item, err := fs.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return fmt.Errorf("failed to get item: %w", err)
	}

	// Get the board to validate the field
	board, err := fs.boardRepo.GetByID(ctx, item.BoardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}

	// Get the column definition
	column, err := board.GetColumn(columnID)
	if err != nil {
		return fmt.Errorf("column not found: %w", err)
	}

	// Normalize the value
	normalizedValue, err := fs.validator.NormalizeFieldValue(column.Type, value)
	if err != nil {
		return fmt.Errorf("failed to normalize field value: %w", err)
	}

	// Validate the field value
	err = fs.validator.ValidateFieldValue(column.Type, normalizedValue, column.Settings)
	if err != nil {
		return fmt.Errorf("invalid field value: %w", err)
	}

	// Get the old value for activity logging
	oldValue, _ := item.GetFieldValue(columnID)

	// Set the field value
	err = item.SetFieldValue(columnID, normalizedValue, userID)
	if err != nil {
		return fmt.Errorf("failed to set field value: %w", err)
	}

	// Update the item in the database
	itemBSON, err := item.ToBSON()
	if err != nil {
		return fmt.Errorf("failed to convert item to BSON: %w", err)
	}
	_, err = fs.itemRepo.Update(ctx, itemID, itemBSON)
	if err != nil {
		return fmt.Errorf("failed to update item: %w", err)
	}

	// Log activity
	activity := &models.Activity{
		Type:        "field_value_updated",
		EntityType:  "item",
		EntityID:    itemID,
		UserID:      userID,
		WorkspaceID: board.WorkspaceID,
		BoardID:     &item.BoardID,
		ItemID:      &itemID,
		Data: map[string]interface{}{
			"fieldName": column.Name,
			"fieldType": column.Type,
			"columnId":  columnID,
			"oldValue":  oldValue,
			"newValue":  normalizedValue,
		},
	}

	if _, err := fs.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log activity: %v\n", err)
	}

	return nil
}

// RemoveItemFieldValue removes a field value from an item
func (fs *FieldService) RemoveItemFieldValue(ctx context.Context, itemID primitive.ObjectID, columnID string, userID primitive.ObjectID) error {
	// Get the item
	item, err := fs.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return fmt.Errorf("failed to get item: %w", err)
	}

	// Get the board for activity logging
	board, err := fs.boardRepo.GetByID(ctx, item.BoardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}

	// Get the column definition
	column, err := board.GetColumn(columnID)
	if err != nil {
		return fmt.Errorf("column not found: %w", err)
	}

	// Get the old value for activity logging
	oldValue, exists := item.GetFieldValue(columnID)
	if !exists {
		return fmt.Errorf("field value not found")
	}

	// Remove the field value
	err = item.RemoveFieldValue(columnID)
	if err != nil {
		return fmt.Errorf("failed to remove field value: %w", err)
	}

	// Update the item in the database
	itemBSON, err := item.ToBSON()
	if err != nil {
		return fmt.Errorf("failed to convert item to BSON: %w", err)
	}
	_, err = fs.itemRepo.Update(ctx, itemID, itemBSON)
	if err != nil {
		return fmt.Errorf("failed to update item: %w", err)
	}

	// Log activity
	activity := &models.Activity{
		Type:        "field_value_removed",
		EntityType:  "item",
		EntityID:    itemID,
		UserID:      userID,
		WorkspaceID: board.WorkspaceID,
		BoardID:     &item.BoardID,
		ItemID:      &itemID,
		Data: map[string]interface{}{
			"fieldName": column.Name,
			"fieldType": column.Type,
			"columnId":  columnID,
			"oldValue":  oldValue,
		},
	}

	if _, err := fs.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log activity: %v\n", err)
	}

	return nil
}

// GetBoardFields returns all fields (columns) for a board
func (fs *FieldService) GetBoardFields(ctx context.Context, boardID primitive.ObjectID) ([]models.BoardColumn, error) {
	board, err := fs.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	return board.Columns, nil
}

// ValidateFieldValue validates a field value without setting it
func (fs *FieldService) ValidateFieldValue(fieldType string, value interface{}, settings map[string]interface{}) error {
	return fs.validator.ValidateFieldValue(fieldType, value, settings)
}

// GetDefaultFieldSettings returns default settings for a field type
func (fs *FieldService) GetDefaultFieldSettings(fieldType string) map[string]interface{} {
	return fs.validator.GetDefaultFieldSettings(fieldType)
}

// IsValidFieldType checks if a field type is valid
func (fs *FieldService) IsValidFieldType(fieldType string) bool {
	return fs.validator.IsValidFieldType(fieldType)
}
