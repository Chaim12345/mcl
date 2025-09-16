package database

import (
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateSearchIndexes creates MongoDB text search indexes for search functionality
func CreateSearchIndexes(ctx context.Context, db *mongo.Database) error {
	log.Println("Creating search indexes...")

	// Create text index for items collection
	if err := createItemsTextIndex(ctx, db); err != nil {
		return fmt.Errorf("failed to create items text index: %w", err)
	}

	// Create text index for comments collection
	if err := createCommentsTextIndex(ctx, db); err != nil {
		return fmt.Errorf("failed to create comments text index: %w", err)
	}

	// Create text index for boards collection
	if err := createBoardsTextIndex(ctx, db); err != nil {
		return fmt.Errorf("failed to create boards text index: %w", err)
	}

	// Create additional indexes for search performance
	if err := createSearchPerformanceIndexes(ctx, db); err != nil {
		return fmt.Errorf("failed to create search performance indexes: %w", err)
	}

	log.Println("Search indexes created successfully")
	return nil
}

// createItemsTextIndex creates a text search index for the items collection
func createItemsTextIndex(ctx context.Context, db *mongo.Database) error {
	collection := db.Collection("items")

	// Create compound text index on name and field values
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "name", Value: "text"},
			{Key: "fieldValues.value", Value: "text"},
		},
		Options: options.Index().
			SetName("items_text_search").
			SetWeights(bson.M{
				"name":               10, // Higher weight for name matches
				"fieldValues.value":  5,  // Lower weight for field value matches
			}).
			SetDefaultLanguage("english").
			SetLanguageOverride("language"),
	}

	_, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return fmt.Errorf("failed to create items text index: %w", err)
	}

	log.Println("Created text index for items collection")
	return nil
}

// createCommentsTextIndex creates a text search index for the comments collection
func createCommentsTextIndex(ctx context.Context, db *mongo.Database) error {
	collection := db.Collection("comments")

	// Create text index on comment content
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "content", Value: "text"},
		},
		Options: options.Index().
			SetName("comments_text_search").
			SetDefaultLanguage("english").
			SetLanguageOverride("language"),
	}

	_, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return fmt.Errorf("failed to create comments text index: %w", err)
	}

	log.Println("Created text index for comments collection")
	return nil
}

// createBoardsTextIndex creates a text search index for the boards collection
func createBoardsTextIndex(ctx context.Context, db *mongo.Database) error {
	collection := db.Collection("boards")

	// Create compound text index on name and description
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "name", Value: "text"},
			{Key: "description", Value: "text"},
		},
		Options: options.Index().
			SetName("boards_text_search").
			SetWeights(bson.M{
				"name":        15, // Higher weight for name matches
				"description": 8,  // Lower weight for description matches
			}).
			SetDefaultLanguage("english").
			SetLanguageOverride("language"),
	}

	_, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return fmt.Errorf("failed to create boards text index: %w", err)
	}

	log.Println("Created text index for boards collection")
	return nil
}

// createSearchPerformanceIndexes creates additional indexes to improve search performance
func createSearchPerformanceIndexes(ctx context.Context, db *mongo.Database) error {
	// Items collection performance indexes
	itemsCollection := db.Collection("items")
	
	// Index for filtering items by board and workspace (via board lookup)
	itemsBoardIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "boardId", Value: 1},
			{Key: "createdAt", Value: -1},
		},
		Options: options.Index().SetName("items_board_created"),
	}
	
	_, err := itemsCollection.Indexes().CreateOne(ctx, itemsBoardIndex)
	if err != nil {
		return fmt.Errorf("failed to create items board index: %w", err)
	}

	// Comments collection performance indexes
	commentsCollection := db.Collection("comments")
	
	// Index for filtering comments by item
	commentsItemIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "itemId", Value: 1},
			{Key: "createdAt", Value: -1},
		},
		Options: options.Index().SetName("comments_item_created"),
	}
	
	_, err = commentsCollection.Indexes().CreateOne(ctx, commentsItemIndex)
	if err != nil {
		return fmt.Errorf("failed to create comments item index: %w", err)
	}

	// Boards collection performance indexes
	boardsCollection := db.Collection("boards")
	
	// Index for filtering boards by workspace
	boardsWorkspaceIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "workspaceId", Value: 1},
			{Key: "createdAt", Value: -1},
		},
		Options: options.Index().SetName("boards_workspace_created"),
	}
	
	_, err = boardsCollection.Indexes().CreateOne(ctx, boardsWorkspaceIndex)
	if err != nil {
		return fmt.Errorf("failed to create boards workspace index: %w", err)
	}

	log.Println("Created search performance indexes")
	return nil
}

