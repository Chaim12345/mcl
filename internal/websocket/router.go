package websocket

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// RegisterRoutes registers WebSocket routes with the Gin router
func (h *Handler) RegisterRoutes(router *gin.Engine, authMiddleware gin.HandlerFunc) {
	// WebSocket endpoint for general real-time updates
	router.GET("/ws", authMiddleware, func(c *gin.Context) {
		h.HandleWebSocket(c.Writer, c.Request)
	})

	// WebSocket endpoint for board-specific updates
	router.GET("/ws/board/:boardId", authMiddleware, func(c *gin.Context) {
		boardID := c.Param("boardId")
		// Add boardId to query parameters for the handler
		c.Request.URL.RawQuery = "boardId=" + boardID
		h.HandleBoardWebSocket(c.Writer, c.Request)
	})

	// WebSocket endpoint for item-specific updates
	router.GET("/ws/item/:itemId", authMiddleware, func(c *gin.Context) {
		itemID := c.Param("itemId")
		c.Request.URL.RawQuery = "itemId=" + itemID
		h.HandleItemWebSocket(c.Writer, c.Request)
	})

	// WebSocket endpoint for comment-specific updates
	router.GET("/ws/comment/:commentId", authMiddleware, func(c *gin.Context) {
		commentID := c.Param("commentId")
		c.Request.URL.RawQuery = "commentId=" + commentID
		h.HandleCommentWebSocket(c.Writer, c.Request)
	})

	// WebSocket statistics endpoint
	router.GET("/ws/stats", authMiddleware, func(c *gin.Context) {
		c.JSON(http.StatusOK, h.GetStats())
	})
}

// HandleItemWebSocket handles WebSocket connections for specific items
func (h *Handler) HandleItemWebSocket(w http.ResponseWriter, r *http.Request) {
	// Extract item ID from URL parameters
	itemID := r.URL.Query().Get("itemId")
	if itemID == "" {
		http.Error(w, "Item ID is required", http.StatusBadRequest)
		return
	}

	// Extract JWT token from the request
	tokenString := h.extractToken(r)
	if tokenString == "" {
		http.Error(w, "Missing authorization token", http.StatusUnauthorized)
		return
	}

	// Validate JWT token
	claims, err := h.jwtManager.ValidateToken(tokenString)
	if err != nil {
		http.Error(w, "Invalid authorization token", http.StatusUnauthorized)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		logrus.WithError(err).Error("Failed to upgrade WebSocket connection")
		return
	}

	// Create new connection with authenticated user ID
	userID := claims.UserID.Hex()
	connection := NewConnection(conn, userID, h.hub)
	
	h.hub.subscribe <- &RoomSubscription{
		UserID: userID,
		Room:   "item:" + itemID,
	}

	// Start connection handlers
	go connection.writePump()
	go connection.readPump()
}

// HandleCommentWebSocket handles WebSocket connections for specific comments
func (h *Handler) HandleCommentWebSocket(w http.ResponseWriter, r *http.Request) {
	// Extract comment ID from URL parameters
	commentID := r.URL.Query().Get("commentId")
	if commentID == "" {
		http.Error(w, "Comment ID is required", http.StatusBadRequest)
		return
	}

	// Extract JWT token from the request
	tokenString := h.extractToken(r)
	if tokenString == "" {
		http.Error(w, "Missing authorization token", http.StatusUnauthorized)
		return
	}

	// Validate JWT token
	claims, err := h.jwtManager.ValidateToken(tokenString)
	if err != nil {
		http.Error(w, "Invalid authorization token", http.StatusUnauthorized)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		logrus.WithError(err).Error("Failed to upgrade WebSocket connection")
		return
	}

	// Create new connection with authenticated user ID
	userID := claims.UserID.Hex()
	connection := NewConnection(conn, userID, h.hub)
	
	h.hub.subscribe <- &RoomSubscription{
		UserID: userID,
		Room:   "comment:" + commentID,
	}

	// Start connection handlers
	go connection.writePump()
	go connection.readPump()
}