package services

import (
	"fmt"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
)

// FilterBuilder converts filter queries to MongoDB queries
type FilterBuilder struct {
	entityType string // "item", "comment", "board", etc.
}

// NewFilterBuilder creates a new filter builder for a specific entity type
func NewFilterBuilder(entityType string) *FilterBuilder {
	return &FilterBuilder{
		entityType: entityType,
	}
}

// BuildQuery converts a FilterQuery to a MongoDB bson.M query
func (fb *FilterBuilder) BuildQuery(filterQuery models.FilterQuery) (bson.M, error) {
	if err := filterQuery.Validate(); err != nil {
		return nil, fmt.Errorf("invalid filter query: %w", err)
	}

	if len(filterQuery.Groups) == 0 {
		return bson.M{}, nil
	}

	if len(filterQuery.Groups) == 1 {
		// Single group - no need for top-level logic
		return fb.buildGroupQuery(filterQuery.Groups[0])
	}

	// Multiple groups - combine with logic
	var groupQueries []bson.M
	for _, group := range filterQuery.Groups {
		groupQuery, err := fb.buildGroupQuery(group)
		if err != nil {
			return nil, fmt.Errorf("failed to build group query: %w", err)
		}
		groupQueries = append(groupQueries, groupQuery)
	}

	if filterQuery.Logic == models.FilterLogicAnd {
		return bson.M{"$and": groupQueries}, nil
	} else {
		return bson.M{"$or": groupQueries}, nil
	}
} // buildGroupQuery converts a FilterGroup to a MongoDB query
func (fb *FilterBuilder) buildGroupQuery(group models.FilterGroup) (bson.M, error) {
	if len(group.Conditions) == 0 {
		return bson.M{}, nil
	}

	if len(group.Conditions) == 1 {
		// Single condition - no need for group logic
		return fb.buildConditionQuery(group.Conditions[0])
	}

	// Multiple conditions - combine with logic
	var conditionQueries []bson.M
	for _, condition := range group.Conditions {
		conditionQuery, err := fb.buildConditionQuery(condition)
		if err != nil {
			return nil, fmt.Errorf("failed to build condition query: %w", err)
		}
		conditionQueries = append(conditionQueries, conditionQuery)
	}

	if group.Logic == models.FilterLogicAnd {
		return bson.M{"$and": conditionQueries}, nil
	} else {
		return bson.M{"$or": conditionQueries}, nil
	}
}