// DropSearchIndexes drops all search-related indexes (useful for testing or migration)
func DropSearchIndexes(ctx context.Context, db *mongo.Database) error {
	log.Println("Dropping search indexes...")

	collections := []string{"items", "comments", "boards"}
	indexNames := []string{
		"items_text_search",
		"items_board_created",
		"comments_text_search", 
		"comments_item_created",
		"boards_text_search",
		"boards_workspace_created",
	}

	for i, collectionName := range collections {
		collection := db.Collection(collectionName)
		
		// Drop text search index
		if i < len(indexNames) {
			_, err := collection.Indexes().DropOne(ctx, indexNames[i])
			if err != nil {
				log.Printf("Warning: failed to drop index %s: %v", indexNames[i], err)
			}
		}
	}

	log.Println("Search indexes dropped")
	return nil
}

// ListSearchIndexes lists all search-related indexes for debugging
func ListSearchIndexes(ctx context.Context, db *mongo.Database) error {
	collections := []string{"items", "comments", "boards"}

	for _, collectionName := range collections {
		collection := db.Collection(collectionName)
		
		log.Printf("Indexes for collection '%s':", collectionName)
		
		cursor, err := collection.Indexes().List(ctx)
		if err != nil {
			return fmt.Errorf("failed to list indexes for %s: %w", collectionName, err)
		}
		defer cursor.Close(ctx)

		var indexes []bson.M
		if err = cursor.All(ctx, &indexes); err != nil {
			return fmt.Errorf("failed to decode indexes for %s: %w", collectionName, err)
		}

		for _, index := range indexes {
			if name, ok := index["name"].(string); ok {
				log.Printf("  - %s", name)
				if keys, ok := index["key"].(bson.M); ok {
					log.Printf("    Keys: %v", keys)
				}
			}
		}
	}

	return nil
}

// EnsureSearchIndexes ensures all search indexes exist, creating them if they don't
func EnsureSearchIndexes(ctx context.Context, db *mongo.Database) error {
	log.Println("Ensuring search indexes exist...")

	// Check if indexes exist and create them if they don't
	collections := map[string][]string{
		"items":    {"items_text_search", "items_board_created"},
		"comments": {"comments_text_search", "comments_item_created"},
		"boards":   {"boards_text_search", "boards_workspace_created"},
	}

	for collectionName, expectedIndexes := range collections {
		collection := db.Collection(collectionName)
		
		// Get existing indexes
		cursor, err := collection.Indexes().List(ctx)
		if err != nil {
			return fmt.Errorf("failed to list indexes for %s: %w", collectionName, err)
		}

		var existingIndexes []bson.M
		if err = cursor.All(ctx, &existingIndexes); err != nil {
			cursor.Close(ctx)
			return fmt.Errorf("failed to decode indexes for %s: %w", collectionName, err)
		}
		cursor.Close(ctx)

		// Check which indexes are missing
		existingNames := make(map[string]bool)
		for _, index := range existingIndexes {
			if name, ok := index["name"].(string); ok {
				existingNames[name] = true
			}
		}

		// Create missing indexes
		for _, expectedIndex := range expectedIndexes {
			if !existingNames[expectedIndex] {
				log.Printf("Index '%s' missing from collection '%s', creating...", expectedIndex, collectionName)
				
				// Recreate the specific index
				switch expectedIndex {
				case "items_text_search":
					if err := createItemsTextIndex(ctx, db); err != nil {
						return err
					}
				case "items_board_created":
					// Create this specific index
					indexModel := mongo.IndexModel{
						Keys: bson.D{
							{Key: "boardId", Value: 1},
							{Key: "createdAt", Value: -1},
						},
						Options: options.Index().SetName("items_board_created"),
					}
					_, err := collection.Indexes().CreateOne(ctx, indexModel)
					if err != nil {
						return fmt.Errorf("failed to create items board index: %w", err)
					}
				case "comments_text_search":
					if err := createCommentsTextIndex(ctx, db); err != nil {
						return err
					}
				case "comments_item_created":
					indexModel := mongo.IndexModel{
						Keys: bson.D{
							{Key: "itemId", Value: 1},
							{Key: "createdAt", Value: -1},
						},
						Options: options.Index().SetName("comments_item_created"),
					}
					_, err := collection.Indexes().CreateOne(ctx, indexModel)
					if err != nil {
						return fmt.Errorf("failed to create comments item index: %w", err)
					}
				case "boards_text_search":
					if err := createBoardsTextIndex(ctx, db); err != nil {
						return err
					}
				case "boards_workspace_created":
					indexModel := mongo.IndexModel{
						Keys: bson.D{
							{Key: "workspaceId", Value: 1},
							{Key: "createdAt", Value: -1},
						},
						Options: options.Index().SetName("boards_workspace_created"),
					}
					_, err := collection.Indexes().CreateOne(ctx, indexModel)
					if err != nil {
						return fmt.Errorf("failed to create boards workspace index: %w", err)
					}
				}
			}
		}
	}

	log.Println("Search indexes ensured")
	return nil
}