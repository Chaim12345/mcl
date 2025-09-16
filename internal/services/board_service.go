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

// BoardService handles board business logic
type BoardService struct {
	boardRepo     repository.BoardRepository
	workspaceRepo repository.WorkspaceRepository
	userRepo      repository.UserRepository
}

// NewBoardService creates a new board service
func NewBoardService(boardRepo repository.BoardRepository, workspaceRepo repository.WorkspaceRepository, userRepo repository.UserRepository) *BoardService {
	return &BoardService{
		boardRepo:     boardRepo,
		workspaceRepo: workspaceRepo,
		userRepo:      userRepo,
	}
}

// CreateBoardRequest represents a board creation request
type CreateBoardRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description,omitempty" validate:"max=500"`
	Color       string `json:"color,omitempty"`
}

// UpdateBoardRequest represents a board update request
type UpdateBoardRequest struct {
	Name        *string               `json:"name,omitempty" validate:"omitempty,min=1,max=100"`
	Description *string               `json:"description,omitempty" validate:"omitempty,max=500"`
	Color       *string               `json:"color,omitempty"`
	Settings    *models.BoardSettings `json:"settings,omitempty"`
}

// BoardResponse represents a board response
type BoardResponse struct {
	ID          string               `json:"id"`
	Name        string               `json:"name"`
	Description string               `json:"description,omitempty"`
	WorkspaceID string               `json:"workspaceId"`
	Color       string               `json:"color,omitempty"`
	Columns     []models.BoardColumn `json:"columns"`
	Settings    models.BoardSettings `json:"settings"`
	CreatedAt   time.Time            `json:"createdAt"`
	UpdatedAt   time.Time            `json:"updatedAt"`
	CreatedBy   string               `json:"createdBy"`
}

// Create creates a new board within a workspace
func (s *BoardService) Create(ctx context.Context, userID, workspaceID primitive.ObjectID, req CreateBoardRequest) (*BoardResponse, error) {
	// Validate workspace exists and user has access
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	// Check if user is a member of the workspace
	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of this workspace")
	}

	// Create board
	board := models.NewBoard(req.Name, req.Description, workspaceID, userID)
	if req.Color != "" {
		board.Color = req.Color
	}

	// Validate board
	if err := board.Validate(); err != nil {
		return nil, fmt.Errorf("board validation failed: %w", err)
	}

	result, err := s.boardRepo.Create(ctx, board)
	if err != nil {
		return nil, fmt.Errorf("failed to create board: %w", err)
	}

	// Set the ID from the insert result
	board.ID = result.InsertedID.(primitive.ObjectID)

	return s.toBoardResponse(board), nil
}

// GetByID retrieves a board by ID with access control
func (s *BoardService) GetByID(ctx context.Context, userID, boardID primitive.ObjectID) (*BoardResponse, error) {
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

	return s.toBoardResponse(board), nil
}

// GetByWorkspaceID retrieves all boards in a workspace
func (s *BoardService) GetByWorkspaceID(ctx context.Context, userID, workspaceID primitive.ObjectID) ([]*BoardResponse, error) {
	// Check if user has access to the workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsMember(userID) {
		return nil, fmt.Errorf("access denied: user is not a member of this workspace")
	}

	boards, err := s.boardRepo.GetByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get boards: %w", err)
	}

	responses := make([]*BoardResponse, len(boards))
	for i, board := range boards {
		responses[i] = s.toBoardResponse(board)
	}

	return responses, nil
}

// Update updates a board
func (s *BoardService) Update(ctx context.Context, userID, boardID primitive.ObjectID, req UpdateBoardRequest) (*BoardResponse, error) {
	// Get board and check permissions
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

	// Build update document
	update := bson.M{}

	if req.Name != nil {
		if *req.Name == "" {
			return nil, fmt.Errorf("board name cannot be empty")
		}
		update["name"] = *req.Name
	}

	if req.Description != nil {
		update["description"] = *req.Description
	}

	if req.Color != nil {
		update["color"] = *req.Color
	}

	if req.Settings != nil {
		update["settings"] = *req.Settings
	}

	// Always update the updatedAt timestamp
	update["updatedAt"] = time.Now()

	// Perform update
	_, err = s.boardRepo.Update(ctx, boardID, update)
	if err != nil {
		return nil, fmt.Errorf("failed to update board: %w", err)
	}

	// Get updated board
	updatedBoard, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated board: %w", err)
	}

	return s.toBoardResponse(updatedBoard), nil
}

// Delete deletes a board and all associated data
func (s *BoardService) Delete(ctx context.Context, userID, boardID primitive.ObjectID) error {
	// Get board and check permissions
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has access to the workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	// Only workspace admins or board creator can delete boards
	if !workspace.IsAdmin(userID) && board.CreatedBy != userID {
		return fmt.Errorf("access denied: only workspace admins or board creator can delete boards")
	}

	// Delete the board
	_, err = s.boardRepo.Delete(ctx, boardID)
	if err != nil {
		return fmt.Errorf("failed to delete board: %w", err)
	}

	return nil
}

