package models

import (
	"fmt"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DemonstrateItemMovement shows how the item movement and positioning system works
func DemonstrateItemMovement() {
	fmt.Println("=== Item Movement and Positioning Demo ===")

	// Create a workspace and user
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	// Create a board with default columns
	board := NewBoard("Kanban Board", "A board for task management", workspaceID, userID)
	fmt.Printf("Created board '%s' with %d columns\n", board.Name, len(board.Columns))

	// Display columns
	fmt.Println("\nBoard columns:")
	for i, column := range board.Columns {
		fmt.Printf("  %d. %s (%s) - ID: %s\n", i+1, column.Name, column.Type, column.ID)
	}

	// Get column IDs for easier reference
	todoColumnID := board.Columns[0].ID
	progressColumnID := board.Columns[1].ID
	doneColumnID := board.Columns[2].ID

	// Create several items
	fmt.Println("\nCreating items...")

	items := []*Item{
		NewItem("Design user interface", board.ID, userID),
		NewItem("Implement authentication", board.ID, userID),
		NewItem("Write unit tests", board.ID, userID),
		NewItem("Deploy to staging", board.ID, userID),
		NewItem("Review code", board.ID, userID),
	}

	// Set initial positions and place all items in "To Do" column
	fmt.Println("\nSetting up initial board state...")
	for i, item := range items {
		position := (i + 1) * 1000
		item.UpdatePosition(position)
		item.SetFieldValue(todoColumnID, "To Do", userID)
		fmt.Printf("  %s - Position: %d, Status: To Do\n", item.Name, item.Position)
	}

	// Simulate drag and drop operations
	fmt.Println("\n=== Simulating Drag and Drop Operations ===")

	// Move "Implement authentication" to "In Progress"
	fmt.Println("\n1. Moving 'Implement authentication' to 'In Progress' column...")
	authItem := items[1]

	// Remove from old column
	authItem.RemoveFieldValue(todoColumnID)

	// Set new position (first in progress column)
	authItem.UpdatePosition(1000)

	// Set new status
	authItem.SetFieldValue(progressColumnID, "In Progress", userID)

	fmt.Printf("   %s moved to In Progress at position %d\n", authItem.Name, authItem.Position)

	// Move "Write unit tests" to "In Progress" after "Implement authentication"
	fmt.Println("\n2. Moving 'Write unit tests' to 'In Progress' after authentication...")
	testItem := items[2]

	// Remove from old column
	testItem.RemoveFieldValue(todoColumnID)

	// Set position after auth item
	testItem.UpdatePosition(2000)

	// Set new status
	testItem.SetFieldValue(progressColumnID, "In Progress", userID)

	fmt.Printf("   %s moved to In Progress at position %d\n", testItem.Name, testItem.Position)

	// Move "Design user interface" to "Done"
	fmt.Println("\n3. Moving 'Design user interface' to 'Done'...")
	designItem := items[0]

	// Remove from old column
	designItem.RemoveFieldValue(todoColumnID)

	// Set position in done column
	designItem.UpdatePosition(1000)

	// Set new status
	designItem.SetFieldValue(doneColumnID, "Done", userID)

	fmt.Printf("   %s moved to Done at position %d\n", designItem.Name, designItem.Position)

	// Reorder items within "In Progress" column
	fmt.Println("\n4. Reordering items within 'In Progress' column...")
	fmt.Println("   Moving 'Write unit tests' before 'Implement authentication'...")

	// Swap positions
	testItem.UpdatePosition(500)  // Move before auth item
	authItem.UpdatePosition(1500) // Move after test item

	fmt.Printf("   %s now at position %d\n", testItem.Name, testItem.Position)
	fmt.Printf("   %s now at position %d\n", authItem.Name, authItem.Position)

	// Display final board state
	fmt.Println("\n=== Final Board State ===")

	// Group items by column
	columnItems := make(map[string][]*Item)

	for _, item := range items {
		// Determine which column the item is in
		var column string
		if value, exists := item.GetFieldValue(todoColumnID); exists && value == "To Do" {
			column = "To Do"
		} else if value, exists := item.GetFieldValue(progressColumnID); exists && value == "In Progress" {
			column = "In Progress"
		} else if value, exists := item.GetFieldValue(doneColumnID); exists && value == "Done" {
			column = "Done"
		} else {
			column = "Unassigned"
		}

		columnItems[column] = append(columnItems[column], item)
	}

	// Sort items within each column by position
	for column := range columnItems {
		sort.Slice(columnItems[column], func(i, j int) bool {
			return columnItems[column][i].Position < columnItems[column][j].Position
		})
	}

	// Display columns
	columnOrder := []string{"To Do", "In Progress", "Done", "Unassigned"}
	for _, columnName := range columnOrder {
		if items, exists := columnItems[columnName]; exists && len(items) > 0 {
			fmt.Printf("\n%s:\n", columnName)
			for i, item := range items {
				fmt.Printf("  %d. %s (Position: %d)\n", i+1, item.Name, item.Position)
			}
		}
	}

	// Demonstrate position calculation utilities
	fmt.Println("\n=== Position Calculation Examples ===")

	// Calculate position between two items
	if len(columnItems["In Progress"]) >= 2 {
		item1 := columnItems["In Progress"][0]
		item2 := columnItems["In Progress"][1]
		betweenPos := (item1.Position + item2.Position) / 2
		fmt.Printf("\nPosition between '%s' (%d) and '%s' (%d): %d\n",
			item1.Name, item1.Position, item2.Name, item2.Position, betweenPos)
	}

	// Calculate position at beginning of column
	if len(columnItems["To Do"]) > 0 {
		firstItem := columnItems["To Do"][0]
		beforePos := firstItem.Position / 2
		fmt.Printf("Position before first item in 'To Do' (%d): %d\n", firstItem.Position, beforePos)
	}

	// Calculate position at end of column
	if len(columnItems["In Progress"]) > 0 {
		lastItem := columnItems["In Progress"][len(columnItems["In Progress"])-1]
		afterPos := lastItem.Position + 1000
		fmt.Printf("Position after last item in 'In Progress' (%d): %d\n", lastItem.Position, afterPos)
	}

	// Demonstrate position compacting (rebalancing)
	fmt.Println("\n=== Position Compacting Example ===")

	// Create items with irregular positions
	irregularItems := []*Item{
		{
			ID:        primitive.NewObjectID(),
			Name:      "Item A",
			Position:  150,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        primitive.NewObjectID(),
			Name:      "Item B",
			Position:  151,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        primitive.NewObjectID(),
			Name:      "Item C",
			Position:  152,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
	}

	fmt.Println("\nBefore compacting:")
	for _, item := range irregularItems {
		fmt.Printf("  %s: Position %d\n", item.Name, item.Position)
	}

	// Compact positions
	for i, item := range irregularItems {
		newPosition := (i + 1) * 1000
		item.UpdatePosition(newPosition)
	}

	fmt.Println("\nAfter compacting:")
	for _, item := range irregularItems {
		fmt.Printf("  %s: Position %d\n", item.Name, item.Position)
	}

	// Demonstrate gap detection
	fmt.Println("\n=== Gap Analysis ===")

	// Check if items need rebalancing
	minGap := 100
	needsRebalancing := false

	if len(columnItems["In Progress"]) >= 2 {
		progressItems := columnItems["In Progress"]
		for i := 1; i < len(progressItems); i++ {
			gap := progressItems[i].Position - progressItems[i-1].Position
			fmt.Printf("Gap between '%s' and '%s': %d\n",
				progressItems[i-1].Name, progressItems[i].Name, gap)
			if gap < minGap {
				needsRebalancing = true
			}
		}
	}

	if needsRebalancing {
		fmt.Printf("\nItems need rebalancing (minimum gap: %d)\n", minGap)
	} else {
		fmt.Printf("\nItems have sufficient gaps (minimum gap: %d)\n", minGap)
	}

	fmt.Println("\n=== Demo Complete ===")
}
