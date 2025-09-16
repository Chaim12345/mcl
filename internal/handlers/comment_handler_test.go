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
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/services"
)

// Mock comment service for testing
type mockCommentService struct {
	mock.Mock
}

func (m *mockCommentService) Create(ctx context.Context, content string, itemID, authorID primitive.ObjectID, parentID *primitive.ObjectID) (*models.Comment, error) {
	args := m.Called(ctx, content, itemID, authorID, parentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Comment), args.Error(1)
}

func (m *mockCommentService) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Comment), args.Error(1)
}

func (m *mockCommentService) GetByItemID(ctx context.Context, itemID primitive.ObjectID) ([]*models.Comment, error) {
	args := m.Called(ctx, itemID)
	return args.Get(0).([]*models.Comment), args.Error(1)
}

func (m *mockCommentService) GetCommentsWithReplies(ctx context.Context, itemID primitive.ObjectID) ([]*services.CommentWithReplies, error) {
	args := m.Called(ctx, itemID)
	return args.Get(0).([]*services.CommentWithReplies), args.Error(1)
}

func (m *mockCommentService) GetReplies(ctx context.Context, parentID primitive.ObjectID) ([]*models.Comment, error) {
	args := m.Called(ctx, parentID)
	return args.Get(0).([]*models.Comment), args.Error(1)
}

func (m *mockCommentService) Update(ctx context.Context, id primitive.ObjectID, newContent string, userID primitive.ObjectID) (*models.Comment, error) {
	args := m.Called(ctx, id, newContent, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Comment), args.Error(1)
}

func (m *mockCommentService) Delete(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *mockCommentService) AddMention(ctx context.Context, commentID, userID primitive.ObjectID) error {
	args := m.Called(ctx, commentID, userID)
	return args.Error(0)
}

func (m *mockCommentService) RemoveMention(ctx context.Context, commentID, userID primitive.ObjectID) error {
	args := m.Called(ctx, commentID, userID)
	return args.Error(0)
}

func (m *mockCommentService) GetByAuthor(ctx context.Context, authorID primitive.ObjectID) ([]*models.Comment, error) {
	args := m.Called(ctx, authorID)
	return args.Get(0).([]*models.Comment), args.Error(1)
}

func (m *mockCommentService) AddAttachment(ctx context.Context, commentID primitive.ObjectID, filename, url, mimeType string, size int64) error {
	args := m.Called(ctx, commentID, filename, url, mimeType, size)
	return args.Error(0)
}

func (m *mockCommentService) RemoveAttachment(ctx context.Context, commentID primitive.ObjectID, filename string) error {
	args := m.Called(ctx, commentID, filename)
	return args.Error(0)
}

func setupCommentTestRouter() (*gin.Engine, *mockCommentService) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	mockService := new(mockCommentService)
	handler := NewCommentHandler(mockService)

	// Add middleware to set userID in context
	router.Use(func(c *gin.Context) {
		userID := primitive.NewObjectID()
		c.Set("userID", userID)
		c.Next()
	})

	// Setup routes
	api := router.Group("/api")
	{
		api.POST("/items/:itemId/comments", handler.CreateComment)
		api.GET("/items/:itemId/comments", handler.GetItemComments)
		api.GET("/items/:itemId/comments/threaded", handler.GetThreadedComments)
		api.GET("/comments/:commentId", handler.GetComment)
		api.PUT("/comments/:commentId", handler.UpdateComment)
		api.DELETE("/comments/:commentId", handler.DeleteComment)
		api.POST("/comments/:commentId/replies", handler.CreateReply)
		api.GET("/comments/:commentId/replies", handler.GetReplies)
		api.POST("/comments/:commentId/mentions", handler.AddMention)
		api.DELETE("/comments/:commentId/mentions/:userId", handler.RemoveMention)
		api.POST("/comments/:commentId/attachments", handler.AddAttachment)
		api.DELETE("/comments/:commentId/attachments/:filename", handler.RemoveAttachment)
		api.GET("/users/:userId/comments", handler.GetUserComments)
	}

	return router, mockService
}

