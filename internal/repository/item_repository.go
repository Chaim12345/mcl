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

// itemRepository implements ItemRepository interface
type itemRepository struct {
	collection *mongo.Collection
}

// NewItemRepository creates a new item repository
func NewItemRepository(db *mongo.Database) ItemRepository {
	return &itemRepository{
		collection: db.Collection("items"),
	}
}

// Create creates a new item
func (r *itemRepository) Create(ctx context.Context, item *models.Item) (*mongo.InsertOneResult, error) {
	if err := item.Validate(); err != nil {
		return nil, fmt.Errorf("item validation failed: %w", err)
	}

	// Set timestamps
	now := time.Now()
	item.CreatedAt = now
	item.UpdatedAt = now

	result, err := r.collection.InsertOne(ctx, item)
	if err != nil {
		return nil, fmt.Errorf("failed to create item: %w", err)
	}

	return result, nil
}

// GetByID retrieves an item by ID
func (r *itemRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Item, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("item ID is required")
	}

	var item models.Item
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("item not found")
		}
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	return &item, nil
}

// GetByBoardID retrieves items by board ID
func (r *itemRepository) GetByBoardID(ctx context.Context, boardID primitive.ObjectID) ([]*models.Item, error) {
	if boardID.IsZero() {
		return nil, fmt.Errorf("board ID is required")
	}

	filter := bson.M{"boardId": boardID}
	opts := options.Find().SetSort(bson.M{"position": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get items by board ID: %w", err)
	}
	defer cursor.Close(ctx)

	var items []*models.Item
	for cursor.Next(ctx) {
		var item models.Item
		if err := cursor.Decode(&item); err != nil {
			return nil, fmt.Errorf("failed to decode item: %w", err)
		}
		items = append(items, &item)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return items, nil
}

// Update updates an item
func (r *itemRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("item ID is required")
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
		return nil, fmt.Errorf("failed to update item: %w", err)
	}

	if result.MatchedCount == 0 {
		return nil, fmt.Errorf("item not found")
	}

	return result, nil
}

// Delete deletes an item
func (r *itemRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("item ID is required")
	}

	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return nil, fmt.Errorf("failed to delete item: %w", err)
	}

	if result.DeletedCount == 0 {
		return nil, fmt.Errorf("item not found")
	}

	return result, nil
}

// List retrieves items with pagination and supports filtering by status, priority, and date
func (r *itemRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Item, error) {
	if filter == nil {
		filter = bson.M{}
	}

	opts := options.Find()
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}
	opts.SetSort(bson.M{"position": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list items: %w", err)
	}
	defer cursor.Close(ctx)

	var items []*models.Item
	for cursor.Next(ctx) {
		var item models.Item
		if err := cursor.Decode(&item); err != nil {
			return nil, fmt.Errorf("failed to decode item: %w", err)
		}
		items = append(items, &item)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return items, nil
}

// SearchText performs a text search across item titles and descriptions with ranking and pagination
func (r *itemRepository) SearchText(ctx context.Context, query string, limit, skip int64) ([]*models.Item, error) {
	if query == "" {
		return nil, fmt.Errorf("search query is required")
	}

	filter := bson.M{"$text": bson.M{"$search": query}}
	opts := options.Find().SetSort(bson.M{"score": bson.M{"$meta": "textScore"}})
	opts.SetProjection(bson.M{"score": bson.M{"$meta": "textScore"}})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to perform text search: %w", err)
	}
	defer cursor.Close(ctx)

	var items []*models.Item
	for cursor.Next(ctx) {
		var item models.Item
		if err := cursor.Decode(&item); err != nil {
			return nil, fmt.Errorf("failed to decode item: %w", err)
		}
		items = append(items, &item)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return items, nil
}

// Count counts items matching the filter
func (r *itemRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	if filter == nil {
		filter = bson.M{}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count items: %w", err)
	}

	return count, nil
}

// UpdatePosition updates an item's position
func (r *itemRepository) UpdatePosition(ctx context.Context, id primitive.ObjectID, position int) error {
	if id.IsZero() {
		return fmt.Errorf("item ID is required")
	}

	if position < 0 {
		return fmt.Errorf("position must be non-negative")
	}

	update := bson.M{
		"position":  position,
		"updatedAt": time.Now(),
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("failed to update position: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("item not found")
	}

	return nil
}

// UpdateFieldValue updates or adds a field value for an item
func (r *itemRepository) UpdateFieldValue(ctx context.Context, itemID primitive.ObjectID, fieldValue models.ItemFieldValue) error {
	if itemID.IsZero() {
		return fmt.Errorf("item ID is required")
	}

	if fieldValue.ColumnID == "" {
		return fmt.Errorf("column ID is required")
	}

	if fieldValue.UpdatedBy.IsZero() {
		return fmt.Errorf("updated by user ID is required")
	}

	// Set timestamp
	fieldValue.UpdatedAt = time.Now()

	// Check if field value already exists
	filter := bson.M{
		"_id":                  itemID,
		"fieldValues.columnId": fieldValue.ColumnID,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check existing field value: %w", err)
	}

	var update bson.M
	if count > 0 {
		// Update existing field value
		update = bson.M{
			"$set": bson.M{
				"fieldValues.$.value":     fieldValue.Value,
				"fieldValues.$.updatedAt": fieldValue.UpdatedAt,
				"fieldValues.$.updatedBy": fieldValue.UpdatedBy,
				"updatedAt":               fieldValue.UpdatedAt,
			},
		}
	} else {
		// Add new field value
		update = bson.M{
			"$push": bson.M{"fieldValues": fieldValue},
			"$set":  bson.M{"updatedAt": fieldValue.UpdatedAt},
		}
		filter = bson.M{"_id": itemID}
	}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update field value: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("item not found")
	}

	return nil
}

// AddAssignee adds an assignee to an item
func (r *itemRepository) AddAssignee(ctx context.Context, itemID, userID primitive.ObjectID) error {
	if itemID.IsZero() {
		return fmt.Errorf("item ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Check if user is already assigned
	filter := bson.M{
		"_id":       itemID,
		"assignees": userID,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check existing assignee: %w", err)
	}

	if count > 0 {
		return fmt.Errorf("user is already assigned to this item")
	}

	// Add assignee
	update := bson.M{
		"$push": bson.M{"assignees": userID},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": itemID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to add assignee: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("item not found")
	}

	return nil
}

// RemoveAssignee removes an assignee from an item
func (r *itemRepository) RemoveAssignee(ctx context.Context, itemID, userID primitive.ObjectID) error {
	if itemID.IsZero() {
		return fmt.Errorf("item ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Remove assignee
	update := bson.M{
		"$pull": bson.M{"assignees": userID},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": itemID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to remove assignee: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("item not found")
	}

	if result.ModifiedCount == 0 {
		return fmt.Errorf("user is not assigned to this item")
	}

	return nil
}

// AddWatcher adds a watcher to an item
func (r *itemRepository) AddWatcher(ctx context.Context, itemID, userID primitive.ObjectID) error {
	if itemID.IsZero() {
		return fmt.Errorf("item ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Check if user is already watching
	filter := bson.M{
		"_id":      itemID,
		"watchers": userID,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check existing watcher: %w", err)
	}

	if count > 0 {
		return fmt.Errorf("user is already watching this item")
	}

	// Add watcher
	update := bson.M{
		"$push": bson.M{"watchers": userID},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": itemID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to add watcher: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("item not found")
	}

	return nil
}

// RemoveWatcher removes a watcher from an item
func (r *itemRepository) RemoveWatcher(ctx context.Context, itemID, userID primitive.ObjectID) error {
	if itemID.IsZero() {
		return fmt.Errorf("item ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Remove watcher
	update := bson.M{
		"$pull": bson.M{"watchers": userID},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": itemID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to remove watcher: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("item not found")
	}

	if result.ModifiedCount == 0 {
		return fmt.Errorf("user is not watching this item")
	}

	return nil
}

// GetByAssignee retrieves items assigned to a user
func (r *itemRepository) GetByAssignee(ctx context.Context, userID primitive.ObjectID) ([]*models.Item, error) {
	if userID.IsZero() {
		return nil, fmt.Errorf("user ID is required")
	}

	filter := bson.M{"assignees": userID}
	opts := options.Find().SetSort(bson.M{"updatedAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get items by assignee: %w", err)
	}
	defer cursor.Close(ctx)

	var items []*models.Item
	for cursor.Next(ctx) {
		var item models.Item
		if err := cursor.Decode(&item); err != nil {
			return nil, fmt.Errorf("failed to decode item: %w", err)
		}
		items = append(items, &item)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return items, nil
}

// FindWithFilter finds items with a custom filter and options
func (r *itemRepository) FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Item, error) {
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find items with filter: %w", err)
	}
	defer cursor.Close(ctx)

	var items []*models.Item
	for cursor.Next(ctx) {
		var item models.Item
		if err := cursor.Decode(&item); err != nil {
			return nil, fmt.Errorf("failed to decode item: %w", err)
		}
		items = append(items, &item)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return items, nil
}

// CountWithFilter counts items with a custom filter
func (r *itemRepository) CountWithFilter(ctx context.Context, filter bson.M) (int64, error) {
	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count items with filter: %w", err)
	}
	return count, nil
}

// Aggregate performs aggregation operations on items
func (r *itemRepository) Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error) {
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate items: %w", err)
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
