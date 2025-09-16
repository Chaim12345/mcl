package services

import (
	"context"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository/mocks"
)

func TestItemService_ValidateCreateItemRequest(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()
	assigneeID := primitive.NewObjectID()

	// Setup mock repositories
	itemRepo := &mocks.ItemRepository{}
	boardRepo := &mocks.BoardRepository{}
	workspaceRepo := &mocks.WorkspaceRepository{}
	
	// Setup board with columns for validation
	columns := []models.BoardColumn{
		{
			ID:       "title",
			Name:     "Title",
			Type:     "text",
			Settings: map[string]interface{}{"maxLength": 100.0},
		},
		{
			ID:       "description",
			Name:     "Description",
			Type:     "text",
			Settings: map[string]interface{}{"maxLength": 500.0},
		},
		{
			ID:       "priority",
			Name:     "Priority",
			Type:     "status",
			Settings: map[string]interface{}{"options": []interface{}{"Low", "Medium", "High"}},
		},
		{
			ID:       "dueDate",
			Name:     "Due Date",
			Type:     "date",
			Settings: nil,
		},
		{
			ID:       "assignees",
			Name:     "Assignees",
			Type:     "person",
			Settings: nil,
		},
	}

	board := &models.Board{
		ID:          boardID,
		Name:        "Test Board",
		WorkspaceID: workspaceID,
		Columns:     columns,
	}

	workspace := &models.Workspace{
		ID:      workspaceID,
		Name:    "Test Workspace",
		Members: []primitive.ObjectID{userID, assigneeID},
	}

	// Setup mocks
	boardRepo.On("GetByID", context.TODO(), boardID).Return(board, nil)
	workspaceRepo.On("GetByID", context.TODO(), workspaceID).Return(workspace, nil)
	itemRepo.On("Count", context.TODO(), mock.Anything).Return(int64(0), nil)
	itemRepo.On("Create", context.TODO(), mock.Anything).Return(&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil)

	service := NewItemService(itemRepo, boardRepo, workspaceRepo)

	tests := []struct {
		name    string
		req     CreateItemRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid create request",
			req: CreateItemRequest{
				Name:        "Test Item",
				Description: "Test description",
				Priority:    "High",
				DueDate:     stringPtr("2023-12-25"),
				Assignees:   []string{assigneeID.Hex()},
				FieldValues: map[string]interface{}{
					"title": "Valid Title",
				},
			},
			wantErr: false,
		},
		{
			name: "invalid priority value",
			req: CreateItemRequest{
				Name:     "Test Item",
				Priority: "InvalidPriority",
			},
			wantErr: true,
			errMsg:  "invalid priority: InvalidPriority",
		},
		{
			name: "invalid due date format",
			req: CreateItemRequest{
				Name:    "Test Item",
				DueDate: stringPtr("invalid-date"),
			},
			wantErr: true,
			errMsg:  "invalid due date format",
		},
		{
			name: "invalid assignee ID",
			req: CreateItemRequest{
				Name:      "Test Item",
				Assignees: []string{"invalid-object-id"},
			},
			wantErr: true,
			errMsg:  "invalid assignee ID",
		},
		{
			name: "assignee not in workspace",
			req: CreateItemRequest{
				Name:      "Test Item",
				Assignees: []string{primitive.NewObjectID().Hex()},
			},
			wantErr: true,
			errMsg:  "is not a member of the workspace",
		},
		{
			name: "invalid field value type",
			req: CreateItemRequest{
				Name: "Test Item",
				FieldValues: map[string]interface{}{
					"priority": 123, // Should be string for status type
				},
			},
			wantErr: true,
			errMsg:  "validation failed",
		},
		{
			name: "non-existent column in field values",
			req: CreateItemRequest{
				Name: "Test Item",
				FieldValues: map[string]interface{}{
					"nonexistent": "value",
				},
			},
			wantErr: true,
			errMsg:  "not found in board",
		},
		{
			name: "empty name/title",
			req: CreateItemRequest{
				Name:  "",
				Title: "",
			},
			wantErr: true,
			errMsg:  "item name or title is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.Create(context.TODO(), userID, boardID, tt.req)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestItemService_ValidateUpdateItemRequest(t *testing.T) {
	userID := primitive.NewObjectID()
	itemID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()
	assigneeID := primitive.NewObjectID()

	// Setup mock repositories
	itemRepo := &mocks.ItemRepository{}
	boardRepo := &mocks.BoardRepository{}
	workspaceRepo := &mocks.WorkspaceRepository{}
	
	// Setup item
	item := &models.Item{
		ID:       itemID,
		Name:     "Test Item",
		BoardID:  boardID,
		Position: 0,
	}

	// Setup board with columns
	columns := []models.BoardColumn{
		{
			ID:       "title",
			Name:     "Title",
			Type:     "text",
			Settings: map[string]interface{}{"maxLength": 100.0},
		},
		{
			ID:       "priority",
			Name:     "Priority",
			Type:     "status",
			Settings: map[string]interface{}{"options": []interface{}{"Low", "Medium", "High"}},
		},
	}

	board := &models.Board{
		ID:          boardID,
		Name:        "Test Board",
		WorkspaceID: workspaceID,
		Columns:     columns,
	}

	workspace := &models.Workspace{
		ID:      workspaceID,
		Name:    "Test Workspace",
		Members: []primitive.ObjectID{userID, assigneeID},
	}

	// Setup mocks
	itemRepo.On("GetByID", context.TODO(), itemID).Return(item, nil)
	boardRepo.On("GetByID", context.TODO(), boardID).Return(board, nil)
	workspaceRepo.On("GetByID", context.TODO(), workspaceID).Return(workspace, nil)
	itemRepo.On("UpdateFieldValue", context.TODO(), itemID, mock.Anything).Return(nil)
	itemRepo.On("Update", context.TODO(), itemID, mock.Anything).Return(&mongo.UpdateResult{MatchedCount: 1}, nil)

	service := NewItemService(itemRepo, boardRepo, workspaceRepo)

	tests := []struct {
		name    string
		req     UpdateItemRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid update request",
			req: UpdateItemRequest{
				Name: stringPtr("Updated Title"),
				FieldValues: map[string]interface{}{
					"title": "Updated Title",
				},
				Assignees: []string{assigneeID.Hex()},
			},
			wantErr: false,
		},
		{
			name: "invalid field value",
			req: UpdateItemRequest{
				FieldValues: map[string]interface{}{
					"priority": 123, // Should be string
				},
			},
			wantErr: true,
			errMsg:  "validation failed",
		},
		{
			name: "empty name",
			req: UpdateItemRequest{
				Name: stringPtr(""),
			},
			wantErr: true,
			errMsg:  "item name cannot be empty",
		},
		{
			name: "negative position",
			req: UpdateItemRequest{
				Position: intPtr(-1),
			},
			wantErr: true,
			errMsg:  "position must be non-negative",
		},
		{
			name: "invalid assignee ID",
			req: UpdateItemRequest{
				Assignees: []string{"invalid-object-id"},
			},
			wantErr: true,
			errMsg:  "invalid assignee ID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.Update(context.TODO(), userID, itemID, tt.req)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				} else if !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

// Mock setup (simplified)
type mock struct {
	mock.Mock
}

func (m *mock) On(methodName string, arguments ...interface{}) *mock.Call {
	return m.Mock.On(methodName, arguments...)
}

func (m *mock) Return(returnArguments ...interface{}) *mock.Call {
	return m.Mock.Return(returnArguments...)
}

// Simplified mock setup for context
func mockSetup() {
	// This would normally be more sophisticated with proper mocking
}