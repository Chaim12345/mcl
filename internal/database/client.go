package database

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NewClient creates a new MongoDB client, initializes test database indexes using a temporary connection, and returns a fresh client for use.
func NewClient(uri string) (*mongo.Client, error) {
	if uri == "" {
		return nil, fmt.Errorf("MongoDB URI is required")
	}

	u, err := url.Parse(uri)
	if err != nil {
		return nil, fmt.Errorf("invalid MongoDB URI: %w", err)
	}
	if u.Scheme != "mongodb" && u.Scheme != "mongodb+srv" {
		return nil, fmt.Errorf("invalid MongoDB URI: %s", uri)
	}

	opts := options.Client().ApplyURI(uri)

	// Temporary client to initialize indexes
	tempCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	tempClient, err := mongo.Connect(tempCtx, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to connect for index init: %w", err)
	}
	// Ensure temp client disconnects
	defer tempClient.Disconnect(tempCtx)

	// Verify connection
	if err := tempClient.Ping(tempCtx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	// Initialize default indexes on test database
	db := tempClient.Database("test_project_management_init")
	indexModel := mongo.IndexModel{Keys: bson.D{{Key: "createdAt", Value: 1}}}
	collections := []string{"users", "workspaces", "boards", "items", "comments", "activities", "notifications"}
	for _, coll := range collections {
		if _, err := db.Collection(coll).Indexes().CreateOne(tempCtx, indexModel); err != nil {
			return nil, fmt.Errorf("failed to create index for %s: %w", coll, err)
		}
	}

	// Return a fresh connected client instance
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to connect MongoDB client: %w", err)
	}

	// Verify the connection
	if err := client.Ping(ctx, nil); err != nil {
		client.Disconnect(ctx)
		return nil, fmt.Errorf("failed to ping MongoDB with new client: %w", err)
	}

	return client, nil
}