// toBoardResponse converts a board model to response format
func (s *BoardService) toBoardResponse(board *models.Board) *BoardResponse {
	return &BoardResponse{
		ID:          board.ID.Hex(),
		Name:        board.Name,
		Description: board.Description,
		WorkspaceID: board.WorkspaceID.Hex(),
		Color:       board.Color,
		Columns:     board.Columns,
		Settings:    board.Settings,
		CreatedAt:   board.CreatedAt,
		UpdatedAt:   board.UpdatedAt,
		CreatedBy:   board.CreatedBy.Hex(),
	}
}

// Column management methods

// AddColumnRequest represents a request to add a column to a board
type AddColumnRequest struct {
	Name     string                 `json:"name" validate:"required,min=1,max=50"`
	Type     string                 `json:"type" validate:"required,oneof=text status date number person"`
	Settings map[string]interface{} `json:"settings,omitempty"`
}

// UpdateColumnRequest represents a request to update a column
type UpdateColumnRequest struct {
	Name     *string                `json:"name,omitempty" validate:"omitempty,min=1,max=50"`
	Type     *string                `json:"type,omitempty" validate:"omitempty,oneof=text status date number person"`
	Settings map[string]interface{} `json:"settings,omitempty"`
}

// ReorderColumnsRequest represents a request to reorder columns
type ReorderColumnsRequest struct {
	ColumnOrder []string `json:"columnOrder" validate:"required"`
}

// AddColumn adds a new column to a board
func (s *BoardService) AddColumn(ctx context.Context, userID, boardID primitive.ObjectID, req AddColumnRequest) (*BoardResponse, error) {
	// Get board and check permissions
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

	// Create new column
	newColumn := models.BoardColumn{
		ID:       "col_" + primitive.NewObjectID().Hex(),
		Name:     req.Name,
		Type:     req.Type,
		Settings: req.Settings,
		Position: len(board.Columns), // Add at the end
	}

	// Add column to repository
	err = s.boardRepo.AddColumn(ctx, boardID, newColumn)
	if err != nil {
		return nil, fmt.Errorf("failed to add column: %w", err)
	}

	// Get updated board
	updatedBoard, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated board: %w", err)
	}

	return s.toBoardResponse(updatedBoard), nil
}

// RemoveColumn removes a column from a board
func (s *BoardService) RemoveColumn(ctx context.Context, userID, boardID primitive.ObjectID, columnID string) (*BoardResponse, error) {
	// Get board and check permissions
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

	// Check if column exists
	columnExists := false
	for _, col := range board.Columns {
		if col.ID == columnID {
			columnExists = true
			break
		}
	}

	if !columnExists {
		return nil, fmt.Errorf("column not found: %s", columnID)
	}

	// Prevent removing the last column
	if len(board.Columns) <= 1 {
		return nil, fmt.Errorf("cannot remove the last column from a board")
	}

	// Remove column from repository
	err = s.boardRepo.RemoveColumn(ctx, boardID, columnID)
	if err != nil {
		return nil, fmt.Errorf("failed to remove column: %w", err)
	}

	// Get updated board
	updatedBoard, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated board: %w", err)
	}

	return s.toBoardResponse(updatedBoard), nil
}

// UpdateColumn updates a column in a board
func (s *BoardService) UpdateColumn(ctx context.Context, userID, boardID primitive.ObjectID, columnID string, req UpdateColumnRequest) (*BoardResponse, error) {
	// Get board and check permissions
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

	// Find the column to update
	columnIndex := -1
	for i, col := range board.Columns {
		if col.ID == columnID {
			columnIndex = i
			break
		}
	}

	if columnIndex == -1 {
		return nil, fmt.Errorf("column not found: %s", columnID)
	}

	// Update column fields
	if req.Name != nil {
		if *req.Name == "" {
			return nil, fmt.Errorf("column name cannot be empty")
		}
		board.Columns[columnIndex].Name = *req.Name
	}

	if req.Type != nil {
		if !isValidColumnType(*req.Type) {
			return nil, fmt.Errorf("invalid column type: %s", *req.Type)
		}
		board.Columns[columnIndex].Type = *req.Type
	}

	if req.Settings != nil {
		board.Columns[columnIndex].Settings = req.Settings
	}

	// Update column in repository
	err = s.boardRepo.UpdateColumn(ctx, boardID, columnID, board.Columns[columnIndex])
	if err != nil {
		return nil, fmt.Errorf("failed to update column: %w", err)
	}

	// Get updated board
	updatedBoard, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated board: %w", err)
	}

	return s.toBoardResponse(updatedBoard), nil
}

