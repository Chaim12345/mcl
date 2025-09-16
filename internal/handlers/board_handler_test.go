package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// MockBoardService for testing - implements the same methods as BoardService
type MockBoardService struct {
	createFunc            func(ctx context.Context, userID, workspaceID primitive.ObjectID, req services.CreateBoardRequest) (*services.BoardResponse, error)
	getByIDFunc           func(ctx context.Context, userID, boardID primitive.ObjectID) (*services.BoardResponse, error)
	getByWorkspaceIDFunc  func(ctx context.Context, userID, workspaceID primitive.ObjectID) ([]*services.BoardResponse, error)
	updateFunc            func(ctx context.Context, userID, boardID primitive.ObjectID, req services.UpdateBoardRequest) (*services.BoardResponse, error)
	deleteFunc            func(ctx context.Context, userID, boardID primitive.ObjectID) error
	addColumnFunc         func(ctx context.Context, userID, boardID primitive.ObjectID, req services.AddColumnRequest) (*services.BoardResponse, error)
	updateColumnFunc      func(ctx context.Context, userID, boardID primitive.ObjectID, columnID string, req services.UpdateColumnRequest) (*services.BoardResponse, error)
	removeColumnFunc      func(ctx context.Context, userID, boardID primitive.ObjectID, columnID string) (*services.BoardResponse, error)
	reorderColumnsFunc    func(ctx context.Context, userID, boardID primitive.ObjectID, req services.ReorderColumnsRequest) (*services.BoardResponse, error)
	shareBoardFunc        func(ctx context.Context, userID, boardID primitive.ObjectID, req services.ShareBoardRequest) (*services.ShareBoardResponse, error)
	updatePermissionsFunc func(ctx context.Context, userID, boardID primitive.ObjectID, req services.UpdatePermissionsRequest) (*services.BoardResponse, error)
	getPermissionsFunc    func(ctx context.Context, userID, boardID primitive.ObjectID) (*services.PermissionsResponse, error)
}

func (m *MockBoardService) Create(ctx context.Context, userID, workspaceID primitive.ObjectID, req services.CreateBoardRequest) (*services.BoardResponse, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, userID, workspaceID, req)
	}
	return nil, nil
}

func (m *MockBoardService) GetByID(ctx context.Context, userID, boardID primitive.ObjectID) (*services.BoardResponse, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, userID, boardID)
	}
	return nil, nil
}

func (m *MockBoardService) GetByWorkspaceID(ctx context.Context, userID, workspaceID primitive.ObjectID) ([]*services.BoardResponse, error) {
	if m.getByWorkspaceIDFunc != nil {
		return m.getByWorkspaceIDFunc(ctx, userID, workspaceID)
	}
	return nil, nil
}

func (m *MockBoardService) Update(ctx context.Context, userID, boardID primitive.ObjectID, req services.UpdateBoardRequest) (*services.BoardResponse, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, userID, boardID, req)
	}
	return nil, nil
}

func (m *MockBoardService) Delete(ctx context.Context, userID, boardID primitive.ObjectID) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, userID, boardID)
	}
	return nil
}

func (m *MockBoardService) AddColumn(ctx context.Context, userID, boardID primitive.ObjectID, req services.AddColumnRequest) (*services.BoardResponse, error) {
	if m.addColumnFunc != nil {
		return m.addColumnFunc(ctx, userID, boardID, req)
	}
	return nil, nil
}

func (m *MockBoardService) UpdateColumn(ctx context.Context, userID, boardID primitive.ObjectID, columnID string, req services.UpdateColumnRequest) (*services.BoardResponse, error) {
	if m.updateColumnFunc != nil {
		return m.updateColumnFunc(ctx, userID, boardID, columnID, req)
	}
	return nil, nil
}

func (m *MockBoardService) RemoveColumn(ctx context.Context, userID, boardID primitive.ObjectID, columnID string) (*services.BoardResponse, error) {
	if m.removeColumnFunc != nil {
		return m.removeColumnFunc(ctx, userID, boardID, columnID)
	}
	return nil, nil
}

func (m *MockBoardService) ReorderColumns(ctx context.Context, userID, boardID primitive.ObjectID, req services.ReorderColumnsRequest) (*services.BoardResponse, error) {
	if m.reorderColumnsFunc != nil {
		return m.reorderColumnsFunc(ctx, userID, boardID, req)
	}
	return nil, nil
}

