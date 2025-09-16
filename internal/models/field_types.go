package models

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FieldType constants for different field types (using board column type constants for consistency)
const (
	FieldTypeStatus   = ColumnTypeStatus
	FieldTypePriority = ColumnTypePriority
	FieldTypeDate     = ColumnTypeDate
	FieldTypeText     = ColumnTypeText
	FieldTypePerson   = ColumnTypePerson
	FieldTypeNumber   = ColumnTypeNumber
)

// PriorityLevel constants
const (
	PriorityLow      = "Low"
	PriorityMedium   = "Medium"
	PriorityHigh     = "High"
	PriorityCritical = "Critical"
)

// StatusOption constants
const (
	StatusNotStarted = "Not Started"
	StatusToDo       = "To Do"
	StatusInProgress = "In Progress"
	StatusDone       = "Done"
	StatusCompleted  = "Completed"
)

// FieldValidator provides validation for different field types
type FieldValidator struct{}

// NewFieldValidator creates a new field validator
func NewFieldValidator() *FieldValidator {
	return &FieldValidator{}
}

// ValidateFieldValue validates a field value based on its type and settings
func (fv *FieldValidator) ValidateFieldValue(fieldType string, value interface{}, settings map[string]interface{}) error {
	if value == nil {
		return nil // Allow nil values for optional fields
	}

	switch fieldType {
	case FieldTypeStatus:
		return fv.validateStatusField(value, settings)
	case FieldTypePriority:
		return fv.validatePriorityField(value, settings)
	case FieldTypeDate:
		return fv.validateDateField(value, settings)
	case FieldTypeText:
		return fv.validateTextField(value, settings)
	case FieldTypePerson:
		return fv.validatePersonField(value, settings)
	case FieldTypeNumber:
		return fv.validateNumberField(value, settings)
	default:
		return fmt.Errorf("unsupported field type: %s", fieldType)
	}
}

// validateStatusField validates status field values
func (fv *FieldValidator) validateStatusField(value interface{}, settings map[string]interface{}) error {
	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("status field value must be a string")
	}

	if strValue == "" {
		return nil // Allow empty status
	}

	// Get allowed options from settings
	if options, exists := settings["options"]; exists {
		if optionsList, ok := options.([]interface{}); ok {
			for _, option := range optionsList {
				if optionStr, ok := option.(string); ok && optionStr == strValue {
					return nil
				}
			}
			return fmt.Errorf("invalid status option: %s", strValue)
		}
	}

	// Default status options if not specified in settings
	defaultOptions := []string{StatusNotStarted, StatusToDo, StatusInProgress, StatusDone, StatusCompleted}
	for _, option := range defaultOptions {
		if option == strValue {
			return nil
		}
	}

	return fmt.Errorf("invalid status option: %s", strValue)
}

// validatePriorityField validates priority field values
func (fv *FieldValidator) validatePriorityField(value interface{}, settings map[string]interface{}) error {
	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("priority field value must be a string")
	}

	if strValue == "" {
		return nil // Allow empty priority
	}

	// Get allowed options from settings
	if options, exists := settings["options"]; exists {
		if optionsList, ok := options.([]interface{}); ok {
			for _, option := range optionsList {
				if optionStr, ok := option.(string); ok && optionStr == strValue {
					return nil
				}
			}
			return fmt.Errorf("invalid priority option: %s", strValue)
		}
	}

	// Default priority options if not specified in settings
	defaultOptions := []string{PriorityLow, PriorityMedium, PriorityHigh, PriorityCritical}
	for _, option := range defaultOptions {
		if option == strValue {
			return nil
		}
	}

	return fmt.Errorf("invalid priority option: %s", strValue)
}