// ReorderColumns reorders columns in a board
func (s *BoardService) ReorderColumns(ctx context.Context, userID, boardID primitive.ObjectID, req ReorderColumnsRequest) (*BoardResponse, error) {
	// Get board and check permissions
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

	// Validate that all column IDs exist and count matches
	if len(req.ColumnOrder) != len(board.Columns) {
		return nil, fmt.Errorf("column order count mismatch: expected %d, got %d", len(board.Columns), len(req.ColumnOrder))
	}

	// Create a map of existing columns
	columnMap := make(map[string]models.BoardColumn)
	for _, col := range board.Columns {
		columnMap[col.ID] = col
	}

	// Validate all column IDs exist
	for _, colID := range req.ColumnOrder {
		if _, exists := columnMap[colID]; !exists {
			return nil, fmt.Errorf("column not found: %s", colID)
		}
	}

	// Reorder columns
	reorderedColumns := make([]models.BoardColumn, len(req.ColumnOrder))
	for i, colID := range req.ColumnOrder {
		col := columnMap[colID]
		col.Position = i
		reorderedColumns[i] = col
	}

	// Update columns in repository
	err = s.boardRepo.ReorderColumns(ctx, boardID, reorderedColumns)
	if err != nil {
		return nil, fmt.Errorf("failed to reorder columns: %w", err)
	}

	// Get updated board
	updatedBoard, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated board: %w", err)
	}

	return s.toBoardResponse(updatedBoard), nil
}

// Board sharing and permissions types
type ShareBoardRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Permission string `json:"permission" validate:"required,oneof=view edit admin"`
}

type ShareBoardResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	UserID  string `json:"userId,omitempty"`
}

type UpdatePermissionsRequest struct {
	UserID     string `json:"userId" validate:"required"`
	Permission string `json:"permission" validate:"required,oneof=view edit admin"`
}

type PermissionsResponse struct {
	BoardID     string                   `json:"boardId"`
	Permissions []models.BoardPermission `json:"permissions"`
}

// ShareBoard shares a board with a user by email
func (s *BoardService) ShareBoard(ctx context.Context, userID, boardID primitive.ObjectID, req ShareBoardRequest) (*ShareBoardResponse, error) {
	// Get board and check permissions
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has admin access to the workspace or is board creator
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsAdmin(userID) && board.CreatedBy != userID {
		return nil, fmt.Errorf("access denied: only workspace admins or board creator can share boards")
	}

	// Find user by email
	targetUser, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return &ShareBoardResponse{
			Success: false,
			Message: "User not found with this email address",
		}, nil
	}

	// Check if user is already a workspace member
	if !workspace.IsMember(targetUser.ID) {
		return &ShareBoardResponse{
			Success: false,
			Message: "User must be a workspace member before sharing boards",
		}, nil
	}

	// Add or update board permission
	permission := models.BoardPermission{
		UserID:     targetUser.ID,
		Permission: req.Permission,
		GrantedBy:  userID,
		GrantedAt:  time.Now(),
	}

	err = s.boardRepo.UpdatePermission(ctx, boardID, permission)
	if err != nil {
		return nil, fmt.Errorf("failed to update board permission: %w", err)
	}

	return &ShareBoardResponse{
		Success: true,
		Message: fmt.Sprintf("Board shared with %s successfully", req.Email),
		UserID:  targetUser.ID.Hex(),
	}, nil
}

// UpdatePermissions updates a user's permissions for a board
func (s *BoardService) UpdatePermissions(ctx context.Context, userID, boardID primitive.ObjectID, req UpdatePermissionsRequest) (*BoardResponse, error) {
	// Get board and check permissions
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	// Check if user has admin access to the workspace or is board creator
	workspace, err := s.workspaceRepo.GetByID(ctx, board.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	if !workspace.IsAdmin(userID) && board.CreatedBy != userID {
		return nil, fmt.Errorf("access denied: only workspace admins or board creator can update permissions")
	}

	// Parse target user ID
	targetUserID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Update permission
	permission := models.BoardPermission{
		UserID:     targetUserID,
		Permission: req.Permission,
		GrantedBy:  userID,
		GrantedAt:  time.Now(),
	}

	err = s.boardRepo.UpdatePermission(ctx, boardID, permission)
	if err != nil {
		return nil, fmt.Errorf("failed to update board permission: %w", err)
	}

	// Get updated board
	updatedBoard, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated board: %w", err)
	}

	return s.toBoardResponse(updatedBoard), nil
}

// GetPermissions retrieves all permissions for a board
func (s *BoardService) GetPermissions(ctx context.Context, userID, boardID primitive.ObjectID) (*PermissionsResponse, error) {
	// Get board and check permissions
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

	// Get board permissions
	permissions, err := s.boardRepo.GetPermissions(ctx, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get board permissions: %w", err)
	}

	return &PermissionsResponse{
		BoardID:     boardID.Hex(),
		Permissions: permissions,
	}, nil
}

// isValidColumnType checks if the column type is valid
func isValidColumnType(columnType string) bool {
	validTypes := []string{
		"text",
		"status",
		"date",
		"number",
		"person",
	}

	for _, validType := range validTypes {
		if columnType == validType {
			return true
		}
	}
	return false
}
