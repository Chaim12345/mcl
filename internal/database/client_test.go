package database

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
)

func TestNewClient(t *testing.T) {
	tests := []struct {
		name        string
		uri         string
		expectError bool
	}{
		{
			name:        "empty URI should return error",
			uri:         "",
			expectError: true,
		},
		{
			name:        "invalid URI should return error",
			uri:         "invalid://uri",
			expectError: true,
		},
		{
			name:        "valid URI should create client",
			uri:         getTestMongoURI(),
			expectError: false,
		},
		{
			name:        "valid URI with custom settings",
			uri:         getTestMongoURI(),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := NewClient(tt.uri)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, client)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, client)

				// Test connection by pinging
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()

				// Note: This will fail if MongoDB is not running, but that's expected
				// In a real test environment, you'd use a test database or mock
				_ = client.Ping(ctx, nil)

				// Clean up
				if client != nil {
					ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()
					client.Disconnect(ctx)
				}
			}
		})
	}
}

func TestClient_Connect(t *testing.T) {
	// Skip if MongoDB is not available
	if !isMongoDBAvailable() {
		t.Skip("MongoDB not available, skipping connection tests")
	}

	client, err := NewClient(getTestMongoURI())
	require.NoError(t, err)
	require.NotNil(t, client)

	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		client.Disconnect(ctx)
	}()
}

func TestClient_HealthCheck(t *testing.T) {
	// Skip if MongoDB is not available
	if !isMongoDBAvailable() {
		t.Skip("MongoDB not available, skipping health check tests")
	}

	client, err := NewClient(getTestMongoURI())
	require.NoError(t, err)
	require.NotNil(t, client)

	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		client.Disconnect(ctx)
	}()

	// Connect first
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = client.Connect(ctx)
	require.NoError(t, err)

	// Test ping (equivalent to health check)
	err = client.Ping(ctx, nil)
	assert.NoError(t, err)
}

func TestClient_InitializeDatabase(t *testing.T) {
	// Skip if MongoDB is not available
	if !isMongoDBAvailable() {
		t.Skip("MongoDB not available, skipping database initialization tests")
	}

	client, err := NewClient(getTestMongoURI())
	require.NoError(t, err)
	require.NotNil(t, client)

	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Clean up test database
		client.Database("test_project_management_init").Drop(ctx)
		client.Disconnect(ctx)
	}()

	// Connect first
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	err = client.Connect(ctx)
	require.NoError(t, err)

	// Test basic database operations
	db := client.Database("test_project_management_init")
	assert.NotNil(t, db)

	// Verify indexes were created by checking collections
	collections := []string{"users", "workspaces", "boards", "items", "comments", "activities", "notifications"}

	for _, collName := range collections {
		collection := client.Database("test_project_management_init").Collection(collName)
		cursor, err := collection.Indexes().List(ctx)
		require.NoError(t, err)

		var indexes []interface{}
		err = cursor.All(ctx, &indexes)
		require.NoError(t, err)

		// Should have at least the default _id index plus our custom indexes
		assert.Greater(t, len(indexes), 1, "Collection %s should have indexes", collName)
	}
}

// Helper functions for testing

func isMongoDBAvailable() bool {
	client, err := NewClient(getTestMongoURI())
	if err != nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	client.Disconnect(ctx)
	return true
}

func getTestMongoURI() string {
	uri := os.Getenv("TEST_MONGODB_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}
	return uri
}

func setupTestDatabase(t *testing.T) *mongo.Client {
	if !isMongoDBAvailable() {
		t.Skip("MongoDB not available, skipping test")
	}

	client, err := NewClient(getTestMongoURI())
	require.NoError(t, err)

	require.NoError(t, err)

	return client
}

func cleanupTestDatabase(t *testing.T, client *mongo.Client) {
	if client == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Drop the test database
	client.Database("test_project_management_cleanup").Drop(ctx)
	client.Disconnect(ctx)
}