// validateDateField validates date field values
func (fv *FieldValidator) validateDateField(value interface{}, settings map[string]interface{}) error {
	switch v := value.(type) {
	case string:
		if v == "" {
			return nil // Allow empty date
		}
		// Try to parse as ISO 8601 date
		if _, err := time.Parse(time.RFC3339, v); err != nil {
			// Try to parse as date only
			if _, err := time.Parse("2006-01-02", v); err != nil {
				return fmt.Errorf("invalid date format, expected ISO 8601 or YYYY-MM-DD")
			}
		}
		return nil
	case time.Time:
		return nil // Valid time.Time
	case primitive.DateTime:
		return nil // Valid MongoDB DateTime
	default:
		return fmt.Errorf("date field value must be a string, time.Time, or primitive.DateTime")
	}
}

// validateTextField validates text field values
func (fv *FieldValidator) validateTextField(value interface{}, settings map[string]interface{}) error {
	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("text field value must be a string")
	}

	// Check maximum length if specified in settings
	if maxLength, exists := settings["maxLength"]; exists {
		if maxLengthInt, ok := maxLength.(int); ok {
			if len(strValue) > maxLengthInt {
				return fmt.Errorf("text field value exceeds maximum length of %d characters", maxLengthInt)
			}
		}
	} else {
		// Default maximum length for text fields
		if len(strValue) > 1000 {
			return fmt.Errorf("text field value exceeds maximum length of 1000 characters")
		}
	}

	// Check minimum length if specified in settings
	if minLength, exists := settings["minLength"]; exists {
		if minLengthInt, ok := minLength.(int); ok {
			if len(strings.TrimSpace(strValue)) < minLengthInt {
				return fmt.Errorf("text field value must be at least %d characters", minLengthInt)
			}
		}
	}

	return nil
}

// validatePersonField validates person field values
func (fv *FieldValidator) validatePersonField(value interface{}, settings map[string]interface{}) error {
	switch v := value.(type) {
	case string:
		if v == "" {
			return nil // Allow empty person field
		}
		// Validate as ObjectID string
		if _, err := primitive.ObjectIDFromHex(v); err != nil {
			return fmt.Errorf("person field value must be a valid ObjectID")
		}
		return nil
	case primitive.ObjectID:
		return nil // Valid ObjectID
	case []interface{}:
		// Multiple person assignment
		for i, person := range v {
			switch p := person.(type) {
			case string:
				if _, err := primitive.ObjectIDFromHex(p); err != nil {
					return fmt.Errorf("person field value at index %d must be a valid ObjectID", i)
				}
			case primitive.ObjectID:
				// Valid ObjectID
			default:
				return fmt.Errorf("person field value at index %d must be a string or ObjectID", i)
			}
		}
		return nil
	default:
		return fmt.Errorf("person field value must be a string, ObjectID, or array of ObjectIDs")
	}
}

// validateNumberField validates number field values
func (fv *FieldValidator) validateNumberField(value interface{}, settings map[string]interface{}) error {
	var numValue float64
	var err error

	switch v := value.(type) {
	case int:
		numValue = float64(v)
	case int32:
		numValue = float64(v)
	case int64:
		numValue = float64(v)
	case float32:
		numValue = float64(v)
	case float64:
		numValue = v
	case string:
		if v == "" {
			return nil // Allow empty number field
		}
		numValue, err = strconv.ParseFloat(v, 64)
		if err != nil {
			return fmt.Errorf("number field value must be a valid number")
		}
	default:
		return fmt.Errorf("number field value must be a number or numeric string")
	}

	// Check minimum value if specified in settings
	if minValue, exists := settings["minValue"]; exists {
		if minValueFloat, ok := minValue.(float64); ok {
			if numValue < minValueFloat {
				return fmt.Errorf("number field value must be at least %g", minValueFloat)
			}
		}
	}

	// Check maximum value if specified in settings
	if maxValue, exists := settings["maxValue"]; exists {
		if maxValueFloat, ok := maxValue.(float64); ok {
			if numValue > maxValueFloat {
				return fmt.Errorf("number field value must be at most %g", maxValueFloat)
			}
		}
	}

	return nil
}

