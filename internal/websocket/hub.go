package websocket

import (
	"sync"

	"github.com/sirupsen/logrus"
)

// Hub manages WebSocket connections and message broadcasting
type Hub struct {
	// Registered connections by user ID
	connections map[string]map[*Connection]bool
	
	// Rooms for broadcasting messages to specific groups
	rooms map[string]map[*Connection]bool
	
	// Channels for operations
	register    chan *Connection
	unregister  chan *Connection
	broadcast   chan *RoomEvent
	subscribe   chan *RoomSubscription
	unsubscribe chan *RoomSubscription
	
	mu sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		connections: make(map[string]map[*Connection]bool),
		rooms:       make(map[string]map[*Connection]bool),
		register:    make(chan *Connection),
		unregister:  make(chan *Connection),
		broadcast:   make(chan *RoomEvent),
		subscribe:   make(chan *RoomSubscription),
		unsubscribe: make(chan *RoomSubscription),
	}
}

// Run starts the hub event loop
func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.register:
			h.handleRegister(conn)
			
		case conn := <-h.unregister:
			h.handleUnregister(conn)
			
		case event := <-h.broadcast:
			h.handleBroadcast(event)
			
		case sub := <-h.subscribe:
			h.handleSubscribe(sub)
			
		case sub := <-h.unsubscribe:
			h.handleUnsubscribe(sub)
		}
	}
}

// handleRegister registers a new connection
func (h *Hub) handleRegister(conn *Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Add to connections map
	if _, exists := h.connections[conn.userID]; !exists {
		h.connections[conn.userID] = make(map[*Connection]bool)
	}
	h.connections[conn.userID][conn] = true

	logrus.WithFields(logrus.Fields{
		"userID": conn.userID,
		"total":  len(h.connections[conn.userID]),
	}).Info("User connection registered")
}

// handleUnregister unregisters a connection
func (h *Hub) handleUnregister(conn *Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Remove from connections map
	if connections, exists := h.connections[conn.userID]; exists {
		delete(connections, conn)
		if len(connections) == 0 {
			delete(h.connections, conn.userID)
		}
	}

	// Remove from all rooms
	for room, connections := range h.rooms {
		delete(connections, conn)
		if len(connections) == 0 {
			delete(h.rooms, room)
		}
	}

	conn.Close()

	logrus.WithFields(logrus.Fields{
		"userID": conn.userID,
	}).Info("User connection unregistered")
}

// handleSubscribe subscribes a connection to a room
func (h *Hub) handleSubscribe(sub *RoomSubscription) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Find connections for this user
	for conn := range h.connections[sub.UserID] {
		// Add to room
		if _, exists := h.rooms[sub.Room]; !exists {
			h.rooms[sub.Room] = make(map[*Connection]bool)
		}
		h.rooms[sub.Room][conn] = true
		
		logrus.WithFields(logrus.Fields{
			"userID": sub.UserID,
			"room":   sub.Room,
		}).Info("User subscribed to room")
	}
}

// handleUnsubscribe unsubscribes a connection from a room
func (h *Hub) handleUnsubscribe(sub *RoomSubscription) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Find connections for this user
	for conn := range h.connections[sub.UserID] {
		// Remove from room
		if connections, exists := h.rooms[sub.Room]; exists {
			delete(connections, conn)
			if len(connections) == 0 {
				delete(h.rooms, sub.Room)
			}
		}
		
		logrus.WithFields(logrus.Fields{
			"userID": sub.UserID,
			"room":   sub.Room,
		}).Info("User unsubscribed from room")
	}
}

// handleBroadcast broadcasts a message to a room
func (h *Hub) handleBroadcast(event *RoomEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	connections, exists := h.rooms[event.Room]
	if !exists {
		logrus.WithField("room", event.Room).Warn("Room not found for broadcast")
		return
	}

	message := event.Message.ToBytes()
	for conn := range connections {
		select {
		case conn.send <- message:
			// Message sent successfully
		default:
			// Connection buffer full, close connection
			logrus.WithField("userID", conn.userID).Warn("Connection send buffer full, closing")
			go func(c *Connection) {
				c.hub.unregister <- c
			}(conn)
		}
	}

	logrus.WithFields(logrus.Fields{
		"room":    event.Room,
		"count":   len(connections),
		"message": event.Message.Type,
	}).Debug("Message broadcast to room")
}

// GetConnectionCount returns the total number of active connections
func (h *Hub) GetConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	count := 0
	for _, connections := range h.connections {
		count += len(connections)
	}
	return count
}

// GetRoomConnectionCount returns the number of connections in a room
func (h *Hub) GetRoomConnectionCount(room string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if connections, exists := h.rooms[room]; exists {
		return len(connections)
	}
	return 0
}

// GetConnectedUsers returns a list of all connected user IDs
func (h *Hub) GetConnectedUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]string, 0, len(h.connections))
	for userID := range h.connections {
		users = append(users, userID)
	}
	return users
}

// GetRoomConnectionCounts returns connection counts for all rooms
func (h *Hub) GetRoomConnectionCounts() map[string]int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	counts := make(map[string]int)
	for room, connections := range h.rooms {
		counts[room] = len(connections)
	}
	return counts
}