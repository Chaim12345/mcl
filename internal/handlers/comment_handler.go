package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CommentHandler struct {
	service CommentServiceInterface
}

func NewCommentHandler(service CommentServiceInterface) *CommentHandler {
	return &CommentHandler{service: service}
}

// POST /api/items/:itemId/comments
func (h *CommentHandler) CreateComment(c *gin.Context) {
	itemIdStr := c.Param("itemId")
	var req struct {
		Content  string  `json:"content"`
		ParentID *string `json:"parentId,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	itemID, err := primitive.ObjectIDFromHex(itemIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid itemId"})
		return
	}
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var parentID *primitive.ObjectID
	if req.ParentID != nil && *req.ParentID != "" {
		pid, err := primitive.ObjectIDFromHex(*req.ParentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid parentId"})
			return
		}
		parentID = &pid
	}
	comment, err := h.service.Create(c.Request.Context(), req.Content, itemID, userID.(primitive.ObjectID), parentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	c.JSON(http.StatusCreated, comment)
}

// GET /api/items/:itemId/comments
func (h *CommentHandler) GetItemComments(c *gin.Context) {
	itemIdStr := c.Param("itemId")
	itemID, err := primitive.ObjectIDFromHex(itemIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid itemId"})
		return
	}
	comments, err := h.service.GetByItemID(c.Request.Context(), itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, comments)
}

// POST /api/comments/:commentId/replies
func (h *CommentHandler) CreateReply(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	var req struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	parentID, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	// Find parent comment to get itemID
	parent, err := h.service.GetByID(c.Request.Context(), parentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "parent comment not found"})
		return
	}
	comment, err := h.service.Create(c.Request.Context(), req.Content, parent.ItemID, userID.(primitive.ObjectID), &parentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	c.JSON(http.StatusCreated, comment)
}

// GET /api/comments/:commentId/replies
func (h *CommentHandler) GetReplies(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	parentID, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	replies, err := h.service.GetReplies(c.Request.Context(), parentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, replies)
}

// PUT /api/comments/:commentId
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	var req struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	id, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	comment, err := h.service.Update(c.Request.Context(), id, req.Content, userID.(primitive.ObjectID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	c.JSON(http.StatusOK, comment)
}

// DELETE /api/comments/:commentId
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	id, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if err := h.service.Delete(c.Request.Context(), id, userID.(primitive.ObjectID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusNoContent, gin.H{})
}

// GET /api/items/:itemId/comments/threaded
func (h *CommentHandler) GetThreadedComments(c *gin.Context) {
	itemIdStr := c.Param("itemId")
	itemID, err := primitive.ObjectIDFromHex(itemIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid itemId"})
		return
	}
	comments, err := h.service.GetCommentsWithReplies(c.Request.Context(), itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, comments)
}

// GET /api/comments/:commentId
func (h *CommentHandler) GetComment(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	id, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	comment, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}
	c.JSON(http.StatusOK, comment)
}

// POST /api/comments/:commentId/mentions
func (h *CommentHandler) AddMention(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	var req struct {
		UserID string `json:"userId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	commentID, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	userID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
		return
	}
	if err := h.service.AddMention(c.Request.Context(), commentID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "mention added successfully"})
}

// DELETE /api/comments/:commentId/mentions/:userId
func (h *CommentHandler) RemoveMention(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	userIdStr := c.Param("userId")
	commentID, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
		return
	}
	if err := h.service.RemoveMention(c.Request.Context(), commentID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "mention removed successfully"})
}

// POST /api/comments/:commentId/attachments
func (h *CommentHandler) AddAttachment(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	var req struct {
		Filename string `json:"filename"`
		URL      string `json:"url"`
		MimeType string `json:"mimeType"`
		Size     int64  `json:"size"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	commentID, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	if err := h.service.AddAttachment(c.Request.Context(), commentID, req.Filename, req.URL, req.MimeType, req.Size); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "attachment added successfully"})
}

// DELETE /api/comments/:commentId/attachments/:filename
func (h *CommentHandler) RemoveAttachment(c *gin.Context) {
	commentIdStr := c.Param("commentId")
	filename := c.Param("filename")
	commentID, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commentId"})
		return
	}
	if err := h.service.RemoveAttachment(c.Request.Context(), commentID, filename); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "attachment removed successfully"})
}

// GET /api/users/:userId/comments
func (h *CommentHandler) GetUserComments(c *gin.Context) {
	userIdStr := c.Param("userId")
	userID, err := primitive.ObjectIDFromHex(userIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
		return
	}
	comments, err := h.service.GetByAuthor(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, comments)
}