// GetDefaultFieldSettings returns default settings for a field type
func (fv *FieldValidator) GetDefaultFieldSettings(fieldType string) map[string]interface{} {
	switch fieldType {
	case FieldTypeStatus:
		return map[string]interface{}{
			"options": []string{StatusNotStarted, StatusToDo, StatusInProgress, StatusDone, StatusCompleted},
		}
	case FieldTypePriority:
		return map[string]interface{}{
			"options": []string{PriorityLow, PriorityMedium, PriorityHigh, PriorityCritical},
		}
	case FieldTypeDate:
		return map[string]interface{}{
			"format": "YYYY-MM-DD",
		}
	case FieldTypeText:
		return map[string]interface{}{
			"maxLength": 1000,
			"minLength": 0,
		}
	case FieldTypePerson:
		return map[string]interface{}{
			"multiple": false,
		}
	case FieldTypeNumber:
		return map[string]interface{}{
			"decimals": 2,
		}
	default:
		return map[string]interface{}{}
	}
}

// IsValidFieldType checks if a field type is valid
func (fv *FieldValidator) IsValidFieldType(fieldType string) bool {
	validTypes := []string{
		FieldTypeStatus,
		FieldTypePriority,
		FieldTypeDate,
		FieldTypeText,
		FieldTypePerson,
		FieldTypeNumber,
	}

	for _, validType := range validTypes {
		if fieldType == validType {
			return true
		}
	}

	return false
}

// NormalizeFieldValue normalizes a field value based on its type
func (fv *FieldValidator) NormalizeFieldValue(fieldType string, value interface{}) (interface{}, error) {
	if value == nil {
		return nil, nil
	}

	switch fieldType {
	case FieldTypeStatus, FieldTypePriority:
		if strValue, ok := value.(string); ok {
			return strings.TrimSpace(strValue), nil
		}
		return value, nil

	case FieldTypeDate:
		switch v := value.(type) {
		case string:
			if v == "" {
				return nil, nil
			}
			// Try to parse and normalize to ISO 8601
			if t, err := time.Parse(time.RFC3339, v); err == nil {
				return t, nil
			}
			if t, err := time.Parse("2006-01-02", v); err == nil {
				return t, nil
			}
			return value, fmt.Errorf("invalid date format")
		case time.Time:
			return v, nil
		case primitive.DateTime:
			return v.Time(), nil
		default:
			return value, nil
		}

	case FieldTypeText:
		if strValue, ok := value.(string); ok {
			return strings.TrimSpace(strValue), nil
		}
		return value, nil

	case FieldTypePerson:
		switch v := value.(type) {
		case string:
			if v == "" {
				return nil, nil
			}
			if objID, err := primitive.ObjectIDFromHex(v); err == nil {
				return objID, nil
			}
			return value, fmt.Errorf("invalid ObjectID format")
		case primitive.ObjectID:
			return v, nil
		case []interface{}:
			var normalized []primitive.ObjectID
			for _, person := range v {
				switch p := person.(type) {
				case string:
					if objID, err := primitive.ObjectIDFromHex(p); err == nil {
						normalized = append(normalized, objID)
					} else {
						return value, fmt.Errorf("invalid ObjectID format in array")
					}
				case primitive.ObjectID:
					normalized = append(normalized, p)
				default:
					return value, fmt.Errorf("invalid person value in array")
				}
			}
			return normalized, nil
		default:
			return value, nil
		}

	case FieldTypeNumber:
		switch v := value.(type) {
		case string:
			if v == "" {
				return nil, nil
			}
			if numValue, err := strconv.ParseFloat(v, 64); err == nil {
				return numValue, nil
			}
			return value, fmt.Errorf("invalid number format")
		case int, int32, int64, float32, float64:
			return v, nil
		default:
			return value, nil
		}

	default:
		return value, nil
	}
}
