package services

import (
	"testing"
	"time"

	"project-management-platform/internal/models"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestDragDropCalculator_CalculateDropPosition(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()

	// Create test items
	item1 := &models.Item{
		ID:        primitive.NewObjectID(),
		Name:      "Item 1",
		Position:  1000,
		CreatedAt: time.Now(),
		CreatedBy: userID,
	}
	item2 := &models.Item{
		ID:        primitive.NewObjectID(),
		Name:      "Item 2",
		Position:  2000,
		CreatedAt: time.Now(),
		CreatedBy: userID,
	}
	item3 := &models.Item{
		ID:        primitive.NewObjectID(),
		Name:      "Item 3",
		Position:  3000,
		CreatedAt: time.Now(),
		CreatedBy: userID,
	}

	columnItems := map[string][]*models.Item{
		"To Do":       {item1, item2, item3},
		"In Progress": {},
	}

	tests := []struct {
		name    string
		dropPos DropPosition
		wantPos int
		wantErr bool
	}{
		{
			name: "drop at beginning",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        0,
			},
			wantPos: 500, // Before first item (position 1000): 1000/2 = 500
			wantErr: false,
		},
		{
			name: "drop at end",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        3,
			},
			wantPos: 4000, // After last item (position 3000)
			wantErr: false,
		},
		{
			name: "drop between items",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        1,
			},
			wantPos: 1500, // Between item1 (1000) and item2 (2000)
			wantErr: false,
		},
		{
			name: "drop in empty column",
			dropPos: DropPosition{
				TargetColumn: "In Progress",
				Index:        0,
			},
			wantPos: 1000, // First item in empty column
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pos, err := calculator.CalculateDropPosition(columnItems, tt.dropPos)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantPos, pos)
			}
		})
	}
}

func TestDragDropCalculator_ValidateDropPosition(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()
	draggedItemID := primitive.NewObjectID()

	item1 := &models.Item{
		ID:        primitive.NewObjectID(),
		Name:      "Item 1",
		Position:  1000,
		CreatedAt: time.Now(),
		CreatedBy: userID,
	}
	item2 := &models.Item{
		ID:        primitive.NewObjectID(),
		Name:      "Item 2",
		Position:  2000,
		CreatedAt: time.Now(),
		CreatedBy: userID,
	}

	columnItems := map[string][]*models.Item{
		"To Do": {item1, item2},
	}

	tests := []struct {
		name        string
		dropPos     DropPosition
		wantErr     bool
		errContains string
	}{
		{
			name: "valid drop position",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        1,
			},
			wantErr: false,
		},
		{
			name: "invalid column",
			dropPos: DropPosition{
				TargetColumn: "Non Existent",
				Index:        0,
			},
			wantErr:     true,
			errContains: "does not exist",
		},
		{
			name: "negative index",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        -1,
			},
			wantErr:     true,
			errContains: "cannot be negative",
		},
		{
			name: "index exceeds column length",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        5,
			},
			wantErr:     true,
			errContains: "exceeds column length",
		},
		{
			name: "valid before item",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        1,
				BeforeItemID: &item2.ID,
			},
			wantErr: false,
		},
		{
			name: "invalid before item",
			dropPos: DropPosition{
				TargetColumn: "To Do",
				Index:        1,
				BeforeItemID: &draggedItemID,
			},
			wantErr:     true,
			errContains: "before item not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := calculator.ValidateDropPosition(columnItems, tt.dropPos, draggedItemID)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestDragDropCalculator_CalculateBulkReorder(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()

	item1ID := primitive.NewObjectID()
	item2ID := primitive.NewObjectID()
	item3ID := primitive.NewObjectID()

	items := []*models.Item{
		{
			ID:        item1ID,
			Name:      "Item 1",
			Position:  1000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        item2ID,
			Name:      "Item 2",
			Position:  2000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        item3ID,
			Name:      "Item 3",
			Position:  3000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
	}

	tests := []struct {
		name     string
		newOrder []primitive.ObjectID
		wantErr  bool
		expected map[primitive.ObjectID]int
	}{
		{
			name:     "reverse order",
			newOrder: []primitive.ObjectID{item3ID, item2ID, item1ID},
			wantErr:  false,
			expected: map[primitive.ObjectID]int{
				item3ID: 1000,
				item2ID: 2000,
				item1ID: 3000,
			},
		},
		{
			name:     "same order",
			newOrder: []primitive.ObjectID{item1ID, item2ID, item3ID},
			wantErr:  false,
			expected: map[primitive.ObjectID]int{
				item1ID: 1000,
				item2ID: 2000,
				item3ID: 3000,
			},
		},
		{
			name:     "missing item",
			newOrder: []primitive.ObjectID{item1ID, item2ID},
			wantErr:  true,
		},
		{
			name:     "extra item",
			newOrder: []primitive.ObjectID{item1ID, item2ID, item3ID, primitive.NewObjectID()},
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			positions, err := calculator.CalculateBulkReorder(items, tt.newOrder)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, positions)
			}
		})
	}
}

