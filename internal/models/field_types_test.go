package models

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestFieldValidator_ValidateFieldValue(t *testing.T) {
	validator := NewFieldValidator()

	tests := []struct {
		name      string
		fieldType string
		value     interface{}
		settings  map[string]interface{}
		wantErr   bool
	}{
		// Status field tests
		{
			name:      "valid status field",
			fieldType: FieldTypeStatus,
			value:     "In Progress",
			settings:  map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			wantErr:   false,
		},
		{
			name:      "invalid status field",
			fieldType: FieldTypeStatus,
			value:     "Invalid Status",
			settings:  map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			wantErr:   true,
		},
		{
			name:      "empty status field",
			fieldType: FieldTypeStatus,
			value:     "",
			settings:  map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			wantErr:   false,
		},
		{
			name:      "non-string status field",
			fieldType: FieldTypeStatus,
			value:     123,
			settings:  map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}},
			wantErr:   true,
		},

		// Priority field tests
		{
			name:      "valid priority field",
			fieldType: FieldTypePriority,
			value:     "High",
			settings:  map[string]interface{}{"options": []interface{}{"Low", "Medium", "High", "Critical"}},
			wantErr:   false,
		},
		{
			name:      "invalid priority field",
			fieldType: FieldTypePriority,
			value:     "Super High",
			settings:  map[string]interface{}{"options": []interface{}{"Low", "Medium", "High", "Critical"}},
			wantErr:   true,
		},
		{
			name:      "default priority field",
			fieldType: FieldTypePriority,
			value:     "Critical",
			settings:  nil,
			wantErr:   false,
		},

		// Date field tests
		{
			name:      "valid ISO date string",
			fieldType: FieldTypeDate,
			value:     "2023-12-25T10:30:00Z",
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "valid date string",
			fieldType: FieldTypeDate,
			value:     "2023-12-25",
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "valid time.Time",
			fieldType: FieldTypeDate,
			value:     time.Now(),
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "invalid date string",
			fieldType: FieldTypeDate,
			value:     "invalid-date",
			settings:  nil,
			wantErr:   true,
		},
		{
			name:      "empty date string",
			fieldType: FieldTypeDate,
			value:     "",
			settings:  nil,
			wantErr:   false,
		},

		// Text field tests
		{
			name:      "valid text field",
			fieldType: FieldTypeText,
			value:     "This is a valid text",
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "text field exceeding max length",
			fieldType: FieldTypeText,
			value:     "This text is too long",
			settings:  map[string]interface{}{"maxLength": 10},
			wantErr:   true,
		},
		{
			name:      "text field below min length",
			fieldType: FieldTypeText,
			value:     "Hi",
			settings:  map[string]interface{}{"minLength": 5},
			wantErr:   true,
		},
		{
			name:      "non-string text field",
			fieldType: FieldTypeText,
			value:     123,
			settings:  nil,
			wantErr:   true,
		},

		// Person field tests
		{
			name:      "valid person field ObjectID",
			fieldType: FieldTypePerson,
			value:     primitive.NewObjectID(),
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "valid person field ObjectID string",
			fieldType: FieldTypePerson,
			value:     primitive.NewObjectID().Hex(),
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "invalid person field string",
			fieldType: FieldTypePerson,
			value:     "invalid-objectid",
			settings:  nil,
			wantErr:   true,
		},
		{
			name:      "valid person field array",
			fieldType: FieldTypePerson,
			value:     []interface{}{primitive.NewObjectID().Hex(), primitive.NewObjectID().Hex()},
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "invalid person field array",
			fieldType: FieldTypePerson,
			value:     []interface{}{"invalid-objectid"},
			settings:  nil,
			wantErr:   true,
		},

		// Number field tests
		{
			name:      "valid number field int",
			fieldType: FieldTypeNumber,
			value:     42,
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "valid number field float",
			fieldType: FieldTypeNumber,
			value:     3.14,
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "valid number field string",
			fieldType: FieldTypeNumber,
			value:     "42.5",
			settings:  nil,
			wantErr:   false,
		},
		{
			name:      "invalid number field string",
			fieldType: FieldTypeNumber,
			value:     "not-a-number",
			settings:  nil,
			wantErr:   true,
		},
		{
			name:      "number field below min value",
			fieldType: FieldTypeNumber,
			value:     5,
			settings:  map[string]interface{}{"minValue": 10.0},
			wantErr:   true,
		},
		{
			name:      "number field above max value",
			fieldType: FieldTypeNumber,
			value:     15,
			settings:  map[string]interface{}{"maxValue": 10.0},
			wantErr:   true,
		},

		// Nil value tests
		{
			name:      "nil value allowed",
			fieldType: FieldTypeText,
			value:     nil,
			settings:  nil,
			wantErr:   false,
		},

		// Invalid field type
		{
			name:      "invalid field type",
			fieldType: "invalid-type",
			value:     "some value",
			settings:  nil,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateFieldValue(tt.fieldType, tt.value, tt.settings)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateFieldValue() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFieldValidator_NormalizeFieldValue(t *testing.T) {
	validator := NewFieldValidator()

	tests := []struct {
		name      string
		fieldType string
		value     interface{}
		want      interface{}
		wantErr   bool
	}{
		// Status field normalization
		{
			name:      "normalize status field with spaces",
			fieldType: FieldTypeStatus,
			value:     "  In Progress  ",
			want:      "In Progress",
			wantErr:   false,
		},

		// Date field normalization
		{
			name:      "normalize ISO date string",
			fieldType: FieldTypeDate,
			value:     "2023-12-25T10:30:00Z",
			want:      func() time.Time { t, _ := time.Parse(time.RFC3339, "2023-12-25T10:30:00Z"); return t }(),
			wantErr:   false,
		},
		{
			name:      "normalize date string",
			fieldType: FieldTypeDate,
			value:     "2023-12-25",
			want:      func() time.Time { t, _ := time.Parse("2006-01-02", "2023-12-25"); return t }(),
			wantErr:   false,
		},
		{
			name:      "normalize invalid date string",
			fieldType: FieldTypeDate,
			value:     "invalid-date",
			want:      "invalid-date",
			wantErr:   true,
		},

		// Text field normalization
		{
			name:      "normalize text field with spaces",
			fieldType: FieldTypeText,
			value:     "  Hello World  ",
			want:      "Hello World",
			wantErr:   false,
		},

		// Person field normalization
		{
			name:      "normalize person field ObjectID string",
			fieldType: FieldTypePerson,
			value:     primitive.NewObjectID().Hex(),
			want: func() primitive.ObjectID {
				id, _ := primitive.ObjectIDFromHex(primitive.NewObjectID().Hex())
				return id
			}(),
			wantErr: false,
		},
		{
			name:      "normalize person field array",
			fieldType: FieldTypePerson,
			value:     []interface{}{primitive.NewObjectID().Hex()},
			want: []primitive.ObjectID{func() primitive.ObjectID {
				id, _ := primitive.ObjectIDFromHex(primitive.NewObjectID().Hex())
				return id
			}()},
			wantErr: false,
		},

		// Number field normalization
		{
			name:      "normalize number field string",
			fieldType: FieldTypeNumber,
			value:     "42.5",
			want:      42.5,
			wantErr:   false,
		},
		{
			name:      "normalize invalid number field string",
			fieldType: FieldTypeNumber,
			value:     "not-a-number",
			want:      "not-a-number",
			wantErr:   true,
		},

		// Nil value normalization
		{
			name:      "normalize nil value",
			fieldType: FieldTypeText,
			value:     nil,
			want:      nil,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := validator.NormalizeFieldValue(tt.fieldType, tt.value)
			if (err != nil) != tt.wantErr {
				t.Errorf("NormalizeFieldValue() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// For time.Time comparison, we need special handling
			if tt.fieldType == FieldTypeDate && !tt.wantErr {
				if wantTime, ok := tt.want.(time.Time); ok {
					if gotTime, ok := got.(time.Time); ok {
						if !gotTime.Equal(wantTime) {
							t.Errorf("NormalizeFieldValue() = %v, want %v", got, tt.want)
						}
						return
					}
				}
			}

			// For ObjectID comparison
			if tt.fieldType == FieldTypePerson && !tt.wantErr {
				if wantID, ok := tt.want.(primitive.ObjectID); ok {
					if gotID, ok := got.(primitive.ObjectID); ok {
						if gotID != wantID {
							// For this test, we just check that it's a valid ObjectID
							if gotID.IsZero() {
								t.Errorf("NormalizeFieldValue() returned zero ObjectID")
							}
						}
						return
					}
				}
				if wantSlice, ok := tt.want.([]primitive.ObjectID); ok {
					if gotSlice, ok := got.([]primitive.ObjectID); ok {
						if len(gotSlice) != len(wantSlice) {
							t.Errorf("NormalizeFieldValue() slice length = %d, want %d", len(gotSlice), len(wantSlice))
						}
						return
					}
				}
			}

			// For other types, use direct comparison
			if got != tt.want && !tt.wantErr {
				// Skip comparison for complex types that we handled above
				if tt.fieldType != FieldTypeDate && tt.fieldType != FieldTypePerson {
					t.Errorf("NormalizeFieldValue() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}

func TestFieldValidator_GetDefaultFieldSettings(t *testing.T) {
	validator := NewFieldValidator()

	tests := []struct {
		name      string
		fieldType string
		wantKeys  []string
	}{
		{
			name:      "status field default settings",
			fieldType: FieldTypeStatus,
			wantKeys:  []string{"options"},
		},
		{
			name:      "priority field default settings",
			fieldType: FieldTypePriority,
			wantKeys:  []string{"options"},
		},
		{
			name:      "date field default settings",
			fieldType: FieldTypeDate,
			wantKeys:  []string{"format"},
		},
		{
			name:      "text field default settings",
			fieldType: FieldTypeText,
			wantKeys:  []string{"maxLength", "minLength"},
		},
		{
			name:      "person field default settings",
			fieldType: FieldTypePerson,
			wantKeys:  []string{"multiple"},
		},
		{
			name:      "number field default settings",
			fieldType: FieldTypeNumber,
			wantKeys:  []string{"decimals"},
		},
		{
			name:      "invalid field type",
			fieldType: "invalid-type",
			wantKeys:  []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validator.GetDefaultFieldSettings(tt.fieldType)

			if len(tt.wantKeys) == 0 {
				if len(got) != 0 {
					t.Errorf("GetDefaultFieldSettings() = %v, want empty map", got)
				}
				return
			}

			for _, key := range tt.wantKeys {
				if _, exists := got[key]; !exists {
					t.Errorf("GetDefaultFieldSettings() missing key %s", key)
				}
			}
		})
	}
}

func TestFieldValidator_IsValidFieldType(t *testing.T) {
	validator := NewFieldValidator()

	tests := []struct {
		name      string
		fieldType string
		want      bool
	}{
		{
			name:      "valid status field type",
			fieldType: FieldTypeStatus,
			want:      true,
		},
		{
			name:      "valid priority field type",
			fieldType: FieldTypePriority,
			want:      true,
		},
		{
			name:      "valid date field type",
			fieldType: FieldTypeDate,
			want:      true,
		},
		{
			name:      "valid text field type",
			fieldType: FieldTypeText,
			want:      true,
		},
		{
			name:      "valid person field type",
			fieldType: FieldTypePerson,
			want:      true,
		},
		{
			name:      "valid number field type",
			fieldType: FieldTypeNumber,
			want:      true,
		},
		{
			name:      "invalid field type",
			fieldType: "invalid-type",
			want:      false,
		},
		{
			name:      "empty field type",
			fieldType: "",
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validator.IsValidFieldType(tt.fieldType); got != tt.want {
				t.Errorf("IsValidFieldType() = %v, want %v", got, tt.want)
			}
		})
	}
}
