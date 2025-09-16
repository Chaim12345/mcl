package services

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// ItemService handles item business logic
type ItemService struct {
	itemRepo      repository.ItemRepository
	boardRepo     repository.BoardRepository
	workspaceRepo repository.WorkspaceRepository
}

// FilterItems retrieves items matching status, priority, and/or date filters
func (s *ItemService) FilterItems(ctx context.Context, status, priority string, startDate, endDate *time.Time, limit, skip int64) ([]*ItemResponse, error) {
	filter := bson.M{}
	if status != "" {
		filter["status"] = status
	}
	if priority != "" {
		filter["priority"] = priority
	}
	if startDate != nil || endDate != nil {
		createdAt := bson.M{}
		if startDate != nil {
			createdAt["$gte"] = *startDate
		}
		if endDate != nil {
			createdAt["$lte"] = *endDate
		}
		filter["createdAt"] = createdAt
	}
	items, err := s.itemRepo.List(ctx, filter, limit, skip)
	if err != nil {
		return nil, err
	}
	responses := make([]*ItemResponse, 0, len(items))
	for _, item := range items {
		responses = append(responses, ItemToResponse(item))
	}
	return responses, nil
}

// SearchItems performs a text search across item titles and descriptions
func (s *ItemService) SearchItems(ctx context.Context, query string, limit, skip int64) ([]*ItemResponse, error) {
	items, err := s.itemRepo.SearchText(ctx, query, limit, skip)
	if err != nil {
		return nil, err
	}
	responses := make([]*ItemResponse, 0, len(items))
	for _, item := range items {
		responses = append(responses, ItemToResponse(item))
	}
	return responses, nil
}

// NewItemService creates a new item service
func NewItemService(itemRepo repository.ItemRepository, boardRepo repository.BoardRepository, workspaceRepo repository.WorkspaceRepository) *ItemService {
	return &ItemService{
		itemRepo:      itemRepo,
		boardRepo:     boardRepo,
		workspaceRepo: workspaceRepo,
	}
}

// CreateItemRequest represents an item creation request
type CreateItemRequest struct {
	Name        string                 `json:"name" validate:"omitempty,min=1,max=200"`
	Title       string                 `json:"title" validate:"omitempty,min=1,max=200"`
	Description string                 `json:"description,omitempty"`
	Priority    string                 `json:"priority,omitempty"`
	Status      string                 `json:"status,omitempty"`
	DueDate     *string                `json:"dueDate,omitempty"`
	Position    *int                   `json:"position,omitempty"`
	ColumnId    string                 `json:"columnId,omitempty"`
	FieldValues map[string]interface{} `json:"fieldValues,omitempty"`
	Assignees   []string               `json:"assignees,omitempty"`
	Assignee    string                 `json:"assignee,omitempty"`
}

// UpdateItemRequest represents an item update request
type UpdateItemRequest struct {
	Name        *string                `json:"name,omitempty" validate:"omitempty,min=1,max=200"`
	Position    *int                   `json:"position,omitempty"`
	FieldValues map[string]interface{} `json:"fieldValues,omitempty"`
	Assignees   []string               `json:"assignees,omitempty"`
}

// BoardColumn represents a column in a board for validation purposes
type BoardColumn struct {
	ID       string                 `json:"id"`
	Name     string                 `json:"name"`
	Type     string                 `json:"type"`
	Settings map[string]interface{} `json:"settings,omitempty"`
	Position int                    `json:"position"`
}

// ItemResponse represents an item response
type ItemResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	BoardID     string                 `json:"boardId"`
	Position    int                    `json:"position"`
	FieldValues map[string]interface{} `json:"fieldValues"`
	Assignees   []string               `json:"assignees"`
	Watchers    []string               `json:"watchers"`
	CreatedAt   time.Time              `json:"createdAt"`
	UpdatedAt   time.Time              `json:"updatedAt"`
	CreatedBy   string                 `json:"createdBy"`
}