// buildConditionQuery converts a FilterCondition to a MongoDB query
func (fb *FilterBuilder) buildConditionQuery(condition models.FilterCondition) (bson.M, error) {
	field := fb.normalizeFieldName(condition.Field)

	switch condition.Operator {
	case models.FilterOpEquals:
		return bson.M{field: condition.Value}, nil

	case models.FilterOpNotEquals:
		return bson.M{field: bson.M{"$ne": condition.Value}}, nil

	case models.FilterOpContains:
		if condition.Type == models.FilterFieldTypeText {
			return bson.M{field: bson.M{"$regex": regexp.QuoteMeta(fmt.Sprintf("%v", condition.Value)), "$options": "i"}}, nil
		} else if condition.Type == models.FilterFieldTypeArray {
			return bson.M{field: bson.M{"$in": []interface{}{condition.Value}}}, nil
		}
		return nil, fmt.Errorf("contains operator not supported for field type %s", condition.Type)

	case models.FilterOpNotContains:
		if condition.Type == models.FilterFieldTypeText {
			return bson.M{field: bson.M{"$not": bson.M{"$regex": regexp.QuoteMeta(fmt.Sprintf("%v", condition.Value)), "$options": "i"}}}, nil
		} else if condition.Type == models.FilterFieldTypeArray {
			return bson.M{field: bson.M{"$nin": []interface{}{condition.Value}}}, nil
		}
		return nil, fmt.Errorf("not_contains operator not supported for field type %s", condition.Type)

	case models.FilterOpStartsWith:
		if condition.Type != models.FilterFieldTypeText {
			return nil, fmt.Errorf("starts_with operator only supported for text fields")
		}
		return bson.M{field: bson.M{"$regex": "^" + regexp.QuoteMeta(fmt.Sprintf("%v", condition.Value)), "$options": "i"}}, nil

	case models.FilterOpEndsWith:
		if condition.Type != models.FilterFieldTypeText {
			return nil, fmt.Errorf("ends_with operator only supported for text fields")
		}
		return bson.M{field: bson.M{"$regex": regexp.QuoteMeta(fmt.Sprintf("%v", condition.Value)) + "$", "$options": "i"}}, nil

	case models.FilterOpRegex:
		if condition.Type != models.FilterFieldTypeText {
			return nil, fmt.Errorf("regex operator only supported for text fields")
		}
		return bson.M{field: bson.M{"$regex": condition.Value, "$options": "i"}}, nil

	case models.FilterOpGreaterThan:
		return bson.M{field: bson.M{"$gt": condition.Value}}, nil

	case models.FilterOpLessThan:
		return bson.M{field: bson.M{"$lt": condition.Value}}, nil

	case models.FilterOpBetween:
		values, ok := condition.Value.([]interface{})
		if !ok || len(values) != 2 {
			return nil, fmt.Errorf("between operator requires an array of 2 values")
		}
		return bson.M{field: bson.M{"$gte": values[0], "$lte": values[1]}}, nil

	case models.FilterOpNotBetween:
		values, ok := condition.Value.([]interface{})
		if !ok || len(values) != 2 {
			return nil, fmt.Errorf("not_between operator requires an array of 2 values")
		}
		return bson.M{"$or": []bson.M{
			{field: bson.M{"$lt": values[0]}},
			{field: bson.M{"$gt": values[1]}},
		}}, nil

	case models.FilterOpIn:
		values, ok := condition.Value.([]interface{})
		if !ok {
			return nil, fmt.Errorf("in operator requires an array of values")
		}
		return bson.M{field: bson.M{"$in": values}}, nil

	case models.FilterOpNotIn:
		values, ok := condition.Value.([]interface{})
		if !ok {
			return nil, fmt.Errorf("not_in operator requires an array of values")
		}
		return bson.M{field: bson.M{"$nin": values}}, nil

	case models.FilterOpContainsAny:
		if condition.Type != models.FilterFieldTypeArray {
			return nil, fmt.Errorf("contains_any operator only supported for array fields")
		}
		values, ok := condition.Value.([]interface{})
		if !ok {
			return nil, fmt.Errorf("contains_any operator requires an array of values")
		}
		return bson.M{field: bson.M{"$in": values}}, nil

	case models.FilterOpContainsAll:
		if condition.Type != models.FilterFieldTypeArray {
			return nil, fmt.Errorf("contains_all operator only supported for array fields")
		}
		values, ok := condition.Value.([]interface{})
		if !ok {
			return nil, fmt.Errorf("contains_all operator requires an array of values")
		}
		return bson.M{field: bson.M{"$all": values}}, nil

	case models.FilterOpBefore:
		if condition.Type != models.FilterFieldTypeDate {
			return nil, fmt.Errorf("before operator only supported for date fields")
		}
		date, err := fb.parseDate(condition.Value)
		if err != nil {
			return nil, fmt.Errorf("invalid date value: %w", err)
		}
		return bson.M{field: bson.M{"$lt": date}}, nil

	case models.FilterOpAfter:
		if condition.Type != models.FilterFieldTypeDate {
			return nil, fmt.Errorf("after operator only supported for date fields")
		}
		date, err := fb.parseDate(condition.Value)
		if err != nil {
			return nil, fmt.Errorf("invalid date value: %w", err)
		}
		return bson.M{field: bson.M{"$gt": date}}, nil

	case models.FilterOpDateBetween:
		if condition.Type != models.FilterFieldTypeDate {
			return nil, fmt.Errorf("date_between operator only supported for date fields")
		}
		values, ok := condition.Value.([]interface{})
		if !ok || len(values) != 2 {
			return nil, fmt.Errorf("date_between operator requires an array of 2 date values")
		}
		startDate, err := fb.parseDate(values[0])
		if err != nil {
			return nil, fmt.Errorf("invalid start date: %w", err)
		}
		endDate, err := fb.parseDate(values[1])
		if err != nil {
			return nil, fmt.Errorf("invalid end date: %w", err)
		}
		return bson.M{field: bson.M{"$gte": startDate, "$lte": endDate}}, nil

	case models.FilterOpRelative:
		if condition.Type != models.FilterFieldTypeDate {
			return nil, fmt.Errorf("relative operator only supported for date fields")
		}
		periodStr, ok := condition.Value.(string)
		if !ok {
			return nil, fmt.Errorf("relative operator requires a string period")
		}
		period := models.RelativeDatePeriod(periodStr)
		startDate, endDate, err := models.GetRelativeDateRange(period)
		if err != nil {
			return nil, fmt.Errorf("invalid relative period: %w", err)
		}
		return bson.M{field: bson.M{"$gte": startDate, "$lt": endDate}}, nil

	case models.FilterOpEmpty:
		if condition.Type == models.FilterFieldTypeText {
			return bson.M{"$or": []bson.M{
				{field: bson.M{"$exists": false}},
				{field: ""},
				{field: nil},
			}}, nil
		} else if condition.Type == models.FilterFieldTypeArray {
			return bson.M{"$or": []bson.M{
				{field: bson.M{"$exists": false}},
				{field: bson.M{"$size": 0}},
				{field: nil},
			}}, nil
		}
		return bson.M{"$or": []bson.M{
			{field: bson.M{"$exists": false}},
			{field: nil},
		}}, nil

	case models.FilterOpNotEmpty:
		if condition.Type == models.FilterFieldTypeText {
			return bson.M{"$and": []bson.M{
				{field: bson.M{"$exists": true}},
				{field: bson.M{"$ne": ""}},
				{field: bson.M{"$ne": nil}},
			}}, nil
		} else if condition.Type == models.FilterFieldTypeArray {
			return bson.M{"$and": []bson.M{
				{field: bson.M{"$exists": true}},
				{field: bson.M{"$not": bson.M{"$size": 0}}},
				{field: bson.M{"$ne": nil}},
			}}, nil
		}
		return bson.M{"$and": []bson.M{
			{field: bson.M{"$exists": true}},
			{field: bson.M{"$ne": nil}},
		}}, nil

	case models.FilterOpIsNull:
		return bson.M{"$or": []bson.M{
			{field: bson.M{"$exists": false}},
			{field: nil},
		}}, nil

	case models.FilterOpIsNotNull:
		return bson.M{"$and": []bson.M{
			{field: bson.M{"$exists": true}},
			{field: bson.M{"$ne": nil}},
		}}, nil

	case models.FilterOpIsTrue:
		if condition.Type != models.FilterFieldTypeBoolean {
			return nil, fmt.Errorf("is_true operator only supported for boolean fields")
		}
		return bson.M{field: true}, nil

	case models.FilterOpIsFalse:
		if condition.Type != models.FilterFieldTypeBoolean {
			return nil, fmt.Errorf("is_false operator only supported for boolean fields")
		}
		return bson.M{field: false}, nil

	default:
		return nil, fmt.Errorf("unsupported operator: %s", condition.Operator)
	}
}

// normalizeFieldName converts field names to their MongoDB equivalents
func (fb *FilterBuilder) normalizeFieldName(field string) string {
	// Handle special field mappings based on entity type
	switch fb.entityType {
	case "item":
		return fb.normalizeItemField(field)
	case "comment":
		return fb.normalizeCommentField(field)
	case "board":
		return fb.normalizeBoardField(field)
	case "activity":
		return fb.normalizeActivityField(field)
	default:
		return field
	}
}

// normalizeItemField normalizes field names for items
func (fb *FilterBuilder) normalizeItemField(field string) string {
	switch field {
	case "id":
		return "_id"
	case "board_id", "boardId":
		return "boardId"
	case "created_at", "createdAt":
		return "createdAt"
	case "updated_at", "updatedAt":
		return "updatedAt"
	case "assignees":
		return "assignees"
	case "watchers":
		return "watchers"
	case "position":
		return "position"
	default:
		return field
	}
} // normalizeCommentField normalizes field names for comments
func (fb *FilterBuilder) normalizeCommentField(field string) string {
	switch field {
	case "id":
		return "_id"
	case "item_id", "itemId":
		return "itemId"
	case "author_id", "authorId":
		return "authorId"
	case "parent_id", "parentId":
		return "parentId"
	case "created_at", "createdAt":
		return "createdAt"
	case "updated_at", "updatedAt":
		return "updatedAt"
	case "mentions":
		return "mentions"
	case "attachments":
		return "attachments"
	default:
		return field
	}
}

// normalizeBoardField normalizes field names for boards
func (fb *FilterBuilder) normalizeBoardField(field string) string {
	switch field {
	case "id":
		return "_id"
	case "workspace_id", "workspaceId":
		return "workspaceId"
	case "created_at", "createdAt":
		return "createdAt"
	case "updated_at", "updatedAt":
		return "updatedAt"
	case "permissions":
		return "permissions"
	default:
		return field
	}
}

// normalizeActivityField normalizes field names for activities
func (fb *FilterBuilder) normalizeActivityField(field string) string {
	switch field {
	case "id":
		return "_id"
	case "user_id", "userId":
		return "userId"
	case "workspace_id", "workspaceId":
		return "workspaceId"
	case "entity_type", "entityType":
		return "entityType"
	case "entity_id", "entityId":
		return "entityId"
	case "created_at", "createdAt":
		return "createdAt"
	default:
		return field
	}
} // parseDate parses a date value from various formats
func (fb *FilterBuilder) parseDate(value interface{}) (time.Time, error) {
	switch v := value.(type) {
	case time.Time:
		return v, nil
	case string:
		// Try different date formats
		formats := []string{
			time.RFC3339,
			"2006-01-02T15:04:05Z",
			"2006-01-02 15:04:05",
			"2006-01-02",
			"01/02/2006",
			"02-01-2006",
		}

		for _, format := range formats {
			if parsed, err := time.Parse(format, v); err == nil {
				return parsed, nil
			}
		}
		return time.Time{}, fmt.Errorf("unable to parse date: %s", v)
	case int64:
		// Unix timestamp
		return time.Unix(v, 0), nil
	case float64:
		// Unix timestamp as float
		return time.Unix(int64(v), 0), nil
	default:
		return time.Time{}, fmt.Errorf("unsupported date type: %T", value)
	}
}

// CombineWithWorkspaceFilter combines a filter query with workspace filtering
func (fb *FilterBuilder) CombineWithWorkspaceFilter(query bson.M, workspaceID primitive.ObjectID) bson.M {
	if workspaceID.IsZero() {
		return query
	}

	workspaceFilter := bson.M{}
	switch fb.entityType {
	case "board":
		workspaceFilter["workspaceId"] = workspaceID
	case "activity":
		workspaceFilter["workspaceId"] = workspaceID
	default:
		return query
	}

	if len(query) == 0 {
		return workspaceFilter
	}

	return bson.M{"$and": []bson.M{workspaceFilter, query}}
}

// CombineWithBoardFilter combines a filter query with board filtering
func (fb *FilterBuilder) CombineWithBoardFilter(query bson.M, boardIDs []primitive.ObjectID) bson.M {
	if len(boardIDs) == 0 {
		return query
	}

	boardFilter := bson.M{}
	switch fb.entityType {
	case "item":
		boardFilter["boardId"] = bson.M{"$in": boardIDs}
	case "board":
		boardFilter["_id"] = bson.M{"$in": boardIDs}
	default:
		return query
	}

	if len(query) == 0 {
		return boardFilter
	}

	return bson.M{"$and": []bson.M{boardFilter, query}}
}
