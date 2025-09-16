package websocket

import (
	"context"
	"fmt"

	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// Broadcaster handles real-time message broadcasting to WebSocket clients
type Broadcaster struct {
	hub    *Hub
	client *mongo.Client
}

// NewBroadcaster creates a new broadcaster instance
func NewBroadcaster(hub *Hub, client *mongo.Client) *Broadcaster {
	return &Broadcaster{
		hub:    hub,
		client: client,
	}
}

// Start starts the MongoDB change stream listeners
func (b *Broadcaster) Start(ctx context.Context) error {
	// Start listeners for different collections
	go b.listenBoardChanges(ctx)
	go b.listenItemChanges(ctx)
	go b.listenCommentChanges(ctx)
	
	logrus.Info("WebSocket broadcaster started")
	return nil
}

// listenBoardChanges listens for changes in the boards collection
func (b *Broadcaster) listenBoardChanges(ctx context.Context) {
	collection := b.client.Database("project_management").Collection("boards")
	
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "operationType", Value: bson.D{{Key: "$in", Value: bson.A{"insert", "update", "delete"}}}},
		}}},
	}
	
	stream, err := collection.Watch(ctx, pipeline)
	if err != nil {
		logrus.WithError(err).Warn("Failed to watch board changes (likely not a replica set) - continuing without real-time updates")
		return
	}
	defer stream.Close(ctx)

	for stream.Next(ctx) {
		var changeDoc struct {
			OperationType string                 `bson:"operationType"`
			DocumentKey   struct {
				ID string `bson:"_id"`
			} `bson:"documentKey"`
			UpdateDescription struct {
				UpdatedFields map[string]interface{} `bson:"updatedFields"`
				RemovedFields []string              `bson:"removedFields"`
			} `bson:"updateDescription"`
			FullDocument map[string]interface{} `bson:"fullDocument"`
		}

		if err := stream.Decode(&changeDoc); err != nil {
			logrus.WithError(err).Error("Failed to decode board change stream")
			continue
		}

		b.handleBoardChange(changeDoc)
	}
}

// listenItemChanges listens for changes in the items collection
func (b *Broadcaster) listenItemChanges(ctx context.Context) {
	collection := b.client.Database("project_management").Collection("items")
	
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "operationType", Value: bson.D{{Key: "$in", Value: bson.A{"insert", "update", "delete"}}}},
		}}},
	}
	
	stream, err := collection.Watch(ctx, pipeline)
	if err != nil {
		logrus.WithError(err).Warn("Failed to watch item changes (likely not a replica set) - continuing without real-time updates")
		return
	}
	defer stream.Close(ctx)

	for stream.Next(ctx) {
		var changeDoc struct {
			OperationType string                 `bson:"operationType"`
			DocumentKey   struct {
				ID string `bson:"_id"`
			} `bson:"documentKey"`
			UpdateDescription struct {
				UpdatedFields map[string]interface{} `bson:"updatedFields"`
				RemovedFields []string              `bson:"removedFields"`
			} `bson:"updateDescription"`
			FullDocument map[string]interface{} `bson:"fullDocument"`
		}

		if err := stream.Decode(&changeDoc); err != nil {
			logrus.WithError(err).Error("Failed to decode item change stream")
			continue
		}

		b.handleItemChange(changeDoc)
	}
}

// listenCommentChanges listens for changes in the comments collection
func (b *Broadcaster) listenCommentChanges(ctx context.Context) {
	collection := b.client.Database("project_management").Collection("comments")
	
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "operationType", Value: bson.D{{Key: "$in", Value: bson.A{"insert", "update", "delete"}}}},
		}}},
	}
	
	stream, err := collection.Watch(ctx, pipeline)
	if err != nil {
		logrus.WithError(err).Warn("Failed to watch comment changes (likely not a replica set) - continuing without real-time updates")
		return
	}
	defer stream.Close(ctx)

	for stream.Next(ctx) {
		var changeDoc struct {
			OperationType string                 `bson:"operationType"`
			DocumentKey   struct {
				ID string `bson:"_id"`
			} `bson:"documentKey"`
			UpdateDescription struct {
				UpdatedFields map[string]interface{} `bson:"updatedFields"`
				RemovedFields []string              `bson:"removedFields"`
			} `bson:"updateDescription"`
			FullDocument map[string]interface{} `bson:"fullDocument"`
		}

		if err := stream.Decode(&changeDoc); err != nil {
			logrus.WithError(err).Error("Failed to decode comment change stream")
			continue
		}

		b.handleCommentChange(changeDoc)
	}
}

// handleBoardChange handles a board change event
func (b *Broadcaster) handleBoardChange(changeDoc struct {
	OperationType string                 `bson:"operationType"`
	DocumentKey   struct {
		ID string `bson:"_id"`
	} `bson:"documentKey"`
	UpdateDescription struct {
		UpdatedFields map[string]interface{} `bson:"updatedFields"`
		RemovedFields []string              `bson:"removedFields"`
	} `bson:"updateDescription"`
	FullDocument map[string]interface{} `bson:"fullDocument"`
}) {
	boardID := changeDoc.DocumentKey.ID
	
	event := BoardEvent{
		Type:    "board:" + changeDoc.OperationType,
		BoardID: boardID,
		Data:    changeDoc.FullDocument,
	}

	if changeDoc.OperationType == "update" {
		event.Data = map[string]interface{}{
			"updatedFields": changeDoc.UpdateDescription.UpdatedFields,
			"removedFields": changeDoc.UpdateDescription.RemovedFields,
		}
	}

	// Broadcast to board-specific room
	b.broadcastToRoom(fmt.Sprintf("board:%s", boardID), "board_update", event)
	
	// Broadcast to general boards room
	b.broadcastToRoom("boards", "board_update", event)
}