// Create creates a new item within a board
func (s *ItemService) Create(ctx context.Context, userID, boardID primitive.ObjectID, req CreateItemRequest) (*ItemResponse, error) {
	fmt.Printf("DEBUG: Starting item creation with Title='%s', Name='%s'\n", req.Title, req.Name)
	// Validate board exists and user has access
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has access to the workspace containing this board
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of the workspace containing this board")
	}

	// Determine item name (prefer Title over Name for frontend compatibility)
	itemName := req.Title
	if itemName == "" {
		itemName = req.Name
	}
	if itemName == "" {
		return nil, fmt.Errorf("item name or title is required")
	}

	// Create item
	item := models.NewItem(itemName, boardID, userID)

	// Set position if provided, otherwise get next position
	if req.Position != nil {
		item.Position = *req.Position
	} else {
		// Get current item count to set position
		count, err := s.itemRepo.Count(ctx, bson.M{"boardId": boardID})
		if err != nil {
			return nil, fmt.Errorf("failed to get item count: %w", err)
		}
		item.Position = int(count)
	}

	// Validate and set basic field values from request
	if req.Description != "" {
		err := item.SetFieldValue("description", req.Description, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to set description: %w", err)
		}
	}

	if req.Priority != "" {
		// Validate priority value
		validPriorities := []string{"Low", "Medium", "High", "Critical"}
		isValid := false
		for _, p := range validPriorities {
			if req.Priority == p {
				isValid = true
				break
			}
		}
		if !isValid {
			return nil, fmt.Errorf("invalid priority: %s", req.Priority)
		}
		
		err := item.SetFieldValue("priority", req.Priority, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to set priority: %w", err)
		}
	}

	if req.Status != "" {
		// Validate status value
		validStatuses := []string{"To Do", "In Progress", "Done", "Not Started", "Completed"}
		isValid := false
		for _, s := range validStatuses {
			if req.Status == s {
				isValid = true
				break
			}
		}
		if !isValid {
			return nil, fmt.Errorf("invalid status: %s", req.Status)
		}
		
		err := item.SetFieldValue("status", req.Status, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to set status: %w", err)
		}
	}

	if req.DueDate != nil && *req.DueDate != "" {
		// Validate date format
		_, err := time.Parse(time.RFC3339, *req.DueDate)
		if err != nil {
			// Try parsing as date only
			_, err = time.Parse("2006-01-02", *req.DueDate)
			if err != nil {
				return nil, fmt.Errorf("invalid due date format: %v", err)
			}
		}
		
		err = item.SetFieldValue("dueDate", *req.DueDate, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to set due date: %w", err)
		}
	}

	if req.ColumnId != "" {
		// Validate columnId format
		if !primitive.IsValidObjectID(req.ColumnId) {
			return nil, fmt.Errorf("invalid column ID format: %s", req.ColumnId)
		}
		
		err := item.SetFieldValue("columnId", req.ColumnId, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to set column ID: %w", err)
		}
	}

	// Validate and set additional field values if provided
	if req.FieldValues != nil {
		// Get the board to validate fields against columns
		boardColumns := board.Columns
		
		// Validate each field value against column definitions
		for columnID, value := range req.FieldValues {
			// Find the corresponding column
			var column *BoardColumn
			for _, col := range boardColumns {
				if col.ID == columnID {
					column = &BoardColumn{
						ID:       col.ID,
						Name:     col.Name,
						Type:     col.Type,
						Settings: col.Settings,
						Position: col.Position,
					}
					break
				}
			}
			
			if column == nil {
				return nil, fmt.Errorf("column %s not found in board", columnID)
			}
			
			// Validate field value using column type
			validator := NewFieldValidator(column.Type, column.Settings, false)
			if err := validator.Validate(value); err != nil {
				return nil, fmt.Errorf("field '%s' validation failed: %w", column.Name, err)
			}
			
			// Set the validated value
			err := item.SetFieldValue(columnID, value, userID)
			if err != nil {
				return nil, fmt.Errorf("failed to set field value: %w", err)
			}
		}
	}

	// Add assignees if provided
	if req.Assignees != nil {
		// Validate and convert assignee IDs
		for _, assigneeIDStr := range req.Assignees {
			assigneeID, err := primitive.ObjectIDFromHex(assigneeIDStr)
			if err != nil {
				return nil, fmt.Errorf("invalid assignee ID: %s", assigneeIDStr)
			}
			
			// Validate assignee exists in workspace
			if !workspace.IsMember(assigneeID) {
				return nil, fmt.Errorf("assignee %s is not a member of the workspace", assigneeIDStr)
			}
			
			err = item.AddAssignee(assigneeID)
			if err != nil {
				return nil, fmt.Errorf("failed to add assignee: %w", err)
			}
		}
	}

	// Add single assignee if provided (skip if empty or null)
	if req.Assignee != "" && req.Assignee != "null" {
		assigneeID, err := primitive.ObjectIDFromHex(req.Assignee)
		if err != nil {
			return nil, fmt.Errorf("invalid assignee ID: %s", req.Assignee)
		}
		
		// Validate assignee exists in workspace
		if !workspace.IsMember(assigneeID) {
			return nil, fmt.Errorf("assignee %s is not a member of the workspace", req.Assignee)
		}
		
		err = item.AddAssignee(assigneeID)
		if err != nil {
			return nil, fmt.Errorf("failed to add assignee: %w", err)
		}
	}

	// Debug logging
	fmt.Printf("DEBUG: Item before validation - Name: '%s', Title from request: '%s'\n", item.Name, req.Title)

	// Validate item
	if err := item.Validate(); err != nil {
		return nil, fmt.Errorf("item validation failed: %w", err)
	}

	result, err := s.itemRepo.Create(ctx, item)
	if err != nil {
		return nil, fmt.Errorf("failed to create item: %w", err)
	}

	// Set the ID from the insert result
	item.ID = result.InsertedID.(primitive.ObjectID)

	return ItemToResponse(item), nil
}

