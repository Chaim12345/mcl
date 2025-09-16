package services

import (
	"fmt"
	"sort"

	"project-management-platform/internal/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DragDropCalculator provides utilities for calculating positions during drag and drop operations
type DragDropCalculator struct{}

// NewDragDropCalculator creates a new drag and drop calculator
func NewDragDropCalculator() *DragDropCalculator {
	return &DragDropCalculator{}
}

// DropPosition represents where an item is being dropped
type DropPosition struct {
	TargetColumn string              `json:"targetColumn"`
	Index        int                 `json:"index"`                  // 0-based index in the target column
	BeforeItemID *primitive.ObjectID `json:"beforeItemId,omitempty"` // Item that will come after the dropped item
	AfterItemID  *primitive.ObjectID `json:"afterItemId,omitempty"`  // Item that will come before the dropped item
}

// CalculateDropPosition calculates the exact position for a dropped item
func (ddc *DragDropCalculator) CalculateDropPosition(
	columnItems map[string][]*models.Item,
	dropPos DropPosition,
) (int, error) {
	targetItems := columnItems[dropPos.TargetColumn]

	// If dropping into empty column
	if len(targetItems) == 0 {
		return 1000, nil
	}

	// If dropping at the beginning
	if dropPos.Index == 0 {
		firstItem := targetItems[0]
		if firstItem.Position <= 1000 {
			return firstItem.Position / 2, nil
		}
		return firstItem.Position - 1000, nil
	}

	// If dropping at the end
	if dropPos.Index >= len(targetItems) {
		lastItem := targetItems[len(targetItems)-1]
		return lastItem.Position + 1000, nil
	}

	// Dropping between two items
	beforeItem := targetItems[dropPos.Index-1]
	afterItem := targetItems[dropPos.Index]

	// Calculate position between the two items
	gap := afterItem.Position - beforeItem.Position
	if gap > 1 {
		return beforeItem.Position + gap/2, nil
	}

	// Gap is too small, need to reposition items
	return ddc.calculatePositionWithRebalancing(targetItems, dropPos.Index)
}

// calculatePositionWithRebalancing recalculates positions when there's insufficient gap
func (ddc *DragDropCalculator) calculatePositionWithRebalancing(items []*models.Item, insertIndex int) (int, error) {
	// Create new position array with proper spacing
	newPositions := make([]int, len(items)+1)

	// Calculate positions with 1000-unit spacing
	for i := 0; i < len(newPositions); i++ {
		newPositions[i] = (i + 1) * 1000
	}

	// Return the position for the insert index
	return newPositions[insertIndex], nil
}

// ValidateDropPosition validates that a drop position is valid
func (ddc *DragDropCalculator) ValidateDropPosition(
	columnItems map[string][]*models.Item,
	dropPos DropPosition,
	draggedItemID primitive.ObjectID,
) error {
	// Check if target column exists
	if _, exists := columnItems[dropPos.TargetColumn]; !exists {
		return fmt.Errorf("target column '%s' does not exist", dropPos.TargetColumn)
	}

	targetItems := columnItems[dropPos.TargetColumn]

	// Validate index is within bounds
	if dropPos.Index < 0 {
		return fmt.Errorf("drop index cannot be negative")
	}

	// For non-empty columns, index can be at most len(items)
	if len(targetItems) > 0 && dropPos.Index > len(targetItems) {
		return fmt.Errorf("drop index %d exceeds column length %d", dropPos.Index, len(targetItems))
	}

	// Validate before/after item IDs if provided
	if dropPos.BeforeItemID != nil {
		found := false
		for _, item := range targetItems {
			if item.ID == *dropPos.BeforeItemID {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("before item not found in target column")
		}
	}

	if dropPos.AfterItemID != nil {
		found := false
		for _, item := range targetItems {
			if item.ID == *dropPos.AfterItemID {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("after item not found in target column")
		}
	}

	return nil
}

// CalculateBulkReorder calculates new positions for multiple items being reordered
func (ddc *DragDropCalculator) CalculateBulkReorder(
	items []*models.Item,
	newOrder []primitive.ObjectID,
) (map[primitive.ObjectID]int, error) {
	if len(items) != len(newOrder) {
		return nil, fmt.Errorf("item count mismatch: %d items, %d in new order", len(items), len(newOrder))
	}

	// Create item lookup map
	itemMap := make(map[primitive.ObjectID]*models.Item)
	for _, item := range items {
		itemMap[item.ID] = item
	}

	// Validate all items in new order exist
	for _, itemID := range newOrder {
		if _, exists := itemMap[itemID]; !exists {
			return nil, fmt.Errorf("item %s not found in original items", itemID.Hex())
		}
	}

	// Calculate new positions
	positions := make(map[primitive.ObjectID]int)
	for i, itemID := range newOrder {
		positions[itemID] = (i + 1) * 1000
	}

	return positions, nil
}

// OptimizePositions optimizes positions to prevent overflow and maintain proper spacing
func (ddc *DragDropCalculator) OptimizePositions(items []*models.Item) map[primitive.ObjectID]int {
	// Sort items by current position
	sortedItems := make([]*models.Item, len(items))
	copy(sortedItems, items)
	sort.Slice(sortedItems, func(i, j int) bool {
		return sortedItems[i].Position < sortedItems[j].Position
	})

	// Assign new positions with proper spacing
	positions := make(map[primitive.ObjectID]int)
	for i, item := range sortedItems {
		positions[item.ID] = (i + 1) * 1000
	}

	return positions
}

// CalculateColumnTransfer calculates positions when moving items between columns
func (ddc *DragDropCalculator) CalculateColumnTransfer(
	sourceColumn []*models.Item,
	targetColumn []*models.Item,
	draggedItemID primitive.ObjectID,
	targetIndex int,
) (sourcePositions map[primitive.ObjectID]int, targetPositions map[primitive.ObjectID]int, draggedPosition int, err error) {
	// Remove dragged item from source column
	var draggedItem *models.Item
	var newSourceItems []*models.Item

	for _, item := range sourceColumn {
		if item.ID == draggedItemID {
			draggedItem = item
		} else {
			newSourceItems = append(newSourceItems, item)
		}
	}

	if draggedItem == nil {
		return nil, nil, 0, fmt.Errorf("dragged item not found in source column")
	}

	// Recalculate source column positions
	sourcePositions = ddc.OptimizePositions(newSourceItems)

	// Insert dragged item into target column at specified index
	newTargetItems := make([]*models.Item, 0, len(targetColumn)+1)

	// Add items before the target index
	for i := 0; i < targetIndex && i < len(targetColumn); i++ {
		newTargetItems = append(newTargetItems, targetColumn[i])
	}

	// Add the dragged item
	newTargetItems = append(newTargetItems, draggedItem)

	// Add remaining items
	for i := targetIndex; i < len(targetColumn); i++ {
		newTargetItems = append(newTargetItems, targetColumn[i])
	}

	// Calculate target column positions
	targetPositions = ddc.OptimizePositions(newTargetItems)
	draggedPosition = targetPositions[draggedItemID]

	return sourcePositions, targetPositions, draggedPosition, nil
}

// GetPositionBetween calculates a position between two existing positions
func (ddc *DragDropCalculator) GetPositionBetween(beforePos, afterPos int) int {
	if beforePos >= afterPos {
		// Invalid order, return a safe position
		return afterPos + 1000
	}

	gap := afterPos - beforePos
	if gap > 1 {
		return beforePos + gap/2
	}

	// Gap too small, return position that will trigger rebalancing
	return beforePos + 1
}

// NeedsRebalancing checks if positions need to be rebalanced due to insufficient gaps
func (ddc *DragDropCalculator) NeedsRebalancing(items []*models.Item, minGap int) bool {
	if len(items) < 2 {
		return false
	}

	// Sort by position
	sortedItems := make([]*models.Item, len(items))
	copy(sortedItems, items)
	sort.Slice(sortedItems, func(i, j int) bool {
		return sortedItems[i].Position < sortedItems[j].Position
	})

	// Check gaps between consecutive items
	for i := 1; i < len(sortedItems); i++ {
		gap := sortedItems[i].Position - sortedItems[i-1].Position
		if gap < minGap {
			return true
		}
	}

	return false
}