func (m *MockBoardService) ShareBoard(ctx context.Context, userID, boardID primitive.ObjectID, req services.ShareBoardRequest) (*services.ShareBoardResponse, error) {
	if m.shareBoardFunc != nil {
		return m.shareBoardFunc(ctx, userID, boardID, req)
	}
	return &services.ShareBoardResponse{Success: true, Message: "Board shared successfully"}, nil
}

func (m *MockBoardService) UpdatePermissions(ctx context.Context, userID, boardID primitive.ObjectID, req services.UpdatePermissionsRequest) (*services.BoardResponse, error) {
	if m.updatePermissionsFunc != nil {
		return m.updatePermissionsFunc(ctx, userID, boardID, req)
	}
	return nil, nil
}

func (m *MockBoardService) GetPermissions(ctx context.Context, userID, boardID primitive.ObjectID) (*services.PermissionsResponse, error) {
	if m.getPermissionsFunc != nil {
		return m.getPermissionsFunc(ctx, userID, boardID)
	}
	return &services.PermissionsResponse{BoardID: boardID.Hex(), Permissions: []models.BoardPermission{}}, nil
}

// setupBoardTestRouter creates a test router with the board handler
func setupBoardTestRouter(handler *BoardHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Register board routes
	router.POST("/api/workspaces/:workspaceId/boards", handler.CreateBoard)
	router.GET("/api/boards/:boardId", handler.GetBoard)
	router.GET("/api/workspaces/:workspaceId/boards", handler.GetWorkspaceBoards)
	router.PUT("/api/boards/:boardId", handler.UpdateBoard)
	router.DELETE("/api/boards/:boardId", handler.DeleteBoard)
	router.POST("/api/boards/:boardId/columns", handler.AddColumn)
	router.DELETE("/api/boards/:boardId/columns/:columnId", handler.RemoveColumn)

	return router
}

func TestBoardHandler_CreateBoard(t *testing.T) {
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	mockService := &MockBoardService{
		createFunc: func(ctx context.Context, uid, wid primitive.ObjectID, req services.CreateBoardRequest) (*services.BoardResponse, error) {
			assert.Equal(t, userID, uid)
			assert.Equal(t, workspaceID, wid)
			assert.Equal(t, "Test Board", req.Name)

			return &services.BoardResponse{
				ID:          primitive.NewObjectID().Hex(),
				Name:        req.Name,
				Description: req.Description,
				WorkspaceID: wid.Hex(),
			}, nil
		},
	}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	// Create test request
	reqBody := services.CreateBoardRequest{
		Name:        "Test Board",
		Description: "Test Description",
	}
	jsonBody, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/workspaces/"+workspaceID.Hex()+"/boards", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "data")
}

func TestBoardHandler_GetBoard(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	mockService := &MockBoardService{
		getByIDFunc: func(ctx context.Context, uid, bid primitive.ObjectID) (*services.BoardResponse, error) {
			assert.Equal(t, userID, uid)
			assert.Equal(t, boardID, bid)

			return &services.BoardResponse{
				ID:   bid.Hex(),
				Name: "Test Board",
			}, nil
		},
	}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/boards/"+boardID.Hex(), nil)

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "data")
}

func TestBoardHandler_InvalidBoardID(t *testing.T) {
	mockService := &MockBoardService{}
	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/boards/invalid-id", nil)

	// Add authenticated user context to bypass auth check
	userID := primitive.NewObjectID()
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, false, response["success"])
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "Invalid board ID", errorObj["message"])
}

func TestBoardHandler_MissingUserID(t *testing.T) {
	mockService := &MockBoardService{}
	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	boardID := primitive.NewObjectID()

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/boards/"+boardID.Hex(), nil)
	// Don't set userID in context

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, false, response["success"])
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "User not authenticated", errorObj["message"])
}
func TestBoardHandler_GetWorkspaceBoards(t *testing.T) {
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	mockService := &MockBoardService{
		getByWorkspaceIDFunc: func(ctx context.Context, uid, wid primitive.ObjectID) ([]*services.BoardResponse, error) {
			assert.Equal(t, userID, uid)
			assert.Equal(t, workspaceID, wid)

			return []*services.BoardResponse{
				{
					ID:          primitive.NewObjectID().Hex(),
					Name:        "Board 1",
					WorkspaceID: wid.Hex(),
				},
				{
					ID:          primitive.NewObjectID().Hex(),
					Name:        "Board 2",
					WorkspaceID: wid.Hex(),
				},
			}, nil
		},
	}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/workspaces/"+workspaceID.Hex()+"/boards", nil)

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "data")

	// Check that we got an array of boards
	data := response["data"].([]interface{})
	assert.Len(t, data, 2)
}

