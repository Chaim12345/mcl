package models

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TestFieldManagementIntegration tests the complete field management workflow
func TestFieldManagementIntegration(t *testing.T) {
	// Create a board with default columns
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()
	board := NewBoard("Test Board", "Test Description", workspaceID, userID)

	// Verify default columns are created
	if len(board.Columns) != 3 {
		t.Errorf("Expected 3 default columns, got %d", len(board.Columns))
	}

	// Add a custom priority field
	err := board.AddColumn("Priority", FieldTypePriority, map[string]interface{}{
		"options": []string{"Low", "Medium", "High", "Critical"},
	})
	if err != nil {
		t.Errorf("Failed to add priority column: %v", err)
	}

	if len(board.Columns) != 4 {
		t.Errorf("Expected 4 columns after adding priority, got %d", len(board.Columns))
	}

	// Add a custom date field
	err = board.AddColumn("Due Date", FieldTypeDate, map[string]interface{}{
		"format": "YYYY-MM-DD",
	})
	if err != nil {
		t.Errorf("Failed to add date column: %v", err)
	}

	if len(board.Columns) != 5 {
		t.Errorf("Expected 5 columns after adding date, got %d", len(board.Columns))
	}

	// Create an item
	item := NewItem("Test Item", board.ID, userID)

	// Set field values for different types
	validator := NewFieldValidator()

	// Set status field value
	statusColumnID := board.Columns[0].ID
	err = item.SetFieldValue(statusColumnID, "In Progress", userID)
	if err != nil {
		t.Errorf("Failed to set status field value: %v", err)
	}

	// Validate the status field value
	statusValue, exists := item.GetFieldValue(statusColumnID)
	if !exists {
		t.Error("Status field value not found")
	}
	if statusValue != "In Progress" {
		t.Errorf("Expected status value 'In Progress', got %v", statusValue)
	}

	// Set priority field value
	priorityColumnID := board.Columns[3].ID // Priority column we added
	err = item.SetFieldValue(priorityColumnID, "High", userID)
	if err != nil {
		t.Errorf("Failed to set priority field value: %v", err)
	}

	// Validate priority field value
	err = validator.ValidateFieldValue(FieldTypePriority, "High", board.Columns[3].Settings)
	if err != nil {
		t.Errorf("Priority field validation failed: %v", err)
	}

	// Set date field value
	dateColumnID := board.Columns[4].ID // Date column we added
	testDate := "2023-12-25"
	err = item.SetFieldValue(dateColumnID, testDate, userID)
	if err != nil {
		t.Errorf("Failed to set date field value: %v", err)
	}

	// Validate date field value
	err = validator.ValidateFieldValue(FieldTypeDate, testDate, board.Columns[4].Settings)
	if err != nil {
		t.Errorf("Date field validation failed: %v", err)
	}

	// Test field value normalization
	normalizedDate, err := validator.NormalizeFieldValue(FieldTypeDate, testDate)
	if err != nil {
		t.Errorf("Date field normalization failed: %v", err)
	}
	if normalizedDate == nil {
		t.Error("Normalized date should not be nil")
	}

	// Test invalid field values
	err = validator.ValidateFieldValue(FieldTypeStatus, "Invalid Status", board.Columns[0].Settings)
	if err == nil {
		t.Error("Expected validation error for invalid status value")
	}

	err = validator.ValidateFieldValue(FieldTypePriority, "Super High", board.Columns[3].Settings)
	if err == nil {
		t.Error("Expected validation error for invalid priority value")
	}

	err = validator.ValidateFieldValue(FieldTypeDate, "invalid-date", board.Columns[4].Settings)
	if err == nil {
		t.Error("Expected validation error for invalid date value")
	}

	// Test field removal
	err = item.RemoveFieldValue(statusColumnID)
	if err != nil {
		t.Errorf("Failed to remove field value: %v", err)
	}

	_, exists = item.GetFieldValue(statusColumnID)
	if exists {
		t.Error("Field value should have been removed")
	}

	// Test column removal from board
	err = board.RemoveColumn(priorityColumnID)
	if err != nil {
		t.Errorf("Failed to remove column: %v", err)
	}

	if len(board.Columns) != 4 {
		t.Errorf("Expected 4 columns after removing priority, got %d", len(board.Columns))
	}

	// Verify the column was actually removed
	_, err = board.GetColumn(priorityColumnID)
	if err == nil {
		t.Error("Expected error when getting removed column")
	}

	// Test field type validation
	if !validator.IsValidFieldType(FieldTypeStatus) {
		t.Error("Status should be a valid field type")
	}

	if !validator.IsValidFieldType(FieldTypePriority) {
		t.Error("Priority should be a valid field type")
	}

	if !validator.IsValidFieldType(FieldTypeDate) {
		t.Error("Date should be a valid field type")
	}

	if !validator.IsValidFieldType(FieldTypeText) {
		t.Error("Text should be a valid field type")
	}

	if validator.IsValidFieldType("invalid-type") {
		t.Error("Invalid type should not be valid")
	}

	// Test default field settings
	statusSettings := validator.GetDefaultFieldSettings(FieldTypeStatus)
	if _, exists := statusSettings["options"]; !exists {
		t.Error("Status field should have default options")
	}

	prioritySettings := validator.GetDefaultFieldSettings(FieldTypePriority)
	if _, exists := prioritySettings["options"]; !exists {
		t.Error("Priority field should have default options")
	}

	dateSettings := validator.GetDefaultFieldSettings(FieldTypeDate)
	if _, exists := dateSettings["format"]; !exists {
		t.Error("Date field should have default format")
	}

	textSettings := validator.GetDefaultFieldSettings(FieldTypeText)
	if _, exists := textSettings["maxLength"]; !exists {
		t.Error("Text field should have default maxLength")
	}
}