// GetByID retrieves an item by ID with access control
func (s *ItemService) GetByID(ctx context.Context, userID, itemID primitive.ObjectID) (*ItemResponse, error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	// Check if user has access to the board containing this item
	board, err := s.boardRepo.GetByID(ctx, item.BoardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has access to the workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of the workspace containing this item")
	}

	return s.toItemResponse(item), nil
}

// GetByBoardID retrieves all items in a board
func (s *ItemService) GetByBoardID(ctx context.Context, userID, boardID primitive.ObjectID) ([]*ItemResponse, error) {
	// Check if user has access to the board
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has access to the workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of the workspace containing this board")
	}

	items, err := s.itemRepo.GetByBoardID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get items: %w", err)
	}

	responses := make([]*ItemResponse, len(items))
	for i, item := range items {
		responses[i] = s.toItemResponse(item)
	}

	return responses, nil
}

// Update updates an item
func (s *ItemService) Update(ctx context.Context, userID, itemID primitive.ObjectID, req UpdateItemRequest) (*ItemResponse, error) {
	// Get item and check permissions
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	// Check if user has access to the board
	board, err := s.boardRepo.GetByID(ctx, item.BoardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has access to the workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of the workspace containing this item")
	}

	// Build update document
	update := bson.M{}

	if req.Name != nil {
		if *req.Name == "" {
			return nil, fmt.Errorf("item name cannot be empty")
		}
		update["name"] = *req.Name
	}

	if req.Position != nil {
		if *req.Position < 0 {
			return nil, fmt.Errorf("position must be non-negative")
		}
		update["position"] = *req.Position
	}

	// Handle field values update
	if req.FieldValues != nil {
		// Get the board to validate fields against columns
		boardColumns := board.Columns
		
		// Validate each field value against column definitions
		for columnID, value := range req.FieldValues {
			// Find the corresponding column
			var column *BoardColumn
			for _, col := range boardColumns {
				if col.ID == columnID {
					column = &BoardColumn{
						ID:       col.ID,
						Name:     col.Name,
						Type:     col.Type,
						Settings: col.Settings,
						Position: col.Position,
					}
					break
				}
			}
			
			if column == nil {
				return nil, fmt.Errorf("column %s not found in board", columnID)
			}
			
			// Validate field value using column type
			validator := NewFieldValidator(column.Type, column.Settings, false)
			if err := validator.Validate(value); err != nil {
				return nil, fmt.Errorf("field '%s' validation failed: %w", column.Name, err)
			}
			
			// Update the field value
			fieldValue := models.ItemFieldValue{
				ColumnID:  columnID,
				Value:     value,
				UpdatedAt: time.Now(),
				UpdatedBy: userID,
			}
			err := s.itemRepo.UpdateFieldValue(ctx, itemID, fieldValue)
			if err != nil {
				return nil, fmt.Errorf("failed to update field value: %w", err)
			}
		}
	}

	// Handle assignees update
	if req.Assignees != nil {
		// Convert string IDs to ObjectIDs and validate workspace membership
		assigneeIDs := make([]primitive.ObjectID, len(req.Assignees))
		for i, assigneeIDStr := range req.Assignees {
			assigneeID, err := primitive.ObjectIDFromHex(assigneeIDStr)
			if err != nil {
				return nil, fmt.Errorf("invalid assignee ID: %s", assigneeIDStr)
			}
			
			// Validate assignee exists in workspace
			if !workspace.IsMember(assigneeID) {
				return nil, fmt.Errorf("assignee %s is not a member of the workspace", assigneeIDStr)
			}
			
			assigneeIDs[i] = assigneeID
		}
		update["assignees"] = assigneeIDs
	}

	// Always update the updatedAt timestamp
	update["updatedAt"] = time.Now()

	// Perform update if there are changes
	if len(update) > 1 { // More than just updatedAt
		_, err = s.itemRepo.Update(ctx, itemID, update)
		if err != nil {
			return nil, fmt.Errorf("failed to update item: %w", err)
		}
	}

	// Get updated item
	updatedItem, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated item: %w", err)
	}

	return s.toItemResponse(updatedItem), nil
}

