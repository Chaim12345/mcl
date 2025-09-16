package services

import (
	"context"
	"fmt"
	"sort"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ItemMovementService handles item positioning and movement operations
type ItemMovementService struct {
	itemRepo     repository.ItemRepository
	boardRepo    repository.BoardRepository
	activityRepo repository.ActivityRepository
}

// NewItemMovementService creates a new item movement service
func NewItemMovementService(
	itemRepo repository.ItemRepository,
	boardRepo repository.BoardRepository,
	activityRepo repository.ActivityRepository,
) *ItemMovementService {
	return &ItemMovementService{
		itemRepo:     itemRepo,
		boardRepo:    boardRepo,
		activityRepo: activityRepo,
	}
}

// ItemMoveRequest represents a request to move an item between columns
type ItemMoveRequest struct {
	ItemID       primitive.ObjectID `json:"itemId"`
	TargetColumn string             `json:"targetColumn"`
	NewPosition  int                `json:"newPosition"`
	UserID       primitive.ObjectID `json:"userId"`
}

// ItemPosition represents an item's position information
type ItemPosition struct {
	ItemID   primitive.ObjectID `json:"itemId"`
	Position int                `json:"position"`
	Column   string             `json:"column,omitempty"`
}

// MoveItem moves an item to a new position and/or column
func (ims *ItemMovementService) MoveItem(ctx context.Context, req ItemMoveRequest) error {
	// Get the item
	item, err := ims.itemRepo.GetByID(ctx, req.ItemID)
	if err != nil {
		return fmt.Errorf("failed to get item: %w", err)
	}

	// Get the board to validate the target column
	board, err := ims.boardRepo.GetByID(ctx, item.BoardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}

	// Validate target column exists
	var targetColumn *models.BoardColumn
	for _, column := range board.Columns {
		if column.ID == req.TargetColumn {
			targetColumn = &column
			break
		}
	}

	if targetColumn == nil {
		return fmt.Errorf("target column not found: %s", req.TargetColumn)
	}

	// Get current column (if any)
	var currentColumn string
	if statusValue, exists := item.GetFieldValue(req.TargetColumn); exists && statusValue != nil {
		if strValue, ok := statusValue.(string); ok {
			currentColumn = strValue
		}
	}

	// Get all items in the board for position calculation
	boardItems, err := ims.itemRepo.GetByBoardID(ctx, item.BoardID)
	if err != nil {
		return fmt.Errorf("failed to get board items: %w", err)
	}

	// Calculate new positions
	err = ims.updateItemPositions(ctx, boardItems, req.ItemID, req.TargetColumn, req.NewPosition)
	if err != nil {
		return fmt.Errorf("failed to update item positions: %w", err)
	}

	// Update the item's column status if it's a status column
	if targetColumn.Type == models.FieldTypeStatus {
		// Get the status value from column settings or use column name
		var statusValue interface{}
		if options, exists := targetColumn.Settings["options"]; exists {
			if optionsList, ok := options.([]interface{}); ok && len(optionsList) > 0 {
				statusValue = optionsList[0] // Use first option as default
			}
		}
		if statusValue == nil {
			statusValue = targetColumn.Name // Fallback to column name
		}

		err = item.SetFieldValue(req.TargetColumn, statusValue, req.UserID)
		if err != nil {
			return fmt.Errorf("failed to set item status: %w", err)
		}

		// Update the item in database
		itemBSON, err := item.ToBSON()
		if err != nil {
			return fmt.Errorf("failed to convert item to BSON: %w", err)
		}
		_, err = ims.itemRepo.Update(ctx, req.ItemID, itemBSON)
		if err != nil {
			return fmt.Errorf("failed to update item: %w", err)
		}
	}

	// Log activity
	activity := &models.Activity{
		Type:        "item_moved",
		EntityType:  "item",
		EntityID:    req.ItemID,
		UserID:      req.UserID,
		WorkspaceID: board.WorkspaceID,
		BoardID:     &item.BoardID,
		ItemID:      &req.ItemID,
		Data: map[string]interface{}{
			"itemName":    item.Name,
			"fromColumn":  currentColumn,
			"toColumn":    targetColumn.Name,
			"newPosition": req.NewPosition,
		},
	}

	if _, err := ims.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log activity: %v\n", err)
	}

	return nil
}

