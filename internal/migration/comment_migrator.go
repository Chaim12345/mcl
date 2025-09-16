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

// CommentMigrator handles comment table migration
type CommentMigrator struct {
	logger *logger.Logger
}

// NewCommentMigrator creates a new comment migrator
func NewCommentMigrator(logger *logger.Logger) *CommentMigrator {
	return &CommentMigrator{logger: logger}
}

// TableName returns the source table name
func (m *CommentMigrator) TableName() string {
	return "comments"
}

// Migrate migrates comments from PostgreSQL to MongoDB
func (m *CommentMigrator) Migrate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database, batchSize int, dryRun bool) error {
	m.logger.Info("Comment migration not implemented yet")
	return nil
}

// Validate validates the migrated comment data
func (m *CommentMigrator) Validate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database) error {
	m.logger.Info("Comment validation not implemented yet")
	return nil
}

// Rollback removes migrated comments
func (m *CommentMigrator) Rollback(ctx context.Context, targetDB *mongo.Database, rollbackData []byte) error {
	collection := targetDB.Collection("comments")

	var data map[string]interface{}
	if len(rollbackData) > 0 {
		if err := json.Unmarshal(rollbackData, &data); err != nil {
			return fmt.Errorf("failed to parse rollback data: %w", err)
		}
	}

	filter := bson.M{}
	result, err := collection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete comments: %w", err)
	}

	m.logger.Info("Comment rollback completed", "deleted", result.DeletedCount)
	return nil
}
