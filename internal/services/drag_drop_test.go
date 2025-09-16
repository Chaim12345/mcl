package services

import (
	"testing"
	"time"

	"project-management-platform/internal/models"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestDragDropCalculatorBasic(t *testing.T) {
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

	columnItems := map[string][]*models.Item{
		"To Do": {item1, item2},
	}

	// Test drop at beginning
	dropPos := DropPosition{
		TargetColumn: "To Do",
		Index:        0,
	}

	pos, err := calculator.CalculateDropPosition(columnItems, dropPos)
	assert.NoError(t, err)
	assert.Equal(t, 500, pos) // Should be before first item, which is 1000/2 = 500

	// Test drop at end
	dropPos.Index = 2
	pos, err = calculator.CalculateDropPosition(columnItems, dropPos)
	assert.NoError(t, err)
	assert.Equal(t, 3000, pos) // Should be after last item

	// Test drop between items
	dropPos.Index = 1
	pos, err = calculator.CalculateDropPosition(columnItems, dropPos)
	assert.NoError(t, err)
	assert.Equal(t, 1500, pos) // Should be between items
}

func TestOptimizePositionsBasic(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()

	item1ID := primitive.NewObjectID()
	item2ID := primitive.NewObjectID()

	// Items with irregular positions
	items := []*models.Item{
		{
			ID:        item1ID,
			Name:      "Item 1",
			Position:  150,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
		{
			ID:        item2ID,
			Name:      "Item 2",
			Position:  2750,
			CreatedAt: time.Now(),
			CreatedBy: userID,
		},
	}

	positions := calculator.OptimizePositions(items)

	expected := map[primitive.ObjectID]int{
		item1ID: 1000,
		item2ID: 2000,
	}

	assert.Equal(t, expected, positions)
}

func TestGetPositionBetweenBasic(t *testing.T) {
	calculator := NewDragDropCalculator()

	// Normal gap
	pos := calculator.GetPositionBetween(1000, 3000)
	assert.Equal(t, 2000, pos)

	// Small gap
	pos = calculator.GetPositionBetween(1000, 1001)
	assert.Equal(t, 1001, pos) // Should trigger rebalancing

	// Invalid order
	pos = calculator.GetPositionBetween(3000, 1000)
	assert.Equal(t, 2000, pos) // Safe fallback
}

func TestNeedsRebalancingBasic(t *testing.T) {
	calculator := NewDragDropCalculator()
	userID := primitive.NewObjectID()

	// Items with small gaps
	items := []*models.Item{
		{
			ID:        primitive.NewObjectID(),
			Position:  1000,
			CreatedBy: userID,
		},
		{
			ID:        primitive.NewObjectID(),
			Position:  1001,
			CreatedBy: userID,
		},
	}

	needsRebalancing := calculator.NeedsRebalancing(items, 100)
	assert.True(t, needsRebalancing)

	// Items with good gaps
	items[1].Position = 2000
	needsRebalancing = calculator.NeedsRebalancing(items, 100)
	assert.False(t, needsRebalancing)
}