func TestCommentHandler_CreateComment(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	itemID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	comment := &models.Comment{
		ID:       primitive.NewObjectID(),
		Content:  "Test comment",
		ItemID:   itemID,
		AuthorID: userID,
	}

	mockService.On("Create", mock.Anything, "Test comment", itemID, mock.AnythingOfType("primitive.ObjectID"), (*primitive.ObjectID)(nil)).Return(comment, nil)

	reqBody := map[string]interface{}{
		"content": "Test comment",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/items/"+itemID.Hex()+"/comments", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_GetItemComments(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	itemID := primitive.NewObjectID()
	comments := []*models.Comment{
		{
			ID:      primitive.NewObjectID(),
			Content: "Comment 1",
			ItemID:  itemID,
		},
		{
			ID:      primitive.NewObjectID(),
			Content: "Comment 2",
			ItemID:  itemID,
		},
	}

	mockService.On("GetByItemID", mock.Anything, itemID).Return(comments, nil)

	req, _ := http.NewRequest("GET", "/api/items/"+itemID.Hex()+"/comments", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_GetThreadedComments(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	itemID := primitive.NewObjectID()
	threaded := []*services.CommentWithReplies{
		{
			Comment: &models.Comment{
				ID:      primitive.NewObjectID(),
				Content: "Parent comment",
				ItemID:  itemID,
			},
			Replies: []*models.Comment{
				{
					ID:      primitive.NewObjectID(),
					Content: "Reply 1",
					ItemID:  itemID,
				},
			},
		},
	}

	mockService.On("GetCommentsWithReplies", mock.Anything, itemID).Return(threaded, nil)

	req, _ := http.NewRequest("GET", "/api/items/"+itemID.Hex()+"/comments/threaded", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_UpdateComment(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	commentID := primitive.NewObjectID()
	updatedComment := &models.Comment{
		ID:      commentID,
		Content: "Updated comment",
	}

	mockService.On("Update", mock.Anything, commentID, "Updated comment", mock.AnythingOfType("primitive.ObjectID")).Return(updatedComment, nil)

	reqBody := map[string]interface{}{
		"content": "Updated comment",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("PUT", "/api/comments/"+commentID.Hex(), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_DeleteComment(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	commentID := primitive.NewObjectID()

	mockService.On("Delete", mock.Anything, commentID, mock.AnythingOfType("primitive.ObjectID")).Return(nil)

	req, _ := http.NewRequest("DELETE", "/api/comments/"+commentID.Hex(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_CreateReply(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	parentID := primitive.NewObjectID()
	itemID := primitive.NewObjectID()
	parentComment := &models.Comment{
		ID:     parentID,
		ItemID: itemID,
	}

	reply := &models.Comment{
		ID:       primitive.NewObjectID(),
		Content:  "Test reply",
		ItemID:   itemID,
		ParentID: &parentID,
	}

	mockService.On("GetByID", mock.Anything, parentID).Return(parentComment, nil)
	mockService.On("Create", mock.Anything, "Test reply", itemID, mock.AnythingOfType("primitive.ObjectID"), &parentID).Return(reply, nil)

	reqBody := map[string]interface{}{
		"content": "Test reply",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/comments/"+parentID.Hex()+"/replies", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_GetReplies(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	parentID := primitive.NewObjectID()
	replies := []*models.Comment{
		{
			ID:       primitive.NewObjectID(),
			Content:  "Reply 1",
			ParentID: &parentID,
		},
		{
			ID:       primitive.NewObjectID(),
			Content:  "Reply 2",
			ParentID: &parentID,
		},
	}

	mockService.On("GetReplies", mock.Anything, parentID).Return(replies, nil)

	req, _ := http.NewRequest("GET", "/api/comments/"+parentID.Hex()+"/replies", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_AddMention(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	commentID := primitive.NewObjectID()
	userID := primitive.NewObjectID()

	mockService.On("AddMention", mock.Anything, commentID, userID).Return(nil)

	reqBody := map[string]interface{}{
		"userId": userID.Hex(),
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/comments/"+commentID.Hex()+"/mentions", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_RemoveMention(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	commentID := primitive.NewObjectID()
	userID := primitive.NewObjectID()

	mockService.On("RemoveMention", mock.Anything, commentID, userID).Return(nil)

	req, _ := http.NewRequest("DELETE", "/api/comments/"+commentID.Hex()+"/mentions/"+userID.Hex(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_AddAttachment(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	commentID := primitive.NewObjectID()

	mockService.On("AddAttachment", mock.Anything, commentID, "test.pdf", "http://example.com/test.pdf", "application/pdf", int64(1024)).Return(nil)

	reqBody := map[string]interface{}{
		"filename": "test.pdf",
		"url":      "http://example.com/test.pdf",
		"mimeType": "application/pdf",
		"size":     1024,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/comments/"+commentID.Hex()+"/attachments", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_RemoveAttachment(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	commentID := primitive.NewObjectID()
	filename := "test.pdf"

	mockService.On("RemoveAttachment", mock.Anything, commentID, filename).Return(nil)

	req, _ := http.NewRequest("DELETE", "/api/comments/"+commentID.Hex()+"/attachments/"+filename, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_GetUserComments(t *testing.T) {
	router, mockService := setupCommentTestRouter()

	userID := primitive.NewObjectID()
	comments := []*models.Comment{
		{
			ID:       primitive.NewObjectID(),
			Content:  "User comment 1",
			AuthorID: userID,
		},
		{
			ID:       primitive.NewObjectID(),
			Content:  "User comment 2",
			AuthorID: userID,
		},
	}

	mockService.On("GetByAuthor", mock.Anything, userID).Return(comments, nil)

	req, _ := http.NewRequest("GET", "/api/users/"+userID.Hex()+"/comments", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestCommentHandler_InvalidObjectID(t *testing.T) {
	router, _ := setupCommentTestRouter()

	req, _ := http.NewRequest("GET", "/api/items/invalid-id/comments", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCommentHandler_MissingUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	mockService := new(mockCommentService)
	handler := NewCommentHandler(mockService)

	// Don't add userID middleware
	router.POST("/api/items/:itemId/comments", handler.CreateComment)

	itemID := primitive.NewObjectID()
	reqBody := map[string]interface{}{
		"content": "Test comment",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/items/"+itemID.Hex()+"/comments", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
