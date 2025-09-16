package services

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestFieldValidator_ValidateText(t *testing.T) {
	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid text",
			settings: nil,
			value:    "test text",
			required: false,
			wantErr:  false,
		},
		{
			name:     "empty text not required",
			settings: nil,
			value:    "",
			required: false,
			wantErr:  false,
		},
		{
			name:     "empty text required",
			settings: nil,
			value:    "",
			required: true,
			wantErr:  true,
			errMsg:   "field is required",
		},
		{
			name:     "non-string text",
			settings: nil,
			value:    123,
			required: false,
			wantErr:  true,
			errMsg:   "text field must be a string",
		},
		{
			name:     "text too long",
			settings: map[string]interface{}{"maxLength": 5.0},
			value:    "too long text",
			required: false,
			wantErr:  true,
			errMsg:   "text must be 5 characters or less",
		},
		{
			name:     "text too short",
			settings: map[string]interface{}{"minLength": 10.0},
			value:    "short",
			required: false,
			wantErr:  true,
			errMsg:   "text must be at least 10 characters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("text", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if err.Error() != tt.errMsg {
					t.Errorf("expected error %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_ValidateNumber(t *testing.T) {
	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid integer",
			settings: nil,
			value:    42,
			required: false,
			wantErr:  false,
		},
		{
			name:     "valid float",
			settings: nil,
			value:    42.5,
			required: false,
			wantErr:  false,
		},
		{
			name:     "string number",
			settings: nil,
			value:    "42.5",
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid string",
			settings: nil,
			value:    "not a number",
			required: false,
			wantErr:  true,
			errMsg:   "invalid number format",
		},
		{
			name:     "number below min",
			settings: map[string]interface{}{"min": 10.0},
			value:    5.0,
			required: false,
			wantErr:  true,
			errMsg:   "number must be at least 10.000000",
		},
		{
			name:     "number above max",
			settings: map[string]interface{}{"max": 100.0},
			value:    150.0,
			required: false,
			wantErr:  true,
			errMsg:   "number must be at most 100.000000",
		},
		{
			name:     "non-integer when required",
			settings: map[string]interface{}{"integer": true},
			value:    42.5,
			required: false,
			wantErr:  true,
			errMsg:   "number must be an integer",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("number", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_ValidateDate(t *testing.T) {
	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid date string",
			settings: nil,
			value:    "2023-12-25",
			required: false,
			wantErr:  false,
		},
		{
			name:     "valid datetime string",
			settings: nil,
			value:    "2023-12-25T15:30:00Z",
			required: false,
			wantErr:  false,
		},
		{
			name:     "valid time.Time",
			settings: nil,
			value:    time.Now(),
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid date format",
			settings: nil,
			value:    "invalid-date",
			required: false,
			wantErr:  true,
			errMsg:   "invalid date format",
		},
		{
			name:     "non-string non-time value",
			settings: nil,
			value:    123,
			required: false,
			wantErr:  true,
			errMsg:   "date field must be a string or time.Time",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("date", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_ValidateStatus(t *testing.T) {
	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid status",
			settings: map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			value:    "In Progress",
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid status",
			settings: map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			value:    "Invalid Status",
			required: false,
			wantErr:  true,
			errMsg:   "invalid status: Invalid Status",
		},
		{
			name:     "non-string value",
			settings: nil,
			value:    123,
			required: false,
			wantErr:  true,
			errMsg:   "status field must be a string",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("status", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_ValidatePerson(t *testing.T) {
	validObjectID := primitive.NewObjectID()
	validObjectIDStr := validObjectID.Hex()

	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid ObjectID string",
			settings: nil,
			value:    validObjectIDStr,
			required: false,
			wantErr:  false,
		},
		{
			name:     "valid ObjectID",
			settings: nil,
			value:    validObjectID,
			required: false,
			wantErr:  false,
		},
		{
			name:     "valid ObjectID array",
			settings: nil,
			value:    []interface{}{validObjectIDStr, validObjectID.Hex()},
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid ObjectID string",
			settings: nil,
			value:    "invalid-id",
			required: false,
			wantErr:  true,
			errMsg:   "invalid user ID format",
		},
		{
			name:     "non-string non-ObjectID",
			settings: nil,
			value:    123,
			required: false,
			wantErr:  true,
			errMsg:   "person field must be a user ID or array of user IDs",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("person", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_ValidateBoolean(t *testing.T) {
	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid boolean true",
			settings: nil,
			value:    true,
			required: false,
			wantErr:  false,
		},
		{
			name:     "valid boolean false",
			settings: nil,
			value:    false,
			required: false,
			wantErr:  false,
		},
		{
			name:     "string true",
			settings: nil,
			value:    "true",
			required: false,
			wantErr:  false,
		},
		{
			name:     "string 1",
			settings: nil,
			value:    "1",
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid string",
			settings: nil,
			value:    "invalid",
			required: false,
			wantErr:  true,
			errMsg:   "invalid boolean value: invalid",
		},
		{
			name:     "float 1",
			settings: nil,
			value:    1.0,
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid float",
			settings: nil,
			value:    2.5,
			required: false,
			wantErr:  true,
			errMsg:   "invalid boolean value: 2.500000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("boolean", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_ValidateEmail(t *testing.T) {
	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid email",
			settings: nil,
			value:    "test@example.com",
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid format no @",
			settings: nil,
			value:    "invalid-email",
			required: false,
			wantErr:  true,
			errMsg:   "invalid email format",
		},
		{
			name:     "invalid format no domain",
			settings: nil,
			value:    "test@",
			required: false,
			wantErr:  true,
			errMsg:   "invalid email format",
		},
		{
			name:     "non-string value",
			settings: nil,
			value:    123,
			required: false,
			wantErr:  true,
			errMsg:   "email field must be a string",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("email", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_ValidateURL(t *testing.T) {
	tests := []struct {
		name     string
		settings map[string]interface{}
		value    interface{}
		required bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid http URL",
			settings: nil,
			value:    "http://example.com",
			required: false,
			wantErr:  false,
		},
		{
			name:     "valid https URL",
			settings: nil,
			value:    "https://example.com",
			required: false,
			wantErr:  false,
		},
		{
			name:     "invalid URL format",
			settings: nil,
			value:    "not-a-url",
			required: false,
			wantErr:  true,
			errMsg:   "URL must start with http:// or https://",
		},
		{
			name:     "non-string value",
			settings: nil,
			value:    123,
			required: false,
			wantErr:  true,
			errMsg:   "URL field must be a string",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator("url", tt.settings, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestFieldValidator_UnsupportedType(t *testing.T) {
	fv := NewFieldValidator("unsupported", nil, false)
	err := fv.Validate("test")
	if err == nil {
		t.Errorf("expected error for unsupported type, got nil")
	}
	expected := "unsupported column type: unsupported"
	if err.Error() != expected {
		t.Errorf("expected error %q, got %q", expected, err.Error())
	}
}

func TestValidateFieldValues(t *testing.T) {
	columns := []BoardColumn{
		{
			ID:       "col1",
			Name:     "Title",
			Type:     "text",
			Settings: map[string]interface{}{"maxLength": 100.0, "required": true},
		},
		{
			ID:       "col2",
			Name:     "Priority",
			Type:     "status",
			Settings: map[string]interface{}{"options": []interface{}{"Low", "Medium", "High"}},
		},
		{
			ID:       "col3",
			Name:     "Due Date",
			Type:     "date",
			Settings: nil,
		},
	}

	tests := []struct {
		name       string
		fieldValues map[string]interface{}
		wantErr    bool
		errMsg     string
	}{
		{
			name: "valid fields",
			fieldValues: map[string]interface{}{
				"col1": "Test Title",
				"col2": "Medium",
				"col3": "2023-12-25",
			},
			wantErr: false,
		},
		{
			name: "missing required field",
			fieldValues: map[string]interface{}{
				"col2": "Medium",
				"col3": "2023-12-25",
			},
			wantErr: true,
			errMsg:  "field 'Title' validation failed: field is required",
		},
		{
			name: "invalid field type",
			fieldValues: map[string]interface{}{
				"col1": "Test",
				"col2": 123, // Invalid for status
				"col3": "2023-12-25",
			},
			wantErr: true,
			errMsg:  "invalid status",
		},
		{
			name: "non-existent column",
			fieldValues: map[string]interface{}{
				"nonexistent": "value",
			},
			wantErr: true,
			errMsg:  "column nonexistent not found in board",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateFieldValues(tt.fieldValues, columns, primitive.NewObjectID())
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestGetRequiredFields(t *testing.T) {
	columns := []BoardColumn{
		{
			ID:       "col1",
			Name:     "Title",
			Type:     "text",
			Settings: map[string]interface{}{"required": true},
		},
		{
			ID:       "col2",
			Name:     "Description",
			Type:     "text",
			Settings: map[string]interface{}{"required": false},
		},
		{
			ID:       "col3",
			Name:     "Priority",
			Type:     "status",
			Settings: nil,
		},
	}

	required := GetRequiredFields(columns)
	if len(required) != 1 {
		t.Errorf("expected 1 required field, got %d", len(required))
	}
	if required[0] != "col1" {
		t.Errorf("expected required field col1, got %s", required[0])
	}
}

func TestIsValidFieldType(t *testing.T) {
	tests := []struct {
		name     string
		fieldType string
		value    interface{}
		want     bool
	}{
		{"valid text", "text", "test", true},
		{"invalid text", "text", 123, false},
		{"valid number", "number", 42, true},
		{"invalid number", "number", "abc", false},
		{"valid date", "date", "2023-12-25", true},
		{"valid boolean", "boolean", true, true},
		{"valid email", "email", "test@example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValidFieldType(tt.fieldType, tt.value)
			if got != tt.want {
				t.Errorf("IsValidFieldType(%q, %v) = %v, want %v", tt.fieldType, tt.value, got, tt.want)
			}
		})
	}
}

// Helper function to check if error message contains substring
func containsSubstring(message, substring string) bool {
	return len(substring) > 0 && len(message) >= len(substring) && 
		(message == substring || message[len(message)-len(substring):] == substring || 
		 message[:len(substring)] == substring || 
		 (len(message) > len(substring) && message[len(substring):len(message)-len(substring)+1] == substring))
}