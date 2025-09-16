package migration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/logger"
)

// ItemMigrator handles item table migration
type ItemMigrator struct {
	logger *logger.Logger
}

// NewItemMigrator creates a new item migrator
func NewItemMigrator(logger *logger.Logger) *ItemMigrator {
	return &ItemMigrator{logger: logger}
}

// TableName returns the source table name
func (m *ItemMigrator) TableName() string {
	return "items"
}

// Migrate migrates items from PostgreSQL to MongoDB
func (m *ItemMigrator) Migrate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database, batchSize int, dryRun bool) error {
	m.logger.Info("Item migration not implemented yet")
	return nil
}

// Validate validates the migrated item data
func (m *ItemMigrator) Validate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database) error {
	m.logger.Info("Item validation not implemented yet")
	return nil
}

// Rollback removes migrated items
func (m *ItemMigrator) Rollback(ctx context.Context, targetDB *mongo.Database, rollbackData []byte) error {
	collection := targetDB.Collection("items")

	var data map[string]interface{}
	if len(rollbackData) > 0 {
		if err := json.Unmarshal(rollbackData, &data); err != nil {
			return fmt.Errorf("failed to parse rollback data: %w", err)
		}
	}

	filter := bson.M{}
	result, err := collection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete items: %w", err)
	}

	m.logger.Info("Item rollback completed", "deleted", result.DeletedCount)
	return nil
}