// Delete deletes an item
func (s *ItemService) Delete(ctx context.Context, userID, itemID primitive.ObjectID) error {
	// Get item and check permissions
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return fmt.Errorf("failed to get item: %w", err)
	}

	// Check if user has access to the board
	board, err := s.boardRepo.GetByID(ctx, item.BoardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has access to the workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsMember(userID) {
		return fmt.Errorf("access denied: user is not a member of the workspace containing this item")
	}

	// Delete the item
	_, err = s.itemRepo.Delete(ctx, itemID)
	if err != nil {
		return fmt.Errorf("failed to delete item: %w", err)
	}

	return nil
}

// GetByAssignee retrieves items assigned to a user
func (s *ItemService) GetByAssignee(ctx context.Context, userID primitive.ObjectID) ([]*ItemResponse, error) {
	items, err := s.itemRepo.GetByAssignee(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get items by assignee: %w", err)
	}

	var accessibleItems []*ItemResponse
	for _, itm := range items {
		// Check board access
		board, err := s.boardRepo.GetByID(ctx, itm.BoardID)
		if err != nil {
			continue
		}
		workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
		if err != nil {
			continue
		}
		if workspace.IsMember(userID) {
			accessibleItems = append(accessibleItems, s.toItemResponse(itm))
		}
	}

	return accessibleItems, nil
}

// Move moves an item to a new position within its board and reorders others
type MoveItemRequest struct {
	Position int `json:"position" validate:"min=0"`
}

func (s *ItemService) Move(ctx context.Context, userID, itemID primitive.ObjectID, req MoveItemRequest) (*ItemResponse, error) {
	// Fetch item and check permissions
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}
	// access check
	board, err := s.boardRepo.GetByID(ctx, item.BoardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}
	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of the workspace containing this item")
	}
	// Get all items for board
	items, err := s.itemRepo.GetByBoardID(ctx, item.BoardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get items for board: %w", err)
	}
	// Ensure req.Position within bounds
	if req.Position < 0 {
		return nil, fmt.Errorf("position must be non-negative")
	}
	count := len(items)
	if req.Position > count-1 {
		req.Position = count - 1
	}
	// Build new order
	var reordered []*models.Item
	// Remove target
	for _, it := range items {
		if it.ID != itemID {
			reordered = append(reordered, it)
		}
	}
	// Insert at new position
	idx := req.Position
	if idx > len(reordered) {
		idx = len(reordered)
	}
	reordered = append(reordered[:idx], append([]*models.Item{item}, reordered[idx:]...)...)
	// Update positions
	for i, it := range reordered {
		err = s.itemRepo.UpdatePosition(ctx, it.ID, i)
		if err != nil {
			return nil, fmt.Errorf("failed to update position for item %s: %w", it.ID.Hex(), err)
		}
		if it.ID == itemID {
			item.Position = i
		}
	}
	return s.toItemResponse(item), nil
}

// toItemResponse converts an item model to response format
func (s *ItemService) toItemResponse(item *models.Item) *ItemResponse {
	// Convert field values to map
	fieldValues := make(map[string]interface{})
	for _, fv := range item.FieldValues {
		fieldValues[fv.ColumnID] = fv.Value
	}

	// Convert assignees to string array
	assignees := make([]string, len(item.Assignees))
	for i, assignee := range item.Assignees {
		assignees[i] = assignee.Hex()
	}

	// Convert watchers to string array
	watchers := make([]string, len(item.Watchers))
	for i, watcher := range item.Watchers {
		watchers[i] = watcher.Hex()
	}

	return &ItemResponse{
		ID:          item.ID.Hex(),
		Name:        item.Name,
		BoardID:     item.BoardID.Hex(),
		Position:    item.Position,
		FieldValues: fieldValues,
		Assignees:   assignees,
		Watchers:    watchers,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
		CreatedBy:   item.CreatedBy.Hex(),
	}
}

// ItemToResponse converts a models.Item to an ItemResponse
func ItemToResponse(item *models.Item) *ItemResponse {
	if item == nil {
		return nil
	}

	// Convert field values to map
	fieldValues := make(map[string]interface{})
	for _, fv := range item.FieldValues {
		fieldValues[fv.ColumnID] = fv.Value
	}

	return &ItemResponse{
		ID:          item.ID.Hex(),
		Name:        item.Name,
		BoardID:     item.BoardID.Hex(),
		Position:    item.Position,
		FieldValues: fieldValues,
		Assignees:   toStringSlice(item.Assignees),
		Watchers:    toStringSlice(item.Watchers),
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
		CreatedBy:   item.CreatedBy.Hex(),
	}
}

// toStringSlice converts a slice of primitive.ObjectID to a slice of strings
func toStringSlice(ids []primitive.ObjectID) []string {
	result := make([]string, len(ids))
	for i, id := range ids {
		result[i] = id.Hex()
	}
	return result
}