// updateItemPositions recalculates and updates positions for all affected items
func (ims *ItemMovementService) updateItemPositions(ctx context.Context, boardItems []*models.Item, movedItemID primitive.ObjectID, targetColumn string, newPosition int) error {
	// Group items by column (based on their status field values)
	columnItems := make(map[string][]*models.Item)
	var movedItem *models.Item

	for _, item := range boardItems {
		if item.ID == movedItemID {
			movedItem = item
			continue
		}

		// Determine item's current column based on status field
		itemColumn := ims.getItemColumn(item, targetColumn)
		columnItems[itemColumn] = append(columnItems[itemColumn], item)
	}

	if movedItem == nil {
		return fmt.Errorf("moved item not found")
	}

	// Remove moved item from its current column
	currentColumn := ims.getItemColumn(movedItem, targetColumn)
	if currentColumn != "" && currentColumn != targetColumn {
		// Remove from current column
		items := columnItems[currentColumn]
		for i, item := range items {
			if item.ID == movedItemID {
				columnItems[currentColumn] = append(items[:i], items[i+1:]...)
				break
			}
		}
	}

	// Add moved item to target column at specified position
	targetItems := columnItems[targetColumn]

	// Ensure new position is within bounds
	if newPosition < 0 {
		newPosition = 0
	}
	if newPosition > len(targetItems) {
		newPosition = len(targetItems)
	}

	// Insert moved item at new position
	targetItems = append(targetItems, nil)
	copy(targetItems[newPosition+1:], targetItems[newPosition:])
	targetItems[newPosition] = movedItem
	columnItems[targetColumn] = targetItems

	// Update positions for all items in affected columns
	columnsToUpdate := []string{targetColumn}
	if currentColumn != "" && currentColumn != targetColumn {
		columnsToUpdate = append(columnsToUpdate, currentColumn)
	}

	for _, column := range columnsToUpdate {
		items := columnItems[column]

		// Sort items by current position to maintain relative order
		sort.Slice(items, func(i, j int) bool {
			return items[i].Position < items[j].Position
		})

		// Update positions
		for i, item := range items {
			newPos := i * 1000 // Use increments of 1000 to allow for future insertions
			if item.Position != newPos {
				err := item.UpdatePosition(newPos)
				if err != nil {
					return fmt.Errorf("failed to update item position: %w", err)
				}

				// Update in database
				itemBSON, err := item.ToBSON()
				if err != nil {
					return fmt.Errorf("failed to convert item to BSON: %w", err)
				}
				_, err = ims.itemRepo.Update(ctx, item.ID, itemBSON)
				if err != nil {
					return fmt.Errorf("failed to update item in database: %w", err)
				}
			}
		}
	}

	return nil
}

// getItemColumn determines which column an item belongs to based on its status field
func (ims *ItemMovementService) getItemColumn(item *models.Item, statusColumnID string) string {
	if statusValue, exists := item.GetFieldValue(statusColumnID); exists && statusValue != nil {
		if strValue, ok := statusValue.(string); ok {
			return strValue
		}
	}
	return "" // Item has no status/column assignment
}

// ReorderItems reorders multiple items within the same column
func (ims *ItemMovementService) ReorderItems(ctx context.Context, boardID primitive.ObjectID, itemPositions []ItemPosition, userID primitive.ObjectID) error {
	// Get the board
	board, err := ims.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}

	// Get all items to reorder
	itemIDs := make([]primitive.ObjectID, len(itemPositions))
	for i, pos := range itemPositions {
		itemIDs[i] = pos.ItemID
	}

	// Validate all items belong to the board
	for _, itemID := range itemIDs {
		item, err := ims.itemRepo.GetByID(ctx, itemID)
		if err != nil {
			return fmt.Errorf("failed to get item %s: %w", itemID.Hex(), err)
		}
		if item.BoardID != boardID {
			return fmt.Errorf("item %s does not belong to board %s", itemID.Hex(), boardID.Hex())
		}
	}

	// Update positions
	for _, pos := range itemPositions {
		item, err := ims.itemRepo.GetByID(ctx, pos.ItemID)
		if err != nil {
			return fmt.Errorf("failed to get item %s: %w", pos.ItemID.Hex(), err)
		}

		err = item.UpdatePosition(pos.Position)
		if err != nil {
			return fmt.Errorf("failed to update item position: %w", err)
		}

		// Update in database
		itemBSON, err := item.ToBSON()
		if err != nil {
			return fmt.Errorf("failed to convert item to BSON: %w", err)
		}
		_, err = ims.itemRepo.Update(ctx, pos.ItemID, itemBSON)
		if err != nil {
			return fmt.Errorf("failed to update item in database: %w", err)
		}
	}

	// Log activity
	activity := &models.Activity{
		Type:        "items_reordered",
		EntityType:  "board",
		EntityID:    boardID,
		UserID:      userID,
		WorkspaceID: board.WorkspaceID,
		BoardID:     &boardID,
		Data: map[string]interface{}{
			"itemCount":     len(itemPositions),
			"itemPositions": itemPositions,
		},
	}

	if _, err := ims.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log activity: %v\n", err)
	}

	return nil
}