// TestFieldValueTypes tests different field value types and their validation
func TestFieldValueTypes(t *testing.T) {
	validator := NewFieldValidator()

	tests := []struct {
		name      string
		fieldType string
		value     interface{}
		settings  map[string]interface{}
		wantValid bool
	}{
		// Status field tests
		{
			name:      "valid status",
			fieldType: FieldTypeStatus,
			value:     "In Progress",
			settings:  map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			wantValid: true,
		},
		{
			name:      "invalid status",
			fieldType: FieldTypeStatus,
			value:     "Invalid",
			settings:  map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			wantValid: false,
		},

		// Priority field tests
		{
			name:      "valid priority",
			fieldType: FieldTypePriority,
			value:     "High",
			settings:  nil, // Use defaults
			wantValid: true,
		},
		{
			name:      "invalid priority",
			fieldType: FieldTypePriority,
			value:     "Super High",
			settings:  nil,
			wantValid: false,
		},

		// Date field tests
		{
			name:      "valid ISO date",
			fieldType: FieldTypeDate,
			value:     "2023-12-25T10:30:00Z",
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "valid date string",
			fieldType: FieldTypeDate,
			value:     "2023-12-25",
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "valid time.Time",
			fieldType: FieldTypeDate,
			value:     time.Now(),
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "invalid date",
			fieldType: FieldTypeDate,
			value:     "not-a-date",
			settings:  nil,
			wantValid: false,
		},

		// Text field tests
		{
			name:      "valid text",
			fieldType: FieldTypeText,
			value:     "This is valid text",
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "text too long",
			fieldType: FieldTypeText,
			value:     "This text is too long",
			settings:  map[string]interface{}{"maxLength": 10},
			wantValid: false,
		},

		// Person field tests
		{
			name:      "valid person ObjectID",
			fieldType: FieldTypePerson,
			value:     primitive.NewObjectID(),
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "valid person ObjectID string",
			fieldType: FieldTypePerson,
			value:     primitive.NewObjectID().Hex(),
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "invalid person string",
			fieldType: FieldTypePerson,
			value:     "not-an-objectid",
			settings:  nil,
			wantValid: false,
		},

		// Number field tests
		{
			name:      "valid number int",
			fieldType: FieldTypeNumber,
			value:     42,
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "valid number float",
			fieldType: FieldTypeNumber,
			value:     3.14,
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "valid number string",
			fieldType: FieldTypeNumber,
			value:     "42.5",
			settings:  nil,
			wantValid: true,
		},
		{
			name:      "invalid number string",
			fieldType: FieldTypeNumber,
			value:     "not-a-number",
			settings:  nil,
			wantValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateFieldValue(tt.fieldType, tt.value, tt.settings)
			if tt.wantValid && err != nil {
				t.Errorf("Expected valid field value, got error: %v", err)
			}
			if !tt.wantValid && err == nil {
				t.Error("Expected validation error, got nil")
			}
		})
	}
}