// handleItemChange handles an item change event
func (b *Broadcaster) handleItemChange(changeDoc struct {
	OperationType string                 `bson:"operationType"`
	DocumentKey   struct {
		ID string `bson:"_id"`
	} `bson:"documentKey"`
	UpdateDescription struct {
		UpdatedFields map[string]interface{} `bson:"updatedFields"`
		RemovedFields []string              `bson:"removedFields"`
	} `bson:"updateDescription"`
	FullDocument map[string]interface{} `bson:"fullDocument"`
}) {
	itemID := changeDoc.DocumentKey.ID
	
	// Extract boardID from full document
	var boardID string
	if changeDoc.FullDocument != nil {
		if boardIDVal, ok := changeDoc.FullDocument["board_id"].(string); ok {
			boardID = boardIDVal
		}
	}

	event := ItemEvent{
		Type:    "item:" + changeDoc.OperationType,
		ItemID:  itemID,
		BoardID: boardID,
		Data:    changeDoc.FullDocument,
	}

	if changeDoc.OperationType == "update" {
		event.Data = map[string]interface{}{
			"updatedFields": changeDoc.UpdateDescription.UpdatedFields,
			"removedFields": changeDoc.UpdateDescription.RemovedFields,
		}
	}

	// Broadcast to item-specific room
	b.broadcastToRoom(fmt.Sprintf("item:%s", itemID), "item_update", event)
	
	// Broadcast to board-specific room if boardID is available
	if boardID != "" {
		b.broadcastToRoom(fmt.Sprintf("board:%s", boardID), "item_update", event)
	}
}

// handleCommentChange handles a comment change event
func (b *Broadcaster) handleCommentChange(changeDoc struct {
	OperationType string                 `bson:"operationType"`
	DocumentKey   struct {
		ID string `bson:"_id"`
	} `bson:"documentKey"`
	UpdateDescription struct {
		UpdatedFields map[string]interface{} `bson:"updatedFields"`
		RemovedFields []string              `bson:"removedFields"`
	} `bson:"updateDescription"`
	FullDocument map[string]interface{} `bson:"fullDocument"`
}) {
	commentID := changeDoc.DocumentKey.ID
	
	// Extract boardID and itemID from full document
	var boardID, itemID string
	if changeDoc.FullDocument != nil {
		if boardIDVal, ok := changeDoc.FullDocument["board_id"].(string); ok {
			boardID = boardIDVal
		}
		if itemIDVal, ok := changeDoc.FullDocument["item_id"].(string); ok {
			itemID = itemIDVal
		}
	}

	event := CommentEvent{
		Type:      "comment:" + changeDoc.OperationType,
		CommentID: commentID,
		ItemID:    itemID,
		BoardID:   boardID,
		Data:      changeDoc.FullDocument,
	}

	if changeDoc.OperationType == "update" {
		event.Data = map[string]interface{}{
			"updatedFields": changeDoc.UpdateDescription.UpdatedFields,
			"removedFields": changeDoc.UpdateDescription.RemovedFields,
		}
	}

	// Broadcast to comment-specific room
	b.broadcastToRoom(fmt.Sprintf("comment:%s", commentID), "comment_update", event)
	
	// Broadcast to item-specific room if itemID is available
	if itemID != "" {
		b.broadcastToRoom(fmt.Sprintf("item:%s", itemID), "comment_update", event)
	}
	
	// Broadcast to board-specific room if boardID is available
	if boardID != "" {
		b.broadcastToRoom(fmt.Sprintf("board:%s", boardID), "comment_update", event)
	}
}

// broadcastToRoom broadcasts a message to a specific room
func (b *Broadcaster) broadcastToRoom(room string, msgType string, data interface{}) {
	message := NewMessage(msgType, room, data)
	
	b.hub.broadcast <- &RoomEvent{
		Room:    room,
		Message: message,
	}
}

// BroadcastBoardUpdate manually broadcasts a board update
func (b *Broadcaster) BroadcastBoardUpdate(boardID string, eventType string, data interface{}) {
	event := BoardEvent{
		Type:    eventType,
		BoardID: boardID,
		Data:    data.(map[string]interface{}),
	}
	
	b.broadcastToRoom(fmt.Sprintf("board:%s", boardID), eventType, event)
}

// BroadcastItemUpdate manually broadcasts an item update
func (b *Broadcaster) BroadcastItemUpdate(boardID string, itemID string, eventType string, data interface{}) {
	event := ItemEvent{
		Type:    eventType,
		ItemID:  itemID,
		BoardID: boardID,
		Data:    data.(map[string]interface{}),
	}
	
	b.broadcastToRoom(fmt.Sprintf("board:%s", boardID), eventType, event)
	b.broadcastToRoom(fmt.Sprintf("item:%s", itemID), eventType, event)
}

// BroadcastCommentUpdate manually broadcasts a comment update
func (b *Broadcaster) BroadcastCommentUpdate(boardID string, itemID string, commentID string, eventType string, data interface{}) {
	event := CommentEvent{
		Type:      eventType,
		CommentID: commentID,
		ItemID:    itemID,
		BoardID:   boardID,
		Data:      data.(map[string]interface{}),
	}
	
	b.broadcastToRoom(fmt.Sprintf("board:%s", boardID), eventType, event)
	b.broadcastToRoom(fmt.Sprintf("item:%s", itemID), eventType, event)
	b.broadcastToRoom(fmt.Sprintf("comment:%s", commentID), eventType, event)
}

// Stop stops the broadcaster
func (b *Broadcaster) Stop() {
	logrus.Info("WebSocket broadcaster stopped")
}