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

// ActivityMigrator handles activity table migration
type ActivityMigrator struct {
	logger *logger.Logger
}

// NewActivityMigrator creates a new activity migrator
func NewActivityMigrator(logger *logger.Logger) *ActivityMigrator {
	return &ActivityMigrator{logger: logger}
}

// TableName returns the source table name
func (m *ActivityMigrator) TableName() string {
	return "activities"
}

// Migrate migrates activities from PostgreSQL to MongoDB
func (m *ActivityMigrator) Migrate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database, batchSize int, dryRun bool) error {
	m.logger.Info("Activity migration not implemented yet")
	return nil
}

// Validate validates the migrated activity data
func (m *ActivityMigrator) Validate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database) error {
	m.logger.Info("Activity validation not implemented yet")
	return nil
}

// Rollback removes migrated activities
func (m *ActivityMigrator) Rollback(ctx context.Context, targetDB *mongo.Database, rollbackData []byte) error {
	collection := targetDB.Collection("activities")

	var data map[string]interface{}
	if len(rollbackData) > 0 {
		if err := json.Unmarshal(rollbackData, &data); err != nil {
			return fmt.Errorf("failed to parse rollback data: %w", err)
		}
	}

	filter := bson.M{}
	result, err := collection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete activities: %w", err)
	}

	m.logger.Info("Activity rollback completed", "deleted", result.DeletedCount)
	return nil
}
