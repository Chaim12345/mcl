package websocket

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

// Connection represents a WebSocket client connection
type Connection struct {
	conn   *websocket.Conn
	userID string
	send   chan []byte
	hub    *Hub
	
	mu     sync.Mutex
	closed bool
}

// NewConnection creates a new WebSocket connection
func NewConnection(conn *websocket.Conn, userID string, hub *Hub) *Connection {
	return &Connection{
		conn:   conn,
		userID: userID,
		send:   make(chan []byte, 256),
		hub:    hub,
	}
}

// readPump reads messages from the WebSocket connection
func (c *Connection) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(1024)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logrus.WithError(err).Error("WebSocket read error")
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			logrus.WithError(err).Error("Failed to unmarshal WebSocket message")
			continue
		}

		c.handleMessage(&msg)
	}
}

// writePump writes messages to the WebSocket connection
func (c *Connection) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.mu.Lock()
			if c.closed {
				c.mu.Unlock()
				return
			}
			c.mu.Unlock()

			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				logrus.WithError(err).Error("WebSocket write error")
				return
			}

		case <-ticker.C:
			c.mu.Lock()
			if c.closed {
				c.mu.Unlock()
				return
			}
			c.mu.Unlock()

			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				logrus.WithError(err).Error("WebSocket ping error")
				return
			}
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (c *Connection) handleMessage(msg *Message) {
	switch msg.Type {
	case "subscribe":
		c.handleSubscribe(msg)
	case "unsubscribe":
		c.handleUnsubscribe(msg)
	case "ping":
		c.handlePing(msg)
	default:
		logrus.WithField("type", msg.Type).Warn("Unknown message type")
	}
}

// handleSubscribe handles subscription requests
func (c *Connection) handleSubscribe(msg *Message) {
	// Implementation will be added when we add board/item/comment endpoints
	logrus.WithFields(logrus.Fields{
		"userID": c.userID,
		"room":   msg.Room,
	}).Info("Subscribe request received")
}

// handleUnsubscribe handles unsubscription requests
func (c *Connection) handleUnsubscribe(msg *Message) {
	// Implementation will be added when we add board/item/comment endpoints
	logrus.WithFields(logrus.Fields{
		"userID": c.userID,
		"room":   msg.Room,
	}).Info("Unsubscribe request received")
}

// handlePing handles ping messages
func (c *Connection) handlePing(msg *Message) {
	response := Message{
		Type: "pong",
		Data: map[string]interface{}{"timestamp": time.Now().Unix()},
	}
	c.send <- response.ToBytes()
}

// Close closes the connection
func (c *Connection) Close() {
	c.mu.Lock()
	if !c.closed {
		c.closed = true
		close(c.send)
	}
	c.mu.Unlock()
}