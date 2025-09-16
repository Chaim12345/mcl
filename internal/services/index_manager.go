package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// IndexManager manages MongoDB indexes for optimal query performance
type IndexManager struct {
	db     *mongo.Database
	logger *log.Logger
}

// NewIndexManager creates a new index manager
func NewIndexManager(db *mongo.Database, logger *log.Logger) *IndexManager {
	return &IndexManager{
		db:     db,
		logger: logger,
	}
}

// IndexDefinition represents a MongoDB index
type IndexDefinition struct {
	Collection string
	Keys       bson.D
	Options    *options.IndexOptions
	Name       string
}

// CreateAllIndexes creates all necessary indexes for optimal performance
func (im *IndexManager) CreateAllIndexes(ctx context.Context) error {
	indexes := im.getAllIndexDefinitions()
	
	for _, index := range indexes {
		if err := im.createIndex(ctx, index); err != nil {
			im.logger.Printf("Failed to create index %s on collection %s: %v", 
				index.Name, index.Collection, err)
			return fmt.Errorf("failed to create index %s: %w", index.Name, err)
		}
		im.logger.Printf("Successfully created index %s on collection %s", 
			index.Name, index.Collection)
	}
	
	return nil
}

// getAllIndexDefinitions returns all index definitions for the application
func (im *IndexManager) getAllIndexDefinitions() []IndexDefinition {
	return []IndexDefinition{
		// User indexes
		{
			Collection: "users",
			Keys:       bson.D{{Key: "email", Value: 1}},
			Options:    options.Index().SetUnique(true).SetName("email_unique"),
			Name:       "email_unique",
		},
		{
			Collection: "users",
			Keys:       bson.D{{Key: "emailVerified", Value: 1}},
			Options:    options.Index().SetName("email_verified"),
			Name:       "email_verified",
		},
		{
			Collection: "users",
			Keys:       bson.D{{Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("created_at_desc"),
			Name:       "created_at_desc",
		},
		{
			Collection: "users",
			Keys:       bson.D{{Key: "lastLoginAt", Value: -1}},
			Options:    options.Index().SetName("last_login_desc"),
			Name:       "last_login_desc",
		},

		// Workspace indexes
		{
			Collection: "workspaces",
			Keys:       bson.D{{Key: "ownerId", Value: 1}},
			Options:    options.Index().SetName("owner_id"),
			Name:       "owner_id",
		},
		{
			Collection: "workspaces",
			Keys:       bson.D{{Key: "members.userId", Value: 1}},
			Options:    options.Index().SetName("members_user_id"),
			Name:       "members_user_id",
		},
		{
			Collection: "workspaces",
			Keys:       bson.D{{Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("workspace_created_desc"),
			Name:       "workspace_created_desc",
		},
		{
			Collection: "workspaces",
			Keys:       bson.D{{Key: "ownerId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("owner_created_compound"),
			Name:       "owner_created_compound",
		},

		// Board indexes
		{
			Collection: "boards",
			Keys:       bson.D{{Key: "workspaceId", Value: 1}},
			Options:    options.Index().SetName("workspace_id"),
			Name:       "workspace_id",
		},
		{
			Collection: "boards",
			Keys:       bson.D{{Key: "workspaceId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("workspace_created_compound"),
			Name:       "workspace_created_compound",
		},
		{
			Collection: "boards",
			Keys:       bson.D{{Key: "createdBy", Value: 1}},
			Options:    options.Index().SetName("created_by"),
			Name:       "created_by",
		},
		{
			Collection: "boards",
			Keys:       bson.D{{Key: "name", Value: "text"}, {Key: "description", Value: "text"}},
			Options:    options.Index().SetName("board_text_search"),
			Name:       "board_text_search",
		},

		// Item indexes
		{
			Collection: "items",
			Keys:       bson.D{{Key: "boardId", Value: 1}},
			Options:    options.Index().SetName("board_id"),
			Name:       "board_id",
		},
		{
			Collection: "items",
			Keys:       bson.D{{Key: "boardId", Value: 1}, {Key: "position", Value: 1}},
			Options:    options.Index().SetName("board_position_compound"),
			Name:       "board_position_compound",
		},
		{
			Collection: "items",
			Keys:       bson.D{{Key: "assignees", Value: 1}},
			Options:    options.Index().SetName("assignees"),
			Name:       "assignees",
		},
		{
			Collection: "items",
			Keys:       bson.D{{Key: "createdBy", Value: 1}},
			Options:    options.Index().SetName("item_created_by"),
			Name:       "item_created_by",
		},
		{
			Collection: "items",
			Keys:       bson.D{{Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("item_created_desc"),
			Name:       "item_created_desc",
		},
		{
			Collection: "items",
			Keys:       bson.D{{Key: "updatedAt", Value: -1}},
			Options:    options.Index().SetName("item_updated_desc"),
			Name:       "item_updated_desc",
		},
		{
			Collection: "items",
			Keys:       bson.D{{Key: "name", Value: "text"}, {Key: "fieldValues.value", Value: "text"}},
			Options:    options.Index().SetName("item_text_search"),
			Name:       "item_text_search",
		},
		// Compound index for workspace-based item queries
		{
			Collection: "items",
			Keys:       bson.D{{Key: "boardId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("board_item_created_compound"),
			Name:       "board_item_created_compound",
		},

		// Comment indexes
		{
			Collection: "comments",
			Keys:       bson.D{{Key: "itemId", Value: 1}},
			Options:    options.Index().SetName("item_id"),
			Name:       "item_id",
		},
		{
			Collection: "comments",
			Keys:       bson.D{{Key: "itemId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("item_created_compound"),
			Name:       "item_created_compound",
		},
		{
			Collection: "comments",
			Keys:       bson.D{{Key: "authorId", Value: 1}},
			Options:    options.Index().SetName("author_id"),
			Name:       "author_id",
		},
		{
			Collection: "comments",
			Keys:       bson.D{{Key: "mentions", Value: 1}},
			Options:    options.Index().SetName("mentions"),
			Name:       "mentions",
		},
		{
			Collection: "comments",
			Keys:       bson.D{{Key: "parentId", Value: 1}},
			Options:    options.Index().SetName("parent_id"),
			Name:       "parent_id",
		},
		{
			Collection: "comments",
			Keys:       bson.D{{Key: "content", Value: "text"}},
			Options:    options.Index().SetName("comment_text_search"),
			Name:       "comment_text_search",
		},

		// Activity indexes
		{
			Collection: "activities",
			Keys:       bson.D{{Key: "workspaceId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("workspace_activity_timeline"),
			Name:       "workspace_activity_timeline",
		},
		{
			Collection: "activities",
			Keys:       bson.D{{Key: "boardId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("board_activity_timeline"),
			Name:       "board_activity_timeline",
		},
		{
			Collection: "activities",
			Keys:       bson.D{{Key: "itemId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("item_activity_timeline"),
			Name:       "item_activity_timeline",
		},
		{
			Collection: "activities",
			Keys:       bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("user_activity_timeline"),
			Name:       "user_activity_timeline",
		},
		{
			Collection: "activities",
			Keys:       bson.D{{Key: "entityId", Value: 1}, {Key: "entityType", Value: 1}},
			Options:    options.Index().SetName("entity_activity_compound"),
			Name:       "entity_activity_compound",
		},
		{
			Collection: "activities",
			Keys:       bson.D{{Key: "type", Value: 1}},
			Options:    options.Index().SetName("activity_type"),
			Name:       "activity_type",
		},

		// Notification indexes
		{
			Collection: "notifications",
			Keys:       bson.D{{Key: "userId", Value: 1}, {Key: "read", Value: 1}, {Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("user_notification_status"),
			Name:       "user_notification_status",
		},
		{
			Collection: "notifications",
			Keys:       bson.D{{Key: "userId", Value: 1}, {Key: "type", Value: 1}},
			Options:    options.Index().SetName("user_notification_type"),
			Name:       "user_notification_type",
		},
		{
			Collection: "notifications",
			Keys:       bson.D{{Key: "createdAt", Value: -1}},
			Options:    options.Index().SetName("notification_created_desc"),
			Name:       "notification_created_desc",
		},
		// TTL index for old notifications (delete after 90 days)
		{
			Collection: "notifications",
			Keys:       bson.D{{Key: "createdAt", Value: 1}},
			Options:    options.Index().SetExpireAfterSeconds(90 * 24 * 60 * 60).SetName("notification_ttl"),
			Name:       "notification_ttl",
		},

		// Saved Filter indexes
		{
			Collection: "saved_filters",
			Keys:       bson.D{{Key: "userId", Value: 1}},
			Options:    options.Index().SetName("user_saved_filters"),
			Name:       "user_saved_filters",
		},
		{
			Collection: "saved_filters",
			Keys:       bson.D{{Key: "userId", Value: 1}, {Key: "entityType", Value: 1}},
			Options:    options.Index().SetName("user_entity_filters"),
			Name:       "user_entity_filters",
		},
		{
			Collection: "saved_filters",
			Keys:       bson.D{{Key: "workspaceId", Value: 1}},
			Options:    options.Index().SetName("workspace_saved_filters"),
			Name:       "workspace_saved_filters",
		},
	}
}

// createIndex creates a single index
func (im *IndexManager) createIndex(ctx context.Context, indexDef IndexDefinition) error {
	collection := im.db.Collection(indexDef.Collection)
	
	// Check if index already exists
	cursor, err := collection.Indexes().List(ctx)
	if err != nil {
		return fmt.Errorf("failed to list existing indexes: %w", err)
	}
	defer cursor.Close(ctx)
	
	var existingIndexes []bson.M
	if err = cursor.All(ctx, &existingIndexes); err != nil {
		return fmt.Errorf("failed to decode existing indexes: %w", err)
	}
	
	// Check if index with same name already exists
	for _, existingIndex := range existingIndexes {
		if name, ok := existingIndex["name"].(string); ok && name == indexDef.Name {
			im.logger.Printf("Index %s already exists on collection %s", indexDef.Name, indexDef.Collection)
			return nil
		}
	}
	
	// Create the index
	indexModel := mongo.IndexModel{
		Keys:    indexDef.Keys,
		Options: indexDef.Options,
	}
	
	_, err = collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}
	
	return nil
}

// DropIndex drops a specific index
func (im *IndexManager) DropIndex(ctx context.Context, collectionName, indexName string) error {
	collection := im.db.Collection(collectionName)
	
	_, err := collection.Indexes().DropOne(ctx, indexName)
	if err != nil {
		return fmt.Errorf("failed to drop index %s from collection %s: %w", indexName, collectionName, err)
	}
	
	im.logger.Printf("Successfully dropped index %s from collection %s", indexName, collectionName)
	return nil
}

// ListIndexes lists all indexes for a collection
func (im *IndexManager) ListIndexes(ctx context.Context, collectionName string) ([]bson.M, error) {
	collection := im.db.Collection(collectionName)
	
	cursor, err := collection.Indexes().List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list indexes for collection %s: %w", collectionName, err)
	}
	defer cursor.Close(ctx)
	
	var indexes []bson.M
	if err = cursor.All(ctx, &indexes); err != nil {
		return nil, fmt.Errorf("failed to decode indexes: %w", err)
	}
	
	return indexes, nil
}

// GetIndexStats returns statistics about index usage
func (im *IndexManager) GetIndexStats(ctx context.Context, collectionName string) ([]bson.M, error) {
	collection := im.db.Collection(collectionName)
	
	pipeline := []bson.M{
		{"$indexStats": bson.M{}},
	}
	
	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to get index stats for collection %s: %w", collectionName, err)
	}
	defer cursor.Close(ctx)
	
	var stats []bson.M
	if err = cursor.All(ctx, &stats); err != nil {
		return nil, fmt.Errorf("failed to decode index stats: %w", err)
	}
	
	return stats, nil
}

// OptimizeCollection analyzes and suggests optimizations for a collection
func (im *IndexManager) OptimizeCollection(ctx context.Context, collectionName string) (*CollectionOptimization, error) {
	// Get collection stats
	var stats bson.M
	err := im.db.RunCommand(ctx, bson.D{
		{Key: "collStats", Value: collectionName},
		{Key: "indexDetails", Value: true},
	}).Decode(&stats)
	if err != nil {
		return nil, fmt.Errorf("failed to get collection stats: %w", err)
	}
	
	// Get index stats
	indexStats, err := im.GetIndexStats(ctx, collectionName)
	if err != nil {
		return nil, fmt.Errorf("failed to get index stats: %w", err)
	}
	
	optimization := &CollectionOptimization{
		Collection:    collectionName,
		DocumentCount: getInt64FromBSON(stats, "count"),
		TotalSize:     getInt64FromBSON(stats, "size"),
		IndexSize:     getInt64FromBSON(stats, "totalIndexSize"),
		IndexStats:    indexStats,
		Suggestions:   []string{},
	}
	
	// Analyze and provide suggestions
	optimization.Suggestions = im.analyzeIndexUsage(indexStats)
	
	return optimization, nil
}

// CollectionOptimization represents optimization analysis for a collection
type CollectionOptimization struct {
	Collection    string    `json:"collection"`
	DocumentCount int64     `json:"documentCount"`
	TotalSize     int64     `json:"totalSize"`
	IndexSize     int64     `json:"indexSize"`
	IndexStats    []bson.M  `json:"indexStats"`
	Suggestions   []string  `json:"suggestions"`
	AnalyzedAt    time.Time `json:"analyzedAt"`
}

// analyzeIndexUsage analyzes index usage and provides optimization suggestions
func (im *IndexManager) analyzeIndexUsage(indexStats []bson.M) []string {
	var suggestions []string
	
	for _, stat := range indexStats {
		name := getStringFromBSON(stat, "name")
		accesses := getInt64FromBSON(stat, "accesses.ops")
		
		if name == "_id_" {
			continue // Skip the default _id index
		}
		
		if accesses == 0 {
			suggestions = append(suggestions, fmt.Sprintf("Index '%s' has never been used - consider dropping it", name))
		} else if accesses < 10 {
			suggestions = append(suggestions, fmt.Sprintf("Index '%s' has low usage (%d accesses) - monitor for potential removal", name, accesses))
		}
	}
	
	return suggestions
}

// Helper functions to safely extract values from BSON
func getStringFromBSON(doc bson.M, key string) string {
	if val, ok := doc[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func getInt64FromBSON(doc bson.M, key string) int64 {
	if val, ok := doc[key]; ok {
		switch v := val.(type) {
		case int64:
			return v
		case int32:
			return int64(v)
		case int:
			return int64(v)
		case float64:
			return int64(v)
		}
	}
	return 0
}

// CreateIndexesForCollection creates indexes for a specific collection
func (im *IndexManager) CreateIndexesForCollection(ctx context.Context, collectionName string) error {
	indexes := im.getAllIndexDefinitions()
	
	for _, index := range indexes {
		if index.Collection == collectionName {
			if err := im.createIndex(ctx, index); err != nil {
				return fmt.Errorf("failed to create index %s: %w", index.Name, err)
			}
		}
	}
	
	return nil
}

// ValidateIndexes checks if all required indexes exist
func (im *IndexManager) ValidateIndexes(ctx context.Context) ([]string, error) {
	var missingIndexes []string
	requiredIndexes := im.getAllIndexDefinitions()
	
	for _, requiredIndex := range requiredIndexes {
		existingIndexes, err := im.ListIndexes(ctx, requiredIndex.Collection)
		if err != nil {
			return nil, fmt.Errorf("failed to list indexes for %s: %w", requiredIndex.Collection, err)
		}
		
		found := false
		for _, existingIndex := range existingIndexes {
			if name := getStringFromBSON(existingIndex, "name"); name == requiredIndex.Name {
				found = true
				break
			}
		}
		
		if !found {
			missingIndexes = append(missingIndexes, fmt.Sprintf("%s.%s", requiredIndex.Collection, requiredIndex.Name))
		}
	}
	
	return missingIndexes, nil
}