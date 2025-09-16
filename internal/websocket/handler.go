package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"

	"project-management-platform/internal/auth"
)

// Handler manages WebSocket connections and upgrades
type Handler struct {
	hub        *Hub
	jwtManager *auth.JWTManager
	upgrader   websocket.Upgrader
}

// NewHandler creates a new WebSocket handler
func NewHandler(jwtManager *auth.JWTManager) *Handler {
	return &Handler{
		hub:        NewHub(),
		jwtManager: jwtManager,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// In production, implement proper origin checking
				return true
			},
		},
	}
}

// HandleWebSocket handles WebSocket connection upgrades
func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
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
	
	logrus.WithFields(logrus.Fields{
		"userID": userID,
		"email":  claims.Email,
	}).Info("WebSocket connection established")

	// Register the connection
	h.hub.register <- connection

	// Start connection handlers
	go connection.writePump()
	go connection.readPump()
}

// GetHub returns the WebSocket hub
func (h *Handler) GetHub() *Hub {
	return h.hub
}

// GetStats returns WebSocket connection statistics
func (h *Handler) GetStats() map[string]interface{} {
	return map[string]interface{}{
		"totalConnections": h.hub.GetConnectionCount(),
		"connectedUsers":   len(h.hub.GetConnectedUsers()),
		"rooms":            h.hub.GetRoomConnectionCounts(),
	}
}

// HandleBoardWebSocket handles WebSocket connections for specific boards
func (h *Handler) HandleBoardWebSocket(w http.ResponseWriter, r *http.Request) {
	// Extract board ID from URL parameters
	boardID := r.URL.Query().Get("boardId")
	if boardID == "" {
		http.Error(w, "Board ID is required", http.StatusBadRequest)
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
	
	logrus.WithFields(logrus.Fields{
		"userID":  userID,
		"email":   claims.Email,
		"boardID": boardID,
	}).Info("Board WebSocket connection established")

	// Register the connection
	h.hub.register <- connection
	
	// Auto-subscribe to the board room
	h.hub.subscribe <- &RoomSubscription{
		UserID: userID,
		Room:   "board:" + boardID,
	}

	// Start connection handlers
	go connection.writePump()
	go connection.readPump()
}

// extractToken extracts JWT token from the request
func (h *Handler) extractToken(r *http.Request) string {
	// Try Authorization header first
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		token := auth.ExtractTokenFromHeader(authHeader)
		if token != "" {
			return token
		}
	}

	// Try query parameter as fallback (for WebSocket connections, etc.)
	token := r.URL.Query().Get("token")
	if token != "" {
		return token
	}

	// Try cookie as another fallback
	cookie, err := r.Cookie("auth_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}

	return ""
}