func TestBoardHandler_UpdateBoard(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	mockService := &MockBoardService{
		updateFunc: func(ctx context.Context, uid, bid primitive.ObjectID, req services.UpdateBoardRequest) (*services.BoardResponse, error) {
			assert.Equal(t, userID, uid)
			assert.Equal(t, boardID, bid)
			assert.Equal(t, "Updated Board", *req.Name)

			return &services.BoardResponse{
				ID:   bid.Hex(),
				Name: *req.Name,
			}, nil
		},
	}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	// Create test request
	name := "Updated Board"
	reqBody := services.UpdateBoardRequest{
		Name: &name,
	}
	jsonBody, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("PUT", "/api/boards/"+boardID.Hex(), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "data")
}

func TestBoardHandler_DeleteBoard(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	mockService := &MockBoardService{
		deleteFunc: func(ctx context.Context, uid, bid primitive.ObjectID) error {
			assert.Equal(t, userID, uid)
			assert.Equal(t, boardID, bid)
			return nil
		},
	}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("DELETE", "/api/boards/"+boardID.Hex(), nil)

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestBoardHandler_AddColumn(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	mockService := &MockBoardService{
		addColumnFunc: func(ctx context.Context, uid, bid primitive.ObjectID, req services.AddColumnRequest) (*services.BoardResponse, error) {
			assert.Equal(t, userID, uid)
			assert.Equal(t, boardID, bid)
			assert.Equal(t, "New Column", req.Name)
			assert.Equal(t, "text", req.Type)

			return &services.BoardResponse{
				ID:   bid.Hex(),
				Name: "Test Board",
			}, nil
		},
	}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	// Create test request
	reqBody := services.AddColumnRequest{
		Name: "New Column",
		Type: "text",
	}
	jsonBody, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/boards/"+boardID.Hex()+"/columns", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "data")
}

func TestBoardHandler_RemoveColumn(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()
	columnID := "col_123"

	mockService := &MockBoardService{
		removeColumnFunc: func(ctx context.Context, uid, bid primitive.ObjectID, cid string) (*services.BoardResponse, error) {
			assert.Equal(t, userID, uid)
			assert.Equal(t, boardID, bid)
			assert.Equal(t, columnID, cid)

			return &services.BoardResponse{
				ID:   bid.Hex(),
				Name: "Test Board",
			}, nil
		},
	}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("DELETE", "/api/boards/"+boardID.Hex()+"/columns/"+columnID, nil)

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "data")
}

func TestBoardHandler_CreateBoard_ValidationError(t *testing.T) {
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	mockService := &MockBoardService{}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	// Create test request with empty name
	reqBody := services.CreateBoardRequest{
		Name:        "", // Empty name should cause validation error
		Description: "Test Description",
	}
	jsonBody, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/workspaces/"+workspaceID.Hex()+"/boards", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, false, response["success"])
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "Board name is required", errorObj["message"])
}

func TestBoardHandler_AddColumn_ValidationError(t *testing.T) {
	userID := primitive.NewObjectID()
	boardID := primitive.NewObjectID()

	mockService := &MockBoardService{}

	handler := &BoardHandler{
		boardService: mockService,
	}

	router := setupBoardTestRouter(handler)

	// Create test request with empty name
	reqBody := services.AddColumnRequest{
		Name: "", // Empty name should cause validation error
		Type: "text",
	}
	jsonBody, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/boards/"+boardID.Hex()+"/columns", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Add authenticated user to context
	user := &auth.AuthenticatedUser{
		ID:    userID,
		Email: "test@example.com",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, user)
	req = req.WithContext(ctx)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, false, response["success"])
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "Column name is required", errorObj["message"])
}
