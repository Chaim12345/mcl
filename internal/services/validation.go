package services

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FieldValidator handles validation of field values based on column types
type FieldValidator struct {
	columnType string
	settings   map[string]interface{}
	required   bool
}

// NewFieldValidator creates a new field validator for a specific column type
func NewFieldValidator(columnType string, settings map[string]interface{}, required bool) *FieldValidator {
	return &FieldValidator{
		columnType: columnType,
		settings:   settings,
		required:   required,
	}
}

// Validate validates a field value based on the column type and settings
func (fv *FieldValidator) Validate(value interface{}) error {
	// Handle nil/empty values
	if value == nil {
		if fv.required {
			return fmt.Errorf("field is required")
		}
		return nil
	}

	// Convert string values that might be empty
	if str, ok := value.(string); ok && str == "" {
		if fv.required {
			return fmt.Errorf("field is required")
		}
		return nil
	}

	switch fv.columnType {
	case "text":
		return fv.validateText(value)
	case "number":
		return fv.validateNumber(value)
	case "date":
		return fv.validateDate(value)
	case "status":
		return fv.validateStatus(value)
	case "priority":
		return fv.validatePriority(value)
	case "person":
		return fv.validatePerson(value)
	case "boolean":
		return fv.validateBoolean(value)
	case "email":
		return fv.validateEmail(value)
	case "url":
		return fv.validateURL(value)
	default:
		return fmt.Errorf("unsupported column type: %s", fv.columnType)
	}
}

func (fv *FieldValidator) validateText(value interface{}) error {
	str, ok := value.(string)
	if !ok {
		return fmt.Errorf("text field must be a string, got %T", value)
	}

	// Check max length if specified
	if maxLength, ok := fv.settings["maxLength"].(float64); ok {
		if len(str) > int(maxLength) {
			return fmt.Errorf("text must be %d characters or less", int(maxLength))
		}
	}

	// Check min length if specified
	if minLength, ok := fv.settings["minLength"].(float64); ok {
		if len(str) < int(minLength) {
			return fmt.Errorf("text must be at least %d characters", int(minLength))
		}
	}

	// Check pattern if specified
	if pattern, ok := fv.settings["pattern"].(string); ok && pattern != "" {
		// Simple pattern matching - in production, use proper regex
		if !strings.Contains(str, pattern) {
			return fmt.Errorf("text does not match required pattern")
		}
	}

	return nil
}

func (fv *FieldValidator) validateNumber(value interface{}) error {
	var num float64
	switch v := value.(type) {
	case float64:
		num = v
	case float32:
		num = float64(v)
	case int:
		num = float64(v)
	case int64:
		num = float64(v)
	case int32:
		num = float64(v)
	case string:
		var err error
		num, err = strconv.ParseFloat(v, 64)
		if err != nil {
			return fmt.Errorf("invalid number format: %v", err)
		}
	default:
		return fmt.Errorf("number field must be a numeric value, got %T", value)
	}

	// Check minimum value
	if min, ok := fv.settings["min"].(float64); ok {
		if num < min {
			return fmt.Errorf("number must be at least %f", min)
		}
	}

	// Check maximum value
	if max, ok := fv.settings["max"].(float64); ok {
		if num > max {
			return fmt.Errorf("number must be at most %f", max)
		}
	}

	// Check if integer required
	if isInteger, ok := fv.settings["integer"].(bool); ok && isInteger {
		if num != float64(int(num)) {
			return fmt.Errorf("number must be an integer")
		}
	}

	return nil
}

func (fv *FieldValidator) validateDate(value interface{}) error {
	var dateStr string
	switch v := value.(type) {
	case string:
		dateStr = v
	case time.Time:
		return nil // Already a valid time
	default:
		return fmt.Errorf("date field must be a string or time.Time, got %T", value)
	}

	// Parse the date string
	_, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		// Try parsing as date only
		_, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			return fmt.Errorf("invalid date format: %v", err)
		}
	}

	return nil
}

func (fv *FieldValidator) validateStatus(value interface{}) error {
	str, ok := value.(string)
	if !ok {
		return fmt.Errorf("status field must be a string, got %T", value)
	}

	// Get valid options from settings
	options, ok := fv.settings["options"].([]interface{})
	if !ok {
		// Default status options
		options = []interface{}{"To Do", "In Progress", "Done"}
	}

	// Convert options to strings and check if value is valid
	validOptions := make([]string, len(options))
	for i, opt := range options {
		optStr, ok := opt.(string)
		if !ok {
			continue
		}
		validOptions[i] = optStr
	}

	// Check if the value is in valid options
	for _, opt := range validOptions {
		if str == opt {
			return nil
		}
	}

	return fmt.Errorf("invalid status: %s. Must be one of: %v", str, validOptions)
}

