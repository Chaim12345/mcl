package websocket

import (
	"encoding/json"
	"time"
)

// Message represents a WebSocket message structure
type Message struct {
	Type  string      `json:"type"`
	Room  string      `json:"room,omitempty"`
	Data  interface{} `json:"data,omitempty"`
	Error string      `json:"error,omitempty"`
}

// RoomSubscription represents a subscription to a room
type RoomSubscription struct {
	UserID string
	Room   string
}

// RoomEvent represents an event that should be broadcast to a room
type RoomEvent struct {
	Room    string
	Message *Message
}

// BoardEvent represents a board-related event
type BoardEvent struct {
	Type     string                 `json:"type"`
	BoardID  string                 `json:"boardId"`
	Data     map[string]interface{} `json:"data"`
	UserID   string                 `json:"userId"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ItemEvent represents an item-related event
type ItemEvent struct {
	Type     string                 `json:"type"`
	ItemID   string                 `json:"itemId"`
	BoardID  string                 `json:"boardId"`
	Data     map[string]interface{} `json:"data"`
	UserID   string                 `json:"userId"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// CommentEvent represents a comment-related event
type CommentEvent struct {
	Type      string                 `json:"type"`
	CommentID string                 `json:"commentId"`
	ItemID    string                 `json:"itemId"`
	BoardID   string                 `json:"boardId"`
	Data      map[string]interface{} `json:"data"`
	UserID    string                 `json:"userId"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// UserPresence represents user presence information
type UserPresence struct {
	UserID   string    `json:"userId"`
	Username string    `json:"username"`
	LastSeen time.Time `json:"lastSeen"`
	Status   string    `json:"status"` // "online", "away", "offline"
}

// ConnectionInfo represents connection metadata
type ConnectionInfo struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Room     string `json:"room"`
}

// ToBytes converts a message to JSON bytes
func (m *Message) ToBytes() []byte {
	data, _ := json.Marshal(m)
	return data
}

// NewMessage creates a new message
func NewMessage(msgType string, room string, data interface{}) *Message {
	return &Message{
		Type: msgType,
		Room: room,
		Data: data,
	}
}

// NewErrorMessage creates a new error message
func NewErrorMessage(error string) *Message {
	return &Message{
		Type:  "error",
		Error: error,
	}
}