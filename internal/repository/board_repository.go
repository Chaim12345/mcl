package repository

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"project-management-platform/internal/models"
)

// boardRepository implements BoardRepository interface
type boardRepository struct {
	collection *mongo.Collection
}

// NewBoardRepository creates a new board repository
func NewBoardRepository(db *mongo.Database) BoardRepository {
	return &boardRepository{
		collection: db.Collection("boards"),
	}
}

// Create creates a new board
func (r *boardRepository) Create(ctx context.Context, board *models.Board) (*mongo.InsertOneResult, error) {
	if err := board.Validate(); err != nil {
		return nil, fmt.Errorf("board validation failed: %w", err)
	}

	// Set timestamps
	now := time.Now()
	board.CreatedAt = now
	board.UpdatedAt = now

	result, err := r.collection.InsertOne(ctx, board)
	if err != nil {
		return nil, fmt.Errorf("failed to create board: %w", err)
	}

	return result, nil
}

// GetByID retrieves a board by ID
func (r *boardRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Board, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("board ID is required")
	}

	var board models.Board
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&board)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("board not found")
		}
		return nil, fmt.Errorf("failed to get board: %w", err)
	}

	return &board, nil
}

// GetByWorkspaceID retrieves boards by workspace ID
func (r *boardRepository) GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID) ([]*models.Board, error) {
	if workspaceID.IsZero() {
		return nil, fmt.Errorf("workspace ID is required")
	}

	filter := bson.M{"workspaceId": workspaceID}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get boards by workspace ID: %w", err)
	}
	defer cursor.Close(ctx)

	var boards []*models.Board
	for cursor.Next(ctx) {
		var board models.Board
		if err := cursor.Decode(&board); err != nil {
			return nil, fmt.Errorf("failed to decode board: %w", err)
		}
		boards = append(boards, &board)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return boards, nil
}

// Update updates a board
func (r *boardRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("board ID is required")
	}

	if update == nil {
		return nil, fmt.Errorf("update data is required")
	}

	// Add updated timestamp
	update["updatedAt"] = time.Now()

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update board: %w", err)
	}

	if result.MatchedCount == 0 {
		return nil, fmt.Errorf("board not found")
	}

	return result, nil
}

// Delete deletes a board
func (r *boardRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("board ID is required")
	}

	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return nil, fmt.Errorf("failed to delete board: %w", err)
	}

	if result.DeletedCount == 0 {
		return nil, fmt.Errorf("board not found")
	}

	return result, nil
}

// List retrieves boards with pagination and filtering
func (r *boardRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Board, error) {
	if filter == nil {
		filter = bson.M{}
	}

	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list boards: %w", err)
	}
	defer cursor.Close(ctx)

	var boards []*models.Board
	for cursor.Next(ctx) {
		var board models.Board
		if err := cursor.Decode(&board); err != nil {
			return nil, fmt.Errorf("failed to decode board: %w", err)
		}
		boards = append(boards, &board)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return boards, nil
}

// Count counts boards matching the filter
func (r *boardRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	if filter == nil {
		filter = bson.M{}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count boards: %w", err)
	}

	return count, nil
}

// FindWithFilter finds boards with a custom filter and options
func (r *boardRepository) FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Board, error) {
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find boards with filter: %w", err)
	}
	defer cursor.Close(ctx)

	var boards []*models.Board
	for cursor.Next(ctx) {
		var board models.Board
		if err := cursor.Decode(&board); err != nil {
			return nil, fmt.Errorf("failed to decode board: %w", err)
		}
		boards = append(boards, &board)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return boards, nil
}

// CountWithFilter counts boards with a custom filter
func (r *boardRepository) CountWithFilter(ctx context.Context, filter bson.M) (int64, error) {
	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count boards with filter: %w", err)
	}
	return count, nil
}

// Aggregate performs aggregation operations on boards
func (r *boardRepository) Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error) {
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate boards: %w", err)
	}
	defer cursor.Close(ctx)

	var results []bson.M
	for cursor.Next(ctx) {
		var result bson.M
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode aggregation result: %w", err)
		}
		results = append(results, result)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return results, nil
}

// AddColumn adds a column to a board
func (r *boardRepository) AddColumn(ctx context.Context, boardID primitive.ObjectID, column models.BoardColumn) error {
	if boardID.IsZero() {
		return fmt.Errorf("board ID is required")
	}

	if column.ID == "" {
		return fmt.Errorf("column ID is required")
	}

	// Set timestamps
	now := time.Now()
	column.CreatedAt = now
	column.UpdatedAt = now

	update := bson.M{
		"$push": bson.M{"columns": column},
		"$set":  bson.M{"updatedAt": now},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": boardID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to add column: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("board not found")
	}

	return nil
}

// UpdateColumn updates a column in a board
func (r *boardRepository) UpdateColumn(ctx context.Context, boardID primitive.ObjectID, columnID string, column models.BoardColumn) error {
	if boardID.IsZero() {
		return fmt.Errorf("board ID is required")
	}

	if columnID == "" {
		return fmt.Errorf("column ID is required")
	}

	// Set updated timestamp
	column.UpdatedAt = time.Now()

	filter := bson.M{
		"_id":        boardID,
		"columns.id": columnID,
	}

	update := bson.M{
		"$set": bson.M{
			"columns.$": column,
			"updatedAt": column.UpdatedAt,
		},
	}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update column: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("board or column not found")
	}

	return nil
}

// RemoveColumn removes a column from a board
func (r *boardRepository) RemoveColumn(ctx context.Context, boardID primitive.ObjectID, columnID string) error {
	if boardID.IsZero() {
		return fmt.Errorf("board ID is required")
	}

	if columnID == "" {
		return fmt.Errorf("column ID is required")
	}

	update := bson.M{
		"$pull": bson.M{"columns": bson.M{"id": columnID}},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": boardID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to remove column: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("board not found")
	}

	if result.ModifiedCount == 0 {
		return fmt.Errorf("column not found")
	}

	return nil
}

// ReorderColumns reorders columns in a board
func (r *boardRepository) ReorderColumns(ctx context.Context, boardID primitive.ObjectID, columns []models.BoardColumn) error {
	if boardID.IsZero() {
		return fmt.Errorf("board ID is required")
	}

	// Update timestamps for all columns
	now := time.Now()
	for i := range columns {
		columns[i].UpdatedAt = now
	}

	update := bson.M{
		"$set": bson.M{
			"columns":   columns,
			"updatedAt": now,
		},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": boardID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to reorder columns: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("board not found")
	}

	return nil
}

// UpdatePermission updates or adds a permission for a board
func (r *boardRepository) UpdatePermission(ctx context.Context, boardID primitive.ObjectID, permission models.BoardPermission) error {
	if boardID.IsZero() {
		return fmt.Errorf("board ID is required")
	}

	if permission.UserID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Set timestamp
	permission.UpdatedAt = time.Now()

	// Check if permission already exists
	filter := bson.M{
		"_id":                boardID,
		"permissions.userId": permission.UserID,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check existing permission: %w", err)
	}

	var update bson.M
	if count > 0 {
		// Update existing permission
		update = bson.M{
			"$set": bson.M{
				"permissions.$.role":      permission.Permission,
				"permissions.$.updatedAt": permission.UpdatedAt,
				"updatedAt":               permission.UpdatedAt,
			},
		}
	} else {
		// Add new permission
		update = bson.M{
			"$push": bson.M{"permissions": permission},
			"$set":  bson.M{"updatedAt": permission.UpdatedAt},
		}
		filter = bson.M{"_id": boardID}
	}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update permission: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("board not found")
	}

	return nil
}

// GetPermissions retrieves permissions for a board
func (r *boardRepository) GetPermissions(ctx context.Context, boardID primitive.ObjectID) ([]models.BoardPermission, error) {
	if boardID.IsZero() {
		return nil, fmt.Errorf("board ID is required")
	}

	var board models.Board
	err := r.collection.FindOne(ctx, bson.M{"_id": boardID}).Decode(&board)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("board not found")
		}
		return nil, fmt.Errorf("failed to get board permissions: %w", err)
	}

	return board.Permissions, nil
}

// RemovePermission removes a permission from a board
func (r *boardRepository) RemovePermission(ctx context.Context, boardID primitive.ObjectID, userID primitive.ObjectID) error {
	if boardID.IsZero() {
		return fmt.Errorf("board ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	update := bson.M{
		"$pull": bson.M{"permissions": bson.M{"userId": userID}},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": boardID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to remove permission: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("board not found")
	}

	if result.ModifiedCount == 0 {
		return fmt.Errorf("permission not found")
	}

	return nil
}
