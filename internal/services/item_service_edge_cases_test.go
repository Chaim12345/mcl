package services

import (
	"testing"
	"time"
)

func TestFieldValidator_EdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		fieldType string
		settings map[string]interface{}
		value    interface{}
		wantErr  bool
	}{
		// Text edge cases
		{"text with unicode", "text", map[string]interface{}{"maxLength": 50.0}, "测试文本 🚀", false},
		{"text with special characters", "text", map[string]interface{}{"maxLength": 100.0}, "test@#$%^&*()", false},
		{"text with newlines", "text", map[string]interface{}{"maxLength": 100.0}, "line1\nline2\rline3", false},
		{"empty object text", "text", nil, map[string]interface{}{}, true},
		{"nil text", "text", nil, nil, false},
		
		// Number edge cases
		{"zero number", "number", nil, 0, false},
		{"negative number", "number", map[string]interface{}{"min": -100.0}, -50, false},
		{"scientific notation", "number", nil, 1.23e4, false},
		{"float as string", "number", nil, "123.45", false},
		{"very large number", "number", map[string]interface{}{"max": 1e10}, 1e9, false},
		{"overflow number", "number", map[string]interface{}{"max": 100.0}, 1e20, true},
		
		// Date edge cases
		{"date with timezone", "date", nil, "2023-12-25T15:30:00+05:30", false},
		{"date with milliseconds", "date", nil, "2023-12-25T15:30:00.123Z", false},
		{"leap year date", "date", nil, "2024-02-29", false},
		{"invalid leap year", "date", nil, "2023-02-29", true},
		{"date with spaces", "date", nil, " 2023-12-25 ", true},
		
		// Status edge cases
		{"status case sensitivity", "status", map[string]interface{}{"options": []interface{}{"low", "medium", "high"}}, "LOW", true},
		{"status with spaces", "status", map[string]interface{}{"options": []interface{}{"to do", "in progress"}}, " to do", true},
		{"status empty string", "status", nil, "", false},
		
		// Person edge cases
		{"person array with mixed types", "person", nil, []interface{}{"507f1f77bcf86cd799439011", primitive.NewObjectID()}, false},
		{"person empty array", "person", nil, []interface{}{}, false},
		{"person invalid hex", "person", nil, "invalid-hex-string", true},
		{"person short hex", "person", nil, "123", true},
		{"person long hex", "person", nil, "507f1f77bcf86cd799439011507f1f77bcf86cd799439011", true},
		
		// Boolean edge cases
		{"boolean from string variations", "boolean", nil, "TRUE", false},
		{"boolean from string yes", "boolean", nil, "yes", false},
		{"boolean from string no", "boolean", nil, "NO", false},
		{"boolean from float variations", "boolean", nil, 0.0, false},
		{"boolean from float one", "boolean", nil, 1.0, false},
		{"boolean from float two", "boolean", nil, 2.0, true},
		{"boolean from int variations", "boolean", nil, int(0), false},
		{"boolean from int one", "boolean", nil, int(1), false},
		
		// Email edge cases
		{"email with subdomain", "email", nil, "test@sub.example.com", false},
		{"email with numbers", "email", nil, "test123@example456.com", false},
		{"email with plus", "email", nil, "test+tag@example.com", false},
		{"email without tld", "email", nil, "test@example", true},
		{"email with special chars", "email", nil, "test.user@example.com", false},
		{"email too long", "email", nil, createLongEmail(255), true},
		
		// URL edge cases
		{"url with port", "url", nil, "http://localhost:3000", false},
		{"url with path", "url", nil, "https://example.com/path/to/resource", false},
		{"url with query params", "url", nil, "https://example.com?param=value&other=123", false},
		{"url without protocol", "url", nil, "example.com", true},
		{"url with ftp protocol", "url", nil, "ftp://example.com", true},
		{"url with spaces", "url", nil, "http://example.com/path with spaces", false},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator(tt.fieldType, tt.settings, false)
			err := fv.Validate(tt.value)
			if tt.wantErr && err == nil {
				t.Errorf("expected error for %s, got nil", tt.name)
			}
			if !tt.wantErr && err != nil {
				t.Errorf("unexpected error for %s: %v", tt.name, err)
			}
		})
	}
}

func TestFieldValidator_Performance(t *testing.T) {
	// Test performance with large text
	largeText := ""
	for i := 0; i < 10000; i++ {
		largeText += "a"
	}
	
	fv := NewFieldValidator("text", map[string]interface{}{"maxLength": 10000.0}, false)
	start := time.Now()
	err := fv.Validate(largeText)
	duration := time.Since(start)
	
	if err != nil {
		t.Errorf("unexpected error with large text: %v", err)
	}
	
	// Should complete within reasonable time (1ms)
	if duration > time.Millisecond*10 {
		t.Errorf("validation took too long: %v", duration)
	}
}

func TestFieldValidator_Concurrent(t *testing.T) {
	// Test concurrent validation
	const numGoroutines = 100
	ch := make(chan error, numGoroutines)
	
	fv := NewFieldValidator("text", map[string]interface{}{"maxLength": 100.0}, false)
	
	for i := 0; i < numGoroutines; i++ {
		go func() {
			err := fv.Validate("concurrent test")
			ch <- err
		}()
	}
	
	for i := 0; i < numGoroutines; i++ {
		err := <-ch
		if err != nil {
			t.Errorf("concurrent validation error: %v", err)
		}
	}
}

func TestFieldValidator_NilHandling(t *testing.T) {
	tests := []struct {
		name     string
		fieldType string
		value    interface{}
		required bool
		wantErr  bool
	}{
		{"nil text not required", "text", nil, false, false},
		{"nil text required", "text", nil, true, true},
		{"empty string text required", "text", "", true, true},
		{"nil number not required", "number", nil, false, false},
		{"nil number required", "number", nil, true, true},
		{"nil date not required", "date", nil, false, false},
		{"nil date required", "date", nil, true, true},
		{"nil status not required", "status", nil, false, false},
		{"nil status required", "status", nil, true, true},
		{"nil person not required", "person", nil, false, false},
		{"nil person required", "person", nil, true, true},
		{"nil boolean not required", "boolean", nil, false, false},
		{"nil boolean required", "boolean", nil, true, true},
		{"nil email not required", "email", nil, false, false},
		{"nil email required", "email", nil, true, true},
		{"nil url not required", "url", nil, false, false},
		{"nil url required", "url", nil, true, true},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fv := NewFieldValidator(tt.fieldType, nil, tt.required)
			err := fv.Validate(tt.value)
			if tt.wantErr && err == nil {
				t.Errorf("expected error for required nil %s, got nil", tt.fieldType)
			}
			if !tt.wantErr && err != nil {
				t.Errorf("unexpected error for non-required nil %s: %v", tt.fieldType, err)
			}
		})
	}
}

// Helper function to create long email for testing
func createLongEmail(length int) string {
	localPart := ""
	for i := 0; i < length-15; i++ {
		localPart += "a"
	}
	return localPart + "@example.com"
}