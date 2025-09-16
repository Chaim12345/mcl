package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DemonstrateFieldManagement shows how the field management system works
func DemonstrateFieldManagement() {
	fmt.Println("=== Field Management System Demo ===")

	// Create a workspace and user
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	// Create a board with default columns
	board := NewBoard("Project Management Board", "A board for managing project tasks", workspaceID, userID)
	fmt.Printf("Created board '%s' with %d default columns\n", board.Name, len(board.Columns))

	// Display default columns
	fmt.Println("\nDefault columns:")
	for i, column := range board.Columns {
		fmt.Printf("  %d. %s (%s)\n", i+1, column.Name, column.Type)
	}

	// Add custom fields
	fmt.Println("\nAdding custom fields...")

	// Add a priority field
	err := board.AddColumn("Priority", FieldTypePriority, map[string]interface{}{
		"options": []string{"Low", "Medium", "High", "Critical"},
	})
	if err != nil {
		fmt.Printf("Error adding priority field: %v\n", err)
		return
	}
	fmt.Println("✓ Added Priority field")

	// Add a due date field
	err = board.AddColumn("Due Date", FieldTypeDate, map[string]interface{}{
		"format": "YYYY-MM-DD",
	})
	if err != nil {
		fmt.Printf("Error adding date field: %v\n", err)
		return
	}
	fmt.Println("✓ Added Due Date field")

	// Add an assignee field
	err = board.AddColumn("Assignee", FieldTypePerson, map[string]interface{}{
		"multiple": false,
	})
	if err != nil {
		fmt.Printf("Error adding person field: %v\n", err)
		return
	}
	fmt.Println("✓ Added Assignee field")

	// Add an effort field
	err = board.AddColumn("Effort (hours)", FieldTypeNumber, map[string]interface{}{
		"decimals": 1,
		"minValue": 0.0,
		"maxValue": 100.0,
	})
	if err != nil {
		fmt.Printf("Error adding number field: %v\n", err)
		return
	}
	fmt.Println("✓ Added Effort field")

	// Display all columns
	fmt.Printf("\nBoard now has %d columns:\n", len(board.Columns))
	for i, column := range board.Columns {
		fmt.Printf("  %d. %s (%s)\n", i+1, column.Name, column.Type)
	}

	// Create some items and set field values
	fmt.Println("\nCreating items and setting field values...")

	// Create first item
	item1 := NewItem("Implement user authentication", board.ID, userID)

	// Set field values for item1
	validator := NewFieldValidator()

	// Set status
	statusColumnID := board.Columns[0].ID
	err = item1.SetFieldValue(statusColumnID, "In Progress", userID)
	if err != nil {
		fmt.Printf("Error setting status: %v\n", err)
		return
	}

	// Set priority
	priorityColumnID := board.Columns[3].ID
	err = item1.SetFieldValue(priorityColumnID, "High", userID)
	if err != nil {
		fmt.Printf("Error setting priority: %v\n", err)
		return
	}

	// Set due date
	dueDateColumnID := board.Columns[4].ID
	err = item1.SetFieldValue(dueDateColumnID, "2024-01-15", userID)
	if err != nil {
		fmt.Printf("Error setting due date: %v\n", err)
		return
	}

	// Set assignee
	assigneeColumnID := board.Columns[5].ID
	err = item1.SetFieldValue(assigneeColumnID, userID, userID)
	if err != nil {
		fmt.Printf("Error setting assignee: %v\n", err)
		return
	}

	// Set effort
	effortColumnID := board.Columns[6].ID
	err = item1.SetFieldValue(effortColumnID, 8.5, userID)
	if err != nil {
		fmt.Printf("Error setting effort: %v\n", err)
		return
	}

	fmt.Printf("✓ Created item: %s\n", item1.Name)

	// Create second item
	item2 := NewItem("Design user interface", board.ID, userID)

	// Set different field values for item2
	err = item2.SetFieldValue(statusColumnID, "To Do", userID)
	if err != nil {
		fmt.Printf("Error setting status: %v\n", err)
		return
	}

	err = item2.SetFieldValue(priorityColumnID, "Medium", userID)
	if err != nil {
		fmt.Printf("Error setting priority: %v\n", err)
		return
	}

	err = item2.SetFieldValue(dueDateColumnID, "2024-01-20", userID)
	if err != nil {
		fmt.Printf("Error setting due date: %v\n", err)
		return
	}

	err = item2.SetFieldValue(effortColumnID, 12.0, userID)
	if err != nil {
		fmt.Printf("Error setting effort: %v\n", err)
		return
	}

	fmt.Printf("✓ Created item: %s\n", item2.Name)

	// Display item field values
	fmt.Println("\nItem field values:")

	items := []*Item{item1, item2}
	for i, item := range items {
		fmt.Printf("\n%d. %s:\n", i+1, item.Name)
		for _, column := range board.Columns {
			if value, exists := item.GetFieldValue(column.ID); exists {
				fmt.Printf("   %s: %v\n", column.Name, value)
			} else {
				fmt.Printf("   %s: (not set)\n", column.Name)
			}
		}
	}

	// Demonstrate field validation
	fmt.Println("\nDemonstrating field validation...")

	// Valid values
	fmt.Println("Testing valid values:")
	testCases := []struct {
		fieldType string
		value     interface{}
		settings  map[string]interface{}
	}{
		{FieldTypeStatus, "Done", map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}}},
		{FieldTypePriority, "Critical", nil},
		{FieldTypeDate, time.Now(), nil},
		{FieldTypeText, "This is a valid description", nil},
		{FieldTypeNumber, 42.5, nil},
	}

	for _, tc := range testCases {
		err := validator.ValidateFieldValue(tc.fieldType, tc.value, tc.settings)
		if err != nil {
			fmt.Printf("  ✗ %s validation failed: %v\n", tc.fieldType, err)
		} else {
			fmt.Printf("  ✓ %s validation passed\n", tc.fieldType)
		}
	}

	// Invalid values
	fmt.Println("\nTesting invalid values:")
	invalidTestCases := []struct {
		fieldType string
		value     interface{}
		settings  map[string]interface{}
	}{
		{FieldTypeStatus, "Invalid Status", map[string]interface{}{"options": []interface{}{"To Do", "In Progress", "Done"}}},
		{FieldTypePriority, "Super High", nil},
		{FieldTypeDate, "not-a-date", nil},
		{FieldTypeNumber, "not-a-number", nil},
	}

	for _, tc := range invalidTestCases {
		err := validator.ValidateFieldValue(tc.fieldType, tc.value, tc.settings)
		if err != nil {
			fmt.Printf("  ✓ %s validation correctly failed: %v\n", tc.fieldType, err)
		} else {
			fmt.Printf("  ✗ %s validation should have failed but passed\n", tc.fieldType)
		}
	}

	// Demonstrate field normalization
	fmt.Println("\nDemonstrating field normalization...")

	normalizeTests := []struct {
		fieldType string
		value     interface{}
	}{
		{FieldTypeText, "  Trimmed text  "},
		{FieldTypeDate, "2024-01-15"},
		{FieldTypeNumber, "42.5"},
		{FieldTypePerson, userID.Hex()},
	}

	for _, tc := range normalizeTests {
		normalized, err := validator.NormalizeFieldValue(tc.fieldType, tc.value)
		if err != nil {
			fmt.Printf("  ✗ %s normalization failed: %v\n", tc.fieldType, err)
		} else {
			fmt.Printf("  ✓ %s: %v → %v\n", tc.fieldType, tc.value, normalized)
		}
	}

	// Demonstrate field removal
	fmt.Println("\nDemonstrating field removal...")

	// Remove priority field from item1
	err = item1.RemoveFieldValue(priorityColumnID)
	if err != nil {
		fmt.Printf("Error removing priority field: %v\n", err)
	} else {
		fmt.Println("✓ Removed priority field from item1")
	}

	// Remove entire column from board
	err = board.RemoveColumn(effortColumnID)
	if err != nil {
		fmt.Printf("Error removing effort column: %v\n", err)
	} else {
		fmt.Println("✓ Removed effort column from board")
		fmt.Printf("Board now has %d columns\n", len(board.Columns))
	}

	fmt.Println("\n=== Demo Complete ===")
}
