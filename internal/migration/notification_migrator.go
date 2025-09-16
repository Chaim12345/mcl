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

// NotificationMigrator handles notification table migration
type NotificationMigrator struct {
	logger *logger.Logger
}

// NewNotificationMigrator creates a new notification migrator
func NewNotificationMigrator(logger *logger.Logger) *NotificationMigrator {
	return &NotificationMigrator{logger: logger}
}

// TableName returns the source table name
func (m *NotificationMigrator) TableName() string {
	return "notifications"
}

// Migrate migrates notifications from PostgreSQL to MongoDB
func (m *NotificationMigrator) Migrate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database, batchSize int, dryRun bool) error {
	m.logger.Info("Notification migration not implemented yet")
	return nil
}

// Validate validates the migrated notification data
func (m *NotificationMigrator) Validate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database) error {
	m.logger.Info("Notification validation not implemented yet")
	return nil
}

// Rollback removes migrated notifications
func (m *NotificationMigrator) Rollback(ctx context.Context, targetDB *mongo.Database, rollbackData []byte) error {
	collection := targetDB.Collection("notifications")

	var data map[string]interface{}
	if len(rollbackData) > 0 {
		if err := json.Unmarshal(rollbackData, &data); err != nil {
			return fmt.Errorf("failed to parse rollback data: %w", err)
		}
	}

	filter := bson.M{}
	result, err := collection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete notifications: %w", err)
	}

	m.logger.Info("Notification rollback completed", "deleted", result.DeletedCount)
	return nil
}
