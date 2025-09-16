package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
)

func TestBoardService_toBoardResponse(t *testing.T) {
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()
	board := models.NewBoard("Test Board", "Test Description", workspaceID, userID)
	board.Color = "#FF0000"

	service := NewBoardService(nil, nil, nil)
	response := service.toBoardResponse(board)

	assert.Equal(t, board.ID.Hex(), response.ID)
	assert.Equal(t, board.Name, response.Name)
	assert.Equal(t, board.Description, response.Description)
	assert.Equal(t, board.WorkspaceID.Hex(), response.WorkspaceID)
	assert.Equal(t, board.Color, response.Color)
	assert.Equal(t, board.Columns, response.Columns)
	assert.Equal(t, board.Settings, response.Settings)
	assert.Equal(t, board.CreatedAt, response.CreatedAt)
	assert.Equal(t, board.UpdatedAt, response.UpdatedAt)
	assert.Equal(t, board.CreatedBy.Hex(), response.CreatedBy)
}

func TestBoardService_isValidColumnType(t *testing.T) {
	tests := []struct {
		columnType string
		valid      bool
	}{
		{models.ColumnTypeText, true},
		{models.ColumnTypeStatus, true},
		{models.ColumnTypeDate, true},
		{models.ColumnTypeNumber, true},
		{models.ColumnTypePerson, true},
		{"invalid_type", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.columnType, func(t *testing.T) {
			result := isValidColumnType(tt.columnType)
			assert.Equal(t, tt.valid, result)
		})
	}
}

func TestAddColumnRequest_Validation(t *testing.T) {
	tests := []struct {
		name    string
		request AddColumnRequest
		valid   bool
	}{
		{
			name: "valid request",
			request: AddColumnRequest{
				Name: "Test Column",
				Type: models.ColumnTypeText,
			},
			valid: true,
		},
		{
			name: "empty name should be invalid",
			request: AddColumnRequest{
				Name: "",
				Type: models.ColumnTypeText,
			},
			valid: false,
		},
		{
			name: "invalid type should be invalid",
			request: AddColumnRequest{
				Name: "Test Column",
				Type: "invalid_type",
			},
			valid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test column type validation
			typeValid := isValidColumnType(tt.request.Type)
			nameValid := tt.request.Name != ""
			
			if tt.valid {
				assert.True(t, typeValid && nameValid)
			} else {
				assert.False(t, typeValid && nameValid)
			}
		})
	}
}