func TestDragDropCalculator_OptimizePositions(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()

	item1ID := primitive.NewObjectID()
	item2ID := primitive.NewObjectID()
	item3ID := primitive.NewObjectID()

	// Items with irregular positions
	items := []*models.Item{
		{
			ID:        item1ID,
			Name:      "Item 1",
			Position:  150, // Irregular position
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        item2ID,
			Name:      "Item 2",
			Position:  2750, // Irregular position
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        item3ID,
			Name:      "Item 3",
			Position:  5500, // Irregular position
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
	}

	positions := calculator.OptimizePositions(items)

	// Should return clean positions based on sorted order
	expected := map[primitive.ObjectID]int{
		item1ID: 1000, // First item (position 150)
		item2ID: 2000, // Second item (position 2750)
		item3ID: 3000, // Third item (position 5500)
	}

	assert.Equal(t, expected, positions)
}

func TestDragDropCalculator_CalculateColumnTransfer(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()

	draggedItemID := primitive.NewObjectID()
	sourceItem1ID := primitive.NewObjectID()
	sourceItem2ID := primitive.NewObjectID()
	targetItem1ID := primitive.NewObjectID()
	targetItem2ID := primitive.NewObjectID()

	sourceColumn := []*models.Item{
		{
			ID:        sourceItem1ID,
			Name:      "Source Item 1",
			Position:  1000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        draggedItemID,
			Name:      "Dragged Item",
			Position:  2000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        sourceItem2ID,
			Name:      "Source Item 2",
			Position:  3000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
	}

	targetColumn := []*models.Item{
		{
			ID:        targetItem1ID,
			Name:      "Target Item 1",
			Position:  1000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        targetItem2ID,
			Name:      "Target Item 2",
			Position:  2000,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
	}

	sourcePositions, targetPositions, draggedPosition, err := calculator.CalculateColumnTransfer(
		sourceColumn,
		targetColumn,
		draggedItemID,
		1, // Insert at index 1 (between target items)
	)

	assert.NoError(t, err)

	// Source column should have 2 items with clean positions
	expectedSourcePositions := map[primitive.ObjectID]int{
		sourceItem1ID: 1000,
		sourceItem2ID: 2000,
	}
	assert.Equal(t, expectedSourcePositions, sourcePositions)

	// Target column should have 3 items with dragged item at index 1
	expectedTargetPositions := map[primitive.ObjectID]int{
		targetItem1ID: 1000, // First item
		draggedItemID: 2000, // Inserted item
		targetItem2ID: 3000, // Moved to third position
	}
	assert.Equal(t, expectedTargetPositions, targetPositions)
	assert.Equal(t, 2000, draggedPosition)
}

func TestDragDropCalculator_GetPositionBetween(t *testing.T) {
	calculator := NewDragDropCalculator()

	tests := []struct {
		name      string
		beforePos int
		afterPos  int
		wantPos   int
	}{
		{
			name:      "normal gap",
			beforePos: 1000,
			afterPos:  3000,
			wantPos:   2000, // (1000 + 3000) / 2
		},
		{
			name:      "small gap",
			beforePos: 1000,
			afterPos:  1001,
			wantPos:   1001, // beforePos + 1 (triggers rebalancing)
		},
		{
			name:      "invalid order",
			beforePos: 3000,
			afterPos:  1000,
			wantPos:   2000, // afterPos + 1000 (safe fallback)
		},
		{
			name:      "large gap",
			beforePos: 1000,
			afterPos:  10000,
			wantPos:   5500, // (1000 + 10000) / 2
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pos := calculator.GetPositionBetween(tt.beforePos, tt.afterPos)
			assert.Equal(t, tt.wantPos, pos)
		})
	}
}

func TestDragDropCalculator_NeedsRebalancing(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()

	tests := []struct {
		name     string
		items    []*models.Item
		minGap   int
		wantNeed bool
	}{
		{
			name: "needs rebalancing - small gaps",
			items: []*models.Item{
				{
					ID:        primitive.NewObjectID(),
					Position:  1000,
					CreatedBy: userID,
				},
				{
					ID:        primitive.NewObjectID(),
					Position:  1001, // Gap of 1
					CreatedBy: userID,
				},
				{
					ID:        primitive.NewObjectID(),
					Position:  1002, // Gap of 1
					CreatedBy: userID,
				},
			},
			minGap:   100,
			wantNeed: true,
		},
		{
			name: "no rebalancing needed - good gaps",
			items: []*models.Item{
				{
					ID:        primitive.NewObjectID(),
					Position:  1000,
					CreatedBy: userID,
				},
				{
					ID:        primitive.NewObjectID(),
					Position:  2000, // Gap of 1000
					CreatedBy: userID,
				},
				{
					ID:        primitive.NewObjectID(),
					Position:  3000, // Gap of 1000
					CreatedBy: userID,
				},
			},
			minGap:   100,
			wantNeed: false,
		},
		{
			name: "single item - no rebalancing needed",
			items: []*models.Item{
				{
					ID:        primitive.NewObjectID(),
					Position:  1000,
					CreatedBy: userID,
				},
			},
			minGap:   100,
			wantNeed: false,
		},
		{
			name:     "empty list - no rebalancing needed",
			items:    []*models.Item{},
			minGap:   100,
			wantNeed: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			needsRebalancing := calculator.NeedsRebalancing(tt.items, tt.minGap)
			assert.Equal(t, tt.wantNeed, needsRebalancing)
		})
	}
}