func (fv *FieldValidator) validatePriority(value interface{}) error {
	str, ok := value.(string)
	if !ok {
		return fmt.Errorf("priority field must be a string, got %T", value)
	}

	// Get valid options from settings
	options, ok := fv.settings["options"].([]interface{})
	if !ok {
		// Default priority options
		options = []interface{}{"Low", "Medium", "High", "Critical"}
	}

	// Convert options to strings and check if value is valid
	validOptions := make([]string, len(options))
	for i, opt := range options {
		optStr, ok := opt.(string)
		if !ok {
			continue
		}
		validOptions[i] = optStr
	}

	// Check if the value is in valid options
	for _, opt := range validOptions {
		if str == opt {
			return nil
		}
	}

	return fmt.Errorf("invalid priority: %s. Must be one of: %v", str, validOptions)
}

func (fv *FieldValidator) validatePerson(value interface{}) error {
	switch v := value.(type) {
	case string:
		// Validate as ObjectID string
		_, err := primitive.ObjectIDFromHex(v)
		if err != nil {
			return fmt.Errorf("invalid user ID format: %v", err)
		}
		return nil
	case primitive.ObjectID:
		return nil // Already valid ObjectID
	case []interface{}:
		// Handle array of people
		for _, person := range v {
			switch p := person.(type) {
			case string:
				_, err := primitive.ObjectIDFromHex(p)
				if err != nil {
					return fmt.Errorf("invalid user ID format in array: %v", err)
				}
			case primitive.ObjectID:
				continue // Valid
			default:
				return fmt.Errorf("person field must contain valid user IDs, got %T", p)
			}
		}
		return nil
	default:
		return fmt.Errorf("person field must be a user ID or array of user IDs, got %T", value)
	}
}

func (fv *FieldValidator) validateBoolean(value interface{}) error {
	switch value.(type) {
	case bool:
		return nil
	case string:
		str := strings.ToLower(value.(string))
		if str == "true" || str == "1" || str == "yes" || str == "false" || str == "0" || str == "no" {
			return nil
		}
		return fmt.Errorf("invalid boolean value: %s", value)
	case float64:
		val := value.(float64)
		if val == 0 || val == 1 {
			return nil
		}
		return fmt.Errorf("invalid boolean value: %f", val)
	default:
		return fmt.Errorf("boolean field must be a boolean, string, or number, got %T", value)
	}
}

func (fv *FieldValidator) validateEmail(value interface{}) error {
	str, ok := value.(string)
	if !ok {
		return fmt.Errorf("email field must be a string, got %T", value)
	}

	// Basic email validation
	if !strings.Contains(str, "@") || !strings.Contains(str, ".") {
		return fmt.Errorf("invalid email format")
	}

	// Check max length
	if len(str) > 254 {
		return fmt.Errorf("email must be 254 characters or less")
	}

	return nil
}

func (fv *FieldValidator) validateURL(value interface{}) error {
	str, ok := value.(string)
	if !ok {
		return fmt.Errorf("URL field must be a string, got %T", value)
	}

	// Basic URL validation
	if !strings.HasPrefix(str, "http://") && !strings.HasPrefix(str, "https://") {
		return fmt.Errorf("URL must start with http:// or https://")
	}

	return nil
}

// ValidateFieldValues validates all field values for an item based on board columns
func ValidateFieldValues(fieldValues map[string]interface{}, columns []BoardColumn, boardID primitive.ObjectID) error {
	// Create a map of columns for quick lookup
	columnMap := make(map[string]BoardColumn)
	for _, col := range columns {
		columnMap[col.ID] = col
	}

	// Validate each field value against its corresponding column
	for columnID, value := range fieldValues {
		column, exists := columnMap[columnID]
		if !exists {
			return fmt.Errorf("column %s not found in board", columnID)
		}

		// Check if field is required
		required := false
		if req, ok := column.Settings["required"].(bool); ok {
			required = req
		}

		// Create validator and validate
		validator := NewFieldValidator(column.Type, column.Settings, required)
		if err := validator.Validate(value); err != nil {
			return fmt.Errorf("field '%s' validation failed: %w", column.Name, err)
		}
	}

	return nil
}

// GetRequiredFields returns a list of required field IDs for a board
func GetRequiredFields(columns []BoardColumn) []string {
	var requiredFields []string
	for _, col := range columns {
		if required, ok := col.Settings["required"].(bool); ok && required {
			requiredFields = append(requiredFields, col.ID)
		}
	}
	return requiredFields
}

// IsValidFieldType checks if the given value matches the expected type for a column
func IsValidFieldType(columnType string, value interface{}) bool {
	validator := NewFieldValidator(columnType, nil, false)
	err := validator.Validate(value)
	return err == nil
}