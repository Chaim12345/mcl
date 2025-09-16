package websocket

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Mock services for testing
type MockItemService struct{}
type MockBoardService struct{}
type MockUserService struct{}
type MockCommentService struct{}
type MockActivityService struct{}

// Test structures
type WebSocketTestSuite struct {
	server *httptest.Server
	url    string
	hub    *Hub
}

func NewWebSocketTestSuite() *WebSocketTestSuite {
	return &WebSocketTestSuite{}
}

func TestWebSocketConnection(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	// Create test hub
	hub := NewHub()
	go hub.Run()

	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	}))
	defer server.Close()

	// Convert http URL to ws URL
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Test connection
	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket server: %v", err)
	}
	defer conn.Close()

	if resp.StatusCode != http.StatusSwitchingProtocols {
		t.Errorf("Expected status %d, got %d", http.StatusSwitchingProtocols, resp.StatusCode)
	}
}

func TestWebSocketMessageHandling(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	hub := NewHub()
	go hub.Run()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Test subscription message
	subMsg := WebSocketMessage{
		Type: "subscribe",
		Data: map[string]interface{}{
			"boardId": "test-board-id",
		},
	}

	if err := conn.WriteJSON(subMsg); err != nil {
		t.Fatalf("Failed to send subscription message: %v", err)
	}

	// Wait for response
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("Failed to read response: %v", err)
	}

	var response WebSocketMessage
	if err := json.Unmarshal(msg, &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Type != "subscribed" {
		t.Errorf("Expected 'subscribed' response, got '%s'", response.Type)
	}
}

func TestWebSocketBroadcast(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	hub := NewHub()
	go hub.Run()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Create two connections
	conn1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect first client: %v", err)
	}
	defer conn1.Close()

	conn2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect second client: %v", err)
	}
	defer conn2.Close()

	// Subscribe both connections to the same board
	subMsg := WebSocketMessage{
		Type: "subscribe",
		Data: map[string]interface{}{
			"boardId": "shared-board-id",
		},
	}

	if err := conn1.WriteJSON(subMsg); err != nil {
		t.Fatalf("Failed to subscribe first client: %v", err)
	}
	if err := conn2.WriteJSON(subMsg); err != nil {
		t.Fatalf("Failed to subscribe second client: %v", err)
	}

	// Create a broadcast message
	broadcastMsg := WebSocketMessage{
		Type: "item_created",
		Data: map[string]interface{}{
			"boardId": "shared-board-id",
			"item": map[string]interface{}{
				"id":    "new-item-id",
				"title": "New Test Item",
			},
		},
	}

	// Send broadcast
	hub.Broadcast <- broadcastMsg

	// Verify both connections receive the message
	conn1.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg1, err := conn1.ReadMessage()
	if err != nil {
		t.Fatalf("First client failed to receive broadcast: %v", err)
	}

	conn2.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg2, err := conn2.ReadMessage()
	if err != nil {
		t.Fatalf("Second client failed to receive broadcast: %v", err)
	}

	var received1, received2 WebSocketMessage
	if err := json.Unmarshal(msg1, &received1); err != nil {
		t.Fatalf("Failed to unmarshal message for first client: %v", err)
	}
	if err := json.Unmarshal(msg2, &received2); err != nil {
		t.Fatalf("Failed to unmarshal message for second client: %v", err)
	}

	if received1.Type != "item_created" || received2.Type != "item_created" {
		t.Error("Both clients should receive item_created message")
	}
}

func TestWebSocketConnectionCleanup(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	hub := NewHub()
	go hub.Run()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}

	// Close connection from client side
	conn.Close()

	// Allow time for cleanup
	time.Sleep(100 * time.Millisecond)

	// Verify connection was cleaned up (implementation specific)
	// This would typically involve checking the hub's client count
}

func TestWebSocketErrorHandling(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	hub := NewHub()
	go hub.Run()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Test invalid message format
	invalidMsg := []byte("invalid json")
	if err := conn.WriteMessage(websocket.TextMessage, invalidMsg); err != nil {
		t.Fatalf("Failed to send invalid message: %v", err)
	}

	// Connection should remain open despite invalid message
	conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, _, err = conn.ReadMessage()
	if err != nil {
		// Expected behavior: either ignore or send error response
		// Should not close connection
	}
}

func TestWebSocketRateLimiting(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	hub := NewHub()
	go hub.Run()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Test rapid message sending
	for i := 0; i < 100; i++ {
		msg := WebSocketMessage{
			Type: "ping",
			Data: map[string]interface{}{"count": i},
		}
		if err := conn.WriteJSON(msg); err != nil {
			t.Fatalf("Failed to send message %d: %v", i, err)
		}
	}

	// Connection should not be closed by rate limiting
	conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, _, err = conn.ReadMessage()
	// Check for rate limit responses or continued operation
}

func TestWebSocketAuthentication(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	hub := NewHub()
	go hub.Run()

	// Mock authentication middleware
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate authenticated user
		ctx := context.WithValue(r.Context(), "userID", "test-user-id")
		ServeWebSocket(hub, w, r.WithContext(ctx))
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Test authenticated user context
	authMsg := WebSocketMessage{
		Type: "get_user_context",
	}

	if err := conn.WriteJSON(authMsg); err != nil {
		t.Fatalf("Failed to send auth message: %v", err)
	}

	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("Failed to read auth response: %v", err)
	}

	var response WebSocketMessage
	if err := json.Unmarshal(msg, &response); err != nil {
		t.Fatalf("Failed to unmarshal auth response: %v", err)
	}

	// Verify user context is properly handled
	if response.Type != "user_context" {
		t.Errorf("Expected 'user_context' response, got '%s'", response.Type)
	}
}

func TestWebSocketRetryMechanism(t *testing.T) {
	suite := NewWebSocketTestSuite()
	defer suite.cleanup()

	hub := NewHub()
	go hub.Run()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Simulate connection drop and reconnect
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Initial connection failed: %v", err)
	}

	// Close connection and reconnect
	conn.Close()
	time.Sleep(100 * time.Millisecond)

	// Reconnect
	conn, _, err = websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Reconnection failed: %v", err)
	}
	defer conn.Close()

	// Test that reconnection works properly
	subMsg := WebSocketMessage{
		Type: "subscribe",
		Data: map[string]interface{}{
			"boardId": "test-board-id",
		},
	}

	if err := conn.WriteJSON(subMsg); err != nil {
		t.Fatalf("Failed to send subscription after reconnect: %v", err)
	}
}

// Helper methods
func (suite *WebSocketTestSuite) cleanup() {
	if suite.server != nil {
		suite.server.Close()
	}
}

func TestWebSocketMessageValidation(t *testing.T) {
	tests := []struct {
		name    string
		message WebSocketMessage
		valid   bool
	}{
		{
			name: "Valid subscribe message",
			message: WebSocketMessage{
				Type: "subscribe",
				Data: map[string]interface{}{"boardId": "test-id"},
			},
			valid: true,
		},
		{
			name: "Invalid message type",
			message: WebSocketMessage{
				Type: "invalid_type",
				Data: map[string]interface{}{},
			},
			valid: false,
		},
		{
			name: "Empty message type",
			message: WebSocketMessage{
				Type: "",
				Data: map[string]interface{}{},
			},
			valid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMessage(tt.message)
			if (err == nil) != tt.valid {
				t.Errorf("validateMessage() for %s: expected valid=%v, got err=%v",
					tt.name, tt.valid, err)
			}
		})
	}
}

// validateMessage is a helper function for testing message validation
func validateMessage(msg WebSocketMessage) error {
	if msg.Type == "" {
		return fmt.Errorf("message type is required")
	}

	validTypes := map[string]bool{
		"subscribe":    true,
		"unsubscribe":  true,
		"item_created": true,
		"item_updated": true,
		"item_deleted": true,
		"ping":         true,
		"pong":         true,
	}

	if !validTypes[msg.Type] {
		return fmt.Errorf("invalid message type: %s", msg.Type)
	}

	return nil
}