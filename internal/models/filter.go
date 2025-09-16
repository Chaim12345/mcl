package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// SavedFilter represents a user-defined saved filter
type SavedFilter struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	UserID      primitive.ObjectID `bson:"userId" json:"userId"`
	WorkspaceID primitive.ObjectID `bson:"workspaceId" json:"workspaceId"`
	EntityType  string             `bson:"entityType" json:"entityType"` // e.g., "item", "comment", "board"
	Query       FilterQuery        `bson:"query" json:"query"`
	IsPublic    bool               `bson:"isPublic" json:"isPublic"`
	UsageCount  int64              `bson:"usageCount" json:"usageCount"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// Validate validates the saved filter data
func (sf *SavedFilter) Validate() error {
	if sf.Name == "" {
		return fmt.Errorf("filter name is required")
	}

	if sf.UserID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	if sf.WorkspaceID.IsZero() {
		return fmt.Errorf("workspace ID is required")
	}

	if sf.EntityType == "" {
		return fmt.Errorf("entity type is required")
	}

	// Validate nested query
	if err := sf.Query.Validate(); err != nil {
		return fmt.Errorf("invalid filter query: %w", err)
	}

	return nil
}

// FilterQuery represents a complex filter query structure
type FilterQuery struct {
	Logic      FilterLogic       `json:"logic"` // AND or OR
	Conditions []FilterCondition `json:"conditions,omitempty"`
	Groups     []FilterGroup     `json:"groups,omitempty"`
}

// FilterLogic defines logical operators for filter groups/conditions
type FilterLogic string

const (
	FilterLogicAnd FilterLogic = "AND"
	FilterLogicOr  FilterLogic = "OR"
)

// FilterCondition represents a single filter condition
type FilterCondition struct {
	Field    string          `json:"field"`
	Operator FilterOperator  `json:"operator"`
	Value    interface{}     `json:"value"`
	Type     FilterFieldType `json:"type"`
}

// FilterOperator defines operators for filter conditions
type FilterOperator string

const (
	FilterOpEquals             FilterOperator = "EQ"
	FilterOpNotEquals          FilterOperator = "NE"
	FilterOpGreaterThan        FilterOperator = "GT"
	FilterOpGreaterThanOrEqual FilterOperator = "GTE"
	FilterOpLessThan           FilterOperator = "LT"
	FilterOpLessThanOrEqual    FilterOperator = "LTE"
	FilterOpContains           FilterOperator = "CONTAINS"
	FilterOpNotContains        FilterOperator = "NOT_CONTAINS"
	FilterOpStartsWith         FilterOperator = "STARTS_WITH"
	FilterOpEndsWith           FilterOperator = "ENDS_WITH"
	FilterOpRegex              FilterOperator = "REGEX"
	FilterOpIn                 FilterOperator = "IN"
	FilterOpNotIn              FilterOperator = "NOT_IN"
	FilterOpIsEmpty            FilterOperator = "IS_EMPTY"
	FilterOpIsNotEmpty         FilterOperator = "IS_NOT_EMPTY"
	FilterOpEmpty              FilterOperator = "is_empty"
	FilterOpNotEmpty           FilterOperator = "is_not_empty"
	FilterOpBefore             FilterOperator = "BEFORE"
	FilterOpAfter              FilterOperator = "AFTER"
	FilterOpBetween            FilterOperator = "BETWEEN"
	FilterOpNotBetween         FilterOperator = "NOT_BETWEEN"
	FilterOpDateBetween        FilterOperator = "DATE_BETWEEN"
	FilterOpRelative           FilterOperator = "RELATIVE"
	FilterOpContainsAny        FilterOperator = "CONTAINS_ANY"
	FilterOpContainsAll        FilterOperator = "CONTAINS_ALL"
	FilterOpIsNull             FilterOperator = "IS_NULL"
	FilterOpIsNotNull          FilterOperator = "IS_NOT_NULL"
	FilterOpIsTrue             FilterOperator = "IS_TRUE"
	FilterOpIsFalse            FilterOperator = "IS_FALSE"
)

// FilterFieldType defines types for filter fields
type FilterFieldType string

const (
	FilterFieldTypeText    FilterFieldType = "text"
	FilterFieldTypeNumber  FilterFieldType = "number"
	FilterFieldTypeDate    FilterFieldType = "date"
	FilterFieldTypeBoolean FilterFieldType = "boolean"
	FilterFieldTypeUser    FilterFieldType = "user"
	FilterFieldTypeStatus  FilterFieldType = "status"
	FilterFieldTypeTags    FilterFieldType = "tags"
	FilterFieldTypeArray   FilterFieldType = "array" // Added for array field types
)

// FilterGroup represents a nested group of filter conditions or other groups
type FilterGroup struct {
	Logic      FilterLogic       `json:"logic"`
	Conditions []FilterCondition `json:"conditions,omitempty"`
	Groups     []FilterGroup     `json:"groups,omitempty"`
}

// Validate validates the FilterQuery structure recursively
func (fq *FilterQuery) Validate() error {
	if fq.Logic == "" {
		return fmt.Errorf("filter logic is required")
	}

	if fq.Logic != FilterLogicAnd && fq.Logic != FilterLogicOr {
		return fmt.Errorf("invalid filter logic: %s", fq.Logic)
	}

	if len(fq.Conditions) == 0 && len(fq.Groups) == 0 {
		return fmt.Errorf("filter query must have at least one condition or group")
	}

	for i, condition := range fq.Conditions {
		if err := condition.Validate(); err != nil {
			return fmt.Errorf("condition %d validation failed: %w", i, err)
		}
	}

	for i, group := range fq.Groups {
		if err := group.Validate(); err != nil {
			return fmt.Errorf("group %d validation failed: %w", i, err)
		}
	}

	return nil
}

// Validate validates a single filter condition
func (fc *FilterCondition) Validate() error {
	if fc.Field == "" {
		return fmt.Errorf("condition field is required")
	}

	if fc.Operator == "" {
		return fmt.Errorf("condition operator is required")
	}

	if fc.Type == "" {
		return fmt.Errorf("condition type is required")
	}

	// Basic validation for operator and type compatibility
	switch fc.Operator {
	case FilterOpEquals, FilterOpNotEquals:
		// Value can be anything, check type compatibility if needed later
	case FilterOpGreaterThan, FilterOpGreaterThanOrEqual, FilterOpLessThan, FilterOpLessThanOrEqual:
		if fc.Type != FilterFieldTypeNumber && fc.Type != FilterFieldTypeDate {
			return fmt.Errorf("operator %s is not compatible with type %s", fc.Operator, fc.Type)
		}
	case FilterOpContains, FilterOpNotContains, FilterOpStartsWith, FilterOpEndsWith:
		if fc.Type != FilterFieldTypeText && fc.Type != FilterFieldTypeTags && fc.Type != FilterFieldTypeArray {
			return fmt.Errorf("operator %s is not compatible with type %s", fc.Operator, fc.Type)
		}
	case FilterOpIn, FilterOpNotIn:
		if _, ok := fc.Value.([]interface{}); !ok && fc.Value != nil {
			return fmt.Errorf("operator %s requires an array value", fc.Operator)
		}
	case FilterOpIsEmpty, FilterOpIsNotEmpty:
		// No value expected
	case FilterOpBefore, FilterOpAfter:
		if fc.Type != FilterFieldTypeDate {
			return fmt.Errorf("operator %s is not compatible with type %s", fc.Operator, fc.Type)
		}
	case FilterOpBetween, FilterOpNotBetween, FilterOpDateBetween, FilterOpRelative:
		if fc.Type != FilterFieldTypeNumber && fc.Type != FilterFieldTypeDate {
			return fmt.Errorf("operator %s is not compatible with type %s", fc.Operator, fc.Type)
		}
	case FilterOpContainsAny, FilterOpContainsAll:
		if fc.Type != FilterFieldTypeArray {
			return fmt.Errorf("operator %s is not compatible with type %s", fc.Operator, fc.Type)
		}
	case FilterOpIsNull, FilterOpIsNotNull, FilterOpIsTrue, FilterOpIsFalse:
		// These operators handle various types including nil/boolean checks
	default:
		return fmt.Errorf("invalid filter operator: %s", fc.Operator)
	}

	return nil
}

// Validate validates a filter group recursively
func (fg *FilterGroup) Validate() error {
	if fg.Logic == "" {
		return fmt.Errorf("filter logic is required for group")
	}

	if fg.Logic != FilterLogicAnd && fg.Logic != FilterLogicOr {
		return fmt.Errorf("invalid filter logic for group: %s", fg.Logic)
	}

	if len(fg.Conditions) == 0 && len(fg.Groups) == 0 {
		return fmt.Errorf("filter group must have at least one condition or nested group")
	}

	for i, condition := range fg.Conditions {
		if err := condition.Validate(); err != nil {
			return fmt.Errorf("group condition %d validation failed: %w", i, err)
		}
	}

	for i, group := range fg.Groups {
		if err := group.Validate(); err != nil {
			return fmt.Errorf("nested group %d validation failed: %w", i, err)
		}
	}
	return nil
}

// FilterOptions represents options for filtering operations
type FilterOptions struct {
	Limit       int64                `json:"limit"`
	Skip        int64                `json:"skip"`
	SortBy      string               `json:"sortBy"`
	SortOrder   string               `json:"sortOrder"`
	WorkspaceID primitive.ObjectID   `json:"workspaceId"`
	BoardIDs    []primitive.ObjectID `json:"boardIds,omitempty"`
}

// BuildFindOptions converts FilterOptions to MongoDB find options
func (fo *FilterOptions) BuildFindOptions() *options.FindOptions {
	findOptions := options.Find()

	if fo.Limit > 0 {
		findOptions.SetLimit(fo.Limit)
	}

	if fo.Skip > 0 {
		findOptions.SetSkip(fo.Skip)
	}

	if fo.SortBy != "" {
		sortOrder := 1
		if fo.SortOrder == "desc" {
			sortOrder = -1
		}
		findOptions.SetSort(bson.M{fo.SortBy: sortOrder})
	}

	return findOptions
}

// FilterResult represents the result of a filtering operation
type FilterResult struct {
	Items      []interface{} `json:"items"`
	TotalCount int64         `json:"totalCount"`
	HasMore    bool          `json:"hasMore"`
	Query      FilterQuery   `json:"query"`
	TimeTaken  time.Duration `json:"timeTaken"`
}

// RelativeDatePeriod defines periods for relative date filtering
type RelativeDatePeriod string

const (
	RelativeDateToday       RelativeDatePeriod = "TODAY"
	RelativeDateYesterday   RelativeDatePeriod = "YESTERDAY"
	RelativeDateThisWeek    RelativeDatePeriod = "THIS_WEEK"
	RelativeDateLastWeek    RelativeDatePeriod = "LAST_WEEK"
	RelativeDateThisMonth   RelativeDatePeriod = "THIS_MONTH"
	RelativeDateLastMonth   RelativeDatePeriod = "LAST_MONTH"
	RelativeDateThisQuarter RelativeDatePeriod = "THIS_QUARTER"
	RelativeDateLastQuarter RelativeDatePeriod = "LAST_QUARTER"
	RelativeDateThisYear    RelativeDatePeriod = "THIS_YEAR"
	RelativeDateLastYear    RelativeDatePeriod = "LAST_YEAR"
	RelativeDateNext7Days   RelativeDatePeriod = "NEXT_7_DAYS"
	RelativeDateLast7Days   RelativeDatePeriod = "LAST_7_DAYS"
	RelativeDateNext30Days  RelativeDatePeriod = "NEXT_30_DAYS"
	RelativeDateLast30Days  RelativeDatePeriod = "LAST_30_DAYS"
	RelativeDateNext90Days  RelativeDatePeriod = "NEXT_90_DAYS"
	RelativeDateLast90Days  RelativeDatePeriod = "LAST_90_DAYS"
	RelativeDateNext365Days RelativeDatePeriod = "NEXT_365_DAYS"
	RelativeDateLast365Days RelativeDatePeriod = "LAST_365_DAYS"
)

// GetRelativeDateRange calculates start and end dates for relative periods
func GetRelativeDateRange(period RelativeDatePeriod) (time.Time, time.Time, error) {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	switch period {
	case RelativeDateToday:
		return startOfDay, startOfDay.Add(24 * time.Hour), nil
	case RelativeDateYesterday:
		return startOfDay.Add(-24 * time.Hour), startOfDay, nil
	case RelativeDateThisWeek:
		// Assuming week starts on Sunday
		startOfWeek := startOfDay.AddDate(0, 0, int(-startOfDay.Weekday()))
		return startOfWeek, startOfWeek.Add(7 * 24 * time.Hour), nil
	case RelativeDateLastWeek:
		startOfWeek := startOfDay.AddDate(0, 0, int(-startOfDay.Weekday()))
		lastWeekStart := startOfWeek.Add(-7 * 24 * time.Hour)
		return lastWeekStart, startOfWeek, nil
	case RelativeDateThisMonth:
		startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, 0)
		return startOfMonth, endOfMonth, nil
	case RelativeDateLastMonth:
		startOfLastMonth := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
		endOfLastMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		return startOfLastMonth, endOfLastMonth, nil
	case RelativeDateThisQuarter:
		currentMonth := now.Month()
		currentYear := now.Year()
		var startOfQuarter time.Time
		switch {
		case currentMonth >= time.January && currentMonth <= time.March:
			startOfQuarter = time.Date(currentYear, time.January, 1, 0, 0, 0, 0, now.Location())
		case currentMonth >= time.April && currentMonth <= time.June:
			startOfQuarter = time.Date(currentYear, time.April, 1, 0, 0, 0, 0, now.Location())
		case currentMonth >= time.July && currentMonth <= time.September:
			startOfQuarter = time.Date(currentYear, time.July, 1, 0, 0, 0, 0, now.Location())
		default:
			startOfQuarter = time.Date(currentYear, time.October, 1, 0, 0, 0, 0, now.Location())
		}
		endOfQuarter := startOfQuarter.AddDate(0, 3, 0)
		return startOfQuarter, endOfQuarter, nil
	case RelativeDateLastQuarter:
		currentMonth := now.Month()
		currentYear := now.Year()
		var startOfLastQuarter time.Time
		switch {
		case currentMonth >= time.January && currentMonth <= time.March:
			startOfLastQuarter = time.Date(currentYear-1, time.October, 1, 0, 0, 0, 0, now.Location())
		case currentMonth >= time.April && currentMonth <= time.June:
			startOfLastQuarter = time.Date(currentYear, time.January, 1, 0, 0, 0, 0, now.Location())
		case currentMonth >= time.July && currentMonth <= time.September:
			startOfLastQuarter = time.Date(currentYear, time.April, 1, 0, 0, 0, 0, now.Location())
		default:
			startOfLastQuarter = time.Date(currentYear, time.July, 1, 0, 0, 0, 0, now.Location())
		}
		endOfLastQuarter := startOfLastQuarter.AddDate(0, 3, 0)
		return startOfLastQuarter, endOfLastQuarter, nil
	case RelativeDateThisYear:
		startOfYear := time.Date(now.Year(), time.January, 1, 0, 0, 0, 0, now.Location())
		endOfYear := startOfYear.AddDate(1, 0, 0)
		return startOfYear, endOfYear, nil
	case RelativeDateLastYear:
		startOfLastYear := time.Date(now.Year()-1, time.January, 1, 0, 0, 0, 0, now.Location())
		endOfLastYear := time.Date(now.Year(), time.January, 1, 0, 0, 0, 0, now.Location())
		return startOfLastYear, endOfLastYear, nil
	case RelativeDateNext7Days:
		return startOfDay, startOfDay.Add(7 * 24 * time.Hour), nil
	case RelativeDateLast7Days:
		return startOfDay.Add(-7 * 24 * time.Hour), startOfDay, nil
	case RelativeDateNext30Days:
		return startOfDay, startOfDay.Add(30 * 24 * time.Hour), nil
	case RelativeDateLast30Days:
		return startOfDay.Add(-30 * 24 * time.Hour), startOfDay, nil
	case RelativeDateNext90Days:
		return startOfDay, startOfDay.Add(90 * 24 * time.Hour), nil
	case RelativeDateLast90Days:
		return startOfDay.Add(-90 * 24 * time.Hour), startOfDay, nil
	case RelativeDateNext365Days:
		return startOfDay, startOfDay.Add(365 * 24 * time.Hour), nil
	case RelativeDateLast365Days:
		return startOfDay.Add(-365 * 24 * time.Hour), startOfDay, nil
	default:
		return time.Time{}, time.Time{}, fmt.Errorf("unsupported relative date period: %s", period)
	}
}
