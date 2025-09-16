package models

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TestItemPositionManagement tests the item position management functionality
func TestItemPositionManagement(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	// Create test items
	item1 := NewItem("Item 1", boardID, userID)
	item2 := NewItem("Item 2", boardID, userID)
	item3 := NewItem("Item 3", boardID, userID)

	// Test initial positions
	if item1.Position != 0 {
		t.Errorf("Expected initial position 0, got %d", item1.Position)
	}

	// Test position updates
	err := item1.UpdatePosition(1000)
	if err != nil {
		t.Errorf("Failed to update position: %v", err)
	}
	if item1.Position != 1000 {
		t.Errorf("Expected position 1000, got %d", item1.Position)
	}

	err = item2.UpdatePosition(2000)
	if err != nil {
		t.Errorf("Failed to update position: %v", err)
	}

	err = item3.UpdatePosition(3000)
	if err != nil {
		t.Errorf("Failed to update position: %v", err)
	}

	// Test invalid position
	err = item1.UpdatePosition(-1)
	if err == nil {
		t.Error("Expected error for negative position")
	}

	// Test field value management for status columns
	statusColumnID := "col_status"

	// Set status field values
	err = item1.SetFieldValue(statusColumnID, "To Do", userID)
	if err != nil {
		t.Errorf("Failed to set field value: %v", err)
	}

	err = item2.SetFieldValue(statusColumnID, "In Progress", userID)
	if err != nil {
		t.Errorf("Failed to set field value: %v", err)
	}

	err = item3.SetFieldValue(statusColumnID, "Done", userID)
	if err != nil {
		t.Errorf("Failed to set field value: %v", err)
	}

	// Verify field values
	value1, exists1 := item1.GetFieldValue(statusColumnID)
	if !exists1 || value1 != "To Do" {
		t.Errorf("Expected 'To Do', got %v", value1)
	}

	value2, exists2 := item2.GetFieldValue(statusColumnID)
	if !exists2 || value2 != "In Progress" {
		t.Errorf("Expected 'In Progress', got %v", value2)
	}

	value3, exists3 := item3.GetFieldValue(statusColumnID)
	if !exists3 || value3 != "Done" {
		t.Errorf("Expected 'Done', got %v", value3)
	}

	// Test moving item between columns (changing status)
	err = item1.SetFieldValue(statusColumnID, "In Progress", userID)
	if err != nil {
		t.Errorf("Failed to update field value: %v", err)
	}

	updatedValue, exists := item1.GetFieldValue(statusColumnID)
	if !exists || updatedValue != "In Progress" {
		t.Errorf("Expected 'In Progress' after update, got %v", updatedValue)
	}

	// Test removing field value
	err = item1.RemoveFieldValue(statusColumnID)
	if err != nil {
		t.Errorf("Failed to remove field value: %v", err)
	}

	_, exists = item1.GetFieldValue(statusColumnID)
	if exists {
		t.Error("Field value should have been removed")
	}
}

// TestItemMovementScenarios tests realistic item movement scenarios
func TestItemMovementScenarios(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	// Create a board with columns
	board := NewBoard("Test Board", "Test Description", primitive.NewObjectID(), userID)

	// Verify default columns exist
	if len(board.Columns) < 3 {
		t.Errorf("Expected at least 3 default columns, got %d", len(board.Columns))
	}

	statusColumnID := board.Columns[0].ID
	progressColumnID := board.Columns[1].ID
	doneColumnID := board.Columns[2].ID

	// Create items in different columns
	todoItem := NewItem("Todo Task", boardID, userID)
	progressItem := NewItem("In Progress Task", boardID, userID)
	doneItem := NewItem("Completed Task", boardID, userID)

	// Set initial positions and statuses
	todoItem.UpdatePosition(1000)
	todoItem.SetFieldValue(statusColumnID, "To Do", userID)

	progressItem.UpdatePosition(1000)
	progressItem.SetFieldValue(progressColumnID, "In Progress", userID)

	doneItem.UpdatePosition(1000)
	doneItem.SetFieldValue(doneColumnID, "Done", userID)

	// Simulate moving todoItem to progress column
	// 1. Update position to be between existing items
	todoItem.UpdatePosition(500) // Move to beginning of progress column

	// 2. Update status to match new column
	todoItem.SetFieldValue(progressColumnID, "In Progress", userID)

	// 3. Remove old status
	todoItem.RemoveFieldValue(statusColumnID)

	// Verify the move
	newStatus, exists := todoItem.GetFieldValue(progressColumnID)
	if !exists || newStatus != "In Progress" {
		t.Errorf("Expected 'In Progress' after move, got %v", newStatus)
	}

	if todoItem.Position != 500 {
		t.Errorf("Expected position 500 after move, got %d", todoItem.Position)
	}

	// Verify old status was removed
	_, exists = todoItem.GetFieldValue(statusColumnID)
	if exists {
		t.Error("Old status should have been removed")
	}

	// Test reordering within same column
	// Add another item to progress column
	anotherProgressItem := NewItem("Another Progress Task", boardID, userID)
	anotherProgressItem.UpdatePosition(750) // Between todoItem (500) and progressItem (1000)
	anotherProgressItem.SetFieldValue(progressColumnID, "In Progress", userID)

	// Verify positions are in correct order
	if todoItem.Position >= anotherProgressItem.Position {
		t.Error("todoItem should come before anotherProgressItem")
	}
	if anotherProgressItem.Position >= progressItem.Position {
		t.Error("anotherProgressItem should come before progressItem")
	}
}

// TestPositionCalculations tests position calculation utilities
func TestPositionCalculations(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	// Create items with various positions
	items := []*Item{
		{
			ID:        primitive.NewObjectID(),
			Name:      "Item 1",
			BoardID:   boardID,
			Position:  1000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        primitive.NewObjectID(),
			Name:      "Item 2",
			BoardID:   boardID,
			Position:  2000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        primitive.NewObjectID(),
			Name:      "Item 3",
			BoardID:   boardID,
			Position:  3000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
	}

	// Test finding position between two items
	// Position between item 1 (1000) and item 2 (2000) should be 1500
	betweenPos := (items[0].Position + items[1].Position) / 2
	if betweenPos != 1500 {
		t.Errorf("Expected position 1500 between items, got %d", betweenPos)
	}

	// Test position before first item
	beforeFirstPos := items[0].Position / 2
	if beforeFirstPos != 500 {
		t.Errorf("Expected position 500 before first item, got %d", beforeFirstPos)
	}

	// Test position after last item
	afterLastPos := items[2].Position + 1000
	if afterLastPos != 4000 {
		t.Errorf("Expected position 4000 after last item, got %d", afterLastPos)
	}

	// Test compact positioning (rebalancing)
	// Simulate items with irregular positions
	items[0].Position = 150
	items[1].Position = 151
	items[2].Position = 152

	// Rebalance positions
	for i, item := range items {
		newPosition := (i + 1) * 1000
		item.UpdatePosition(newPosition)
	}

	// Verify clean positions
	if items[0].Position != 1000 {
		t.Errorf("Expected position 1000 after rebalancing, got %d", items[0].Position)
	}
	if items[1].Position != 2000 {
		t.Errorf("Expected position 2000 after rebalancing, got %d", items[1].Position)
	}
	if items[2].Position != 3000 {
		t.Errorf("Expected position 3000 after rebalancing, got %d", items[2].Position)
	}
}