// GetItemsByColumn returns items grouped by column with their positions
func (ims *ItemMovementService) GetItemsByColumn(ctx context.Context, boardID primitive.ObjectID, statusColumnID string) (map[string][]*models.Item, error) {
	// Get all items in the board
	items, err := ims.itemRepo.GetByBoardID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board items: %w", err)
	}

	// Group items by column
	columnItems := make(map[string][]*models.Item)

	for _, item := range items {
		column := ims.getItemColumn(item, statusColumnID)
		if column == "" {
			column = "unassigned" // Items without status go to unassigned
		}
		columnItems[column] = append(columnItems[column], item)
	}

	// Sort items within each column by position
	for column := range columnItems {
		sort.Slice(columnItems[column], func(i, j int) bool {
			return columnItems[column][i].Position < columnItems[column][j].Position
		})
	}

	return columnItems, nil
}

// CalculateNewPosition calculates the position for inserting an item between two existing items
func (ims *ItemMovementService) CalculateNewPosition(ctx context.Context, boardID primitive.ObjectID, targetColumn string, beforeItemID, afterItemID *primitive.ObjectID) (int, error) {
	// Get items in the target column
	columnItems, err := ims.GetItemsByColumn(ctx, boardID, targetColumn)
	if err != nil {
		return 0, fmt.Errorf("failed to get column items: %w", err)
	}

	items := columnItems[targetColumn]
	if len(items) == 0 {
		return 1000, nil // First item in column
	}

	// If no before/after specified, add to end
	if beforeItemID == nil && afterItemID == nil {
		lastItem := items[len(items)-1]
		return lastItem.Position + 1000, nil
	}

	// Find positions of before and after items
	var beforePos, afterPos int
	beforeFound, afterFound := false, false

	for _, item := range items {
		if beforeItemID != nil && item.ID == *beforeItemID {
			beforePos = item.Position
			beforeFound = true
		}
		if afterItemID != nil && item.ID == *afterItemID {
			afterPos = item.Position
			afterFound = true
		}
	}

	// Calculate position between the two items
	if beforeFound && afterFound {
		if beforePos >= afterPos {
			return 0, fmt.Errorf("invalid position: before item must come before after item")
		}
		return (beforePos + afterPos) / 2, nil
	} else if beforeFound {
		return beforePos + 1000, nil
	} else if afterFound {
		return afterPos - 1000, nil
	}

	return 0, fmt.Errorf("specified before/after items not found in target column")
}

// CompactPositions recalculates positions to use clean increments (useful for maintenance)
func (ims *ItemMovementService) CompactPositions(ctx context.Context, boardID primitive.ObjectID, statusColumnID string) error {
	// Get items grouped by column
	columnItems, err := ims.GetItemsByColumn(ctx, boardID, statusColumnID)
	if err != nil {
		return fmt.Errorf("failed to get column items: %w", err)
	}

	// Compact positions for each column
	for _, items := range columnItems {
		for i, item := range items {
			newPosition := (i + 1) * 1000
			if item.Position != newPosition {
				err := item.UpdatePosition(newPosition)
				if err != nil {
					return fmt.Errorf("failed to update item position: %w", err)
				}

				// Update in database
				itemBSON, err := item.ToBSON()
				if err != nil {
					return fmt.Errorf("failed to convert item to BSON: %w", err)
				}
				_, err = ims.itemRepo.Update(ctx, item.ID, itemBSON)
				if err != nil {
					return fmt.Errorf("failed to update item in database: %w", err)
				}
			}
		}
	}

	return nil
}
