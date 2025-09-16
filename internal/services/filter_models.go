package services

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FilterOperator represents the type of comparison operation
type FilterOperator string

const (
	// Text operators
	FilterOpEquals      FilterOperator = "equals"
	FilterOpNotEquals   FilterOperator = "not_equals"
	FilterOpContains    FilterOperator = "contains"
	FilterOpNotContains FilterOperator = "not_contains"
	FilterOpStartsWith  FilterOperator = "starts_with"
	FilterOpEndsWith    FilterOperator = "ends_with"
	FilterOpRegex       FilterOperator = "regex"
	FilterOpEmpty       FilterOperator = "is_empty"
	FilterOpNotEmpty    FilterOperator = "is_not_empty"

	// Number operators
	FilterOpGreaterThan FilterOperator = "greater_than"
	FilterOpLessThan    FilterOperator = "less_than"
	FilterOpBetween     FilterOperator = "between"
	FilterOpNotBetween  FilterOperator = "not_between"

	// Array operators
	FilterOpIn         FilterOperator = "in"
	FilterOpNotIn      FilterOperator = "not_in"
	FilterOpContainsAny FilterOperator = "contains_any"
	FilterOpContainsAll FilterOperator = "contains_all"

	// Date operators
	FilterOpBefore      FilterOperator = "before"
	FilterOpAfter       FilterOperator = "after"
	FilterOpDateBetween FilterOperator = "date_between"
	FilterOpRelative    FilterOperator = "relative"

	// Boolean/Null operators
	FilterOpIsNull    FilterOperator = "is_null"
	FilterOpIsNotNull FilterOperator = "is_not_null"
	FilterOpIsTrue    FilterOperator = "is_true"
	FilterOpIsFalse   FilterOperator = "is_false"
)

// FilterLogic represents how multiple conditions are combined
type FilterLogic string

const (
	FilterLogicAnd FilterLogic = "and"
	FilterLogicOr  FilterLogic = "or"
)

// FilterFieldType represents the data type of the field being filtered
type FilterFieldType string

const (
	FilterFieldTypeText     FilterFieldType = "text"
	FilterFieldTypeNumber   FilterFieldType = "number"
	FilterFieldTypeDate     FilterFieldType = "date"
	FilterFieldTypeBoolean  FilterFieldType = "boolean"
	FilterFieldTypeArray    FilterFieldType = "array"
	FilterFieldTypeObjectID FilterFieldType = "objectid"
	FilterFieldTypeEnum     FilterFieldType = "enum"
)

// RelativeDatePeriod represents relative date periods
type RelativeDatePeriod string

const (
	RelativeDateToday      RelativeDatePeriod = "today"
	RelativeDateYesterday  RelativeDatePeriod = "yesterday"
	RelativeDateThisWeek   RelativeDatePeriod = "this_week"
	RelativeDateLastWeek   RelativeDatePeriod = "last_week"
	RelativeDateThisMonth  RelativeDatePeriod = "this_month"
	RelativeDateLastMonth  RelativeDatePeriod = "last_month"
	RelativeDateThisYear   RelativeDatePeriod = "this_year"
	RelativeDateLastYear   RelativeDatePeriod = "last_year"
	RelativeDateLast7Days  RelativeDatePeriod = "last_7_days"
	RelativeDateLast30Days RelativeDatePeriod = "last_30_days"
	RelativeDateLast90Days RelativeDatePeriod = "last_90_days"
)

// FilterCondition represents a single filter condition
type FilterCondition struct {
	Field    string          `json:"field"`    // Field name to filter on
	Operator FilterOperator  `json:"operator"` // Comparison operator
	Value    interface{}     `json:"value"`    // Value to compare against
	Type     FilterFieldType `json:"type"`     // Data type of the field
}

// FilterGroup represents a group of conditions with the same logic
type FilterGroup struct {
	Logic      FilterLogic        `json:"logic"`      // AND or OR
	Conditions []FilterCondition `json:"conditions"` // List of conditions
}

// FilterQuery represents a complete filter query with multiple groups
type FilterQuery struct {
	Groups []FilterGroup `json:"groups"` // List of filter groups
	Logic  FilterLogic   `json:"logic"`  // How to combine groups (AND/OR)
}

// SavedFilter represents a user's saved filter
type SavedFilter struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	UserID      primitive.ObjectID `bson:"userId" json:"userId"`
	WorkspaceID primitive.ObjectID `bson:"workspaceId" json:"workspaceId"`
	EntityType  string             `bson:"entityType" json:"entityType"` // "item", "comment", "board", etc.
	Query       FilterQuery        `bson:"query" json:"query"`
	IsPublic    bool               `bson:"isPublic" json:"isPublic"`     // Can other users see this filter
	UsageCount  int64              `bson:"usageCount" json:"usageCount"` // How many times it's been used
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// FilterResult represents the result of applying filters
type FilterResult struct {
	Items      []interface{} `json:"items"`      // Filtered items
	TotalCount int64         `json:"totalCount"` // Total count without pagination
	HasMore    bool          `json:"hasMore"`    // Whether there are more results
	Query      FilterQuery   `json:"query"`     // The applied filter query
	TimeTaken  time.Duration `json:"timeTaken"` // Time taken to execute the filter
}

// FilterOptions represents options for filter execution
type FilterOptions struct {
	Limit       int64                `json:"limit"`
	Skip        int64                `json:"skip"`
	SortBy      string               `json:"sortBy"`
	SortOrder   string               `json:"sortOrder"` // "asc" or "desc"
	WorkspaceID primitive.ObjectID   `json:"workspaceId"`
	BoardIDs    []primitive.ObjectID `json:"boardIds,omitempty"`
}

// Validate validates a filter condition
func (fc *FilterCondition) Validate() error {
	if fc.Field == "" {
		return fmt.Errorf("field is required")
	}

	if fc.Operator == "" {
		return fmt.Errorf("operator is required")
	}

	// Validate operator is valid for field type
	if !fc.isOperatorValidForType() {
		return fmt.Errorf("operator %s is not valid for field type %s", fc.Operator, fc.Type)
	}

	// Validate value based on operator
	if err := fc.validateValue(); err != nil {
		return fmt.Errorf("invalid value: %w", err)
	}

	return nil
}

// isOperatorValidForType checks if the operator is valid for the field type
func (fc *FilterCondition) isOperatorValidForType() bool {
	switch fc.Type {
	case FilterFieldTypeText:
		return fc.Operator == FilterOpEquals || fc.Operator == FilterOpNotEquals ||
			fc.Operator == FilterOpContains || fc.Operator == FilterOpNotContains ||
			fc.Operator == FilterOpStartsWith || fc.Operator == FilterOpEndsWith ||
			fc.Operator == FilterOpRegex || fc.Operator == FilterOpEmpty ||
			fc.Operator == FilterOpNotEmpty || fc.Operator == FilterOpIn ||
			fc.Operator == FilterOpNotIn

	case FilterFieldTypeNumber:
		return fc.Operator == FilterOpEquals || fc.Operator == FilterOpNotEquals ||
			fc.Operator == FilterOpGreaterThan || fc.Operator == FilterOpLessThan ||
			fc.Operator == FilterOpBetween || fc.Operator == FilterOpNotBetween ||
			fc.Operator == FilterOpIn || fc.Operator == FilterOpNotIn ||
			fc.Operator == FilterOpIsNull || fc.Operator == FilterOpIsNotNull

	case FilterFieldTypeDate:
		return fc.Operator == FilterOpEquals || fc.Operator == FilterOpNotEquals ||
			fc.Operator == FilterOpBefore || fc.Operator == FilterOpAfter ||
			fc.Operator == FilterOpDateBetween || fc.Operator == FilterOpRelative ||
			fc.Operator == FilterOpIsNull || fc.Operator == FilterOpIsNotNull

	case FilterFieldTypeBoolean:
		return fc.Operator == FilterOpEquals || fc.Operator == FilterOpNotEquals ||
			fc.Operator == FilterOpIsTrue || fc.Operator == FilterOpIsFalse ||
			fc.Operator == FilterOpIsNull || fc.Operator == FilterOpIsNotNull

	case FilterFieldTypeArray:
		return fc.Operator == FilterOpContains || fc.Operator == FilterOpNotContains ||
			fc.Operator == FilterOpContainsAny || fc.Operator == FilterOpContainsAll ||
			fc.Operator == FilterOpEmpty || fc.Operator == FilterOpNotEmpty

	case FilterFieldTypeObjectID:
		return fc.Operator == FilterOpEquals || fc.Operator == FilterOpNotEquals ||
			fc.Operator == FilterOpIn || fc.Operator == FilterOpNotIn ||
			fc.Operator == FilterOpIsNull || fc.Operator == FilterOpIsNotNull

	case FilterFieldTypeEnum:
		return fc.Operator == FilterOpEquals || fc.Operator == FilterOpNotEquals ||
			fc.Operator == FilterOpIn || fc.Operator == FilterOpNotIn ||
			fc.Operator == FilterOpIsNull || fc.Operator == FilterOpIsNotNull

	default:
		return false
	}
}

// validateValue validates the value based on the operator
func (fc *FilterCondition) validateValue() error {
	switch fc.Operator {
	case FilterOpEmpty, FilterOpNotEmpty, FilterOpIsNull, FilterOpIsNotNull,
		FilterOpIsTrue, FilterOpIsFalse:
		// These operators don't need a value
		return nil

	case FilterOpBetween, FilterOpNotBetween, FilterOpDateBetween:
		// These operators need an array of 2 values
		if arr, ok := fc.Value.([]interface{}); ok {
			if len(arr) != 2 {
				return fmt.Errorf("between operator requires exactly 2 values")
			}
		} else {
			return fmt.Errorf("between operator requires an array of 2 values")
		}

	case FilterOpIn, FilterOpNotIn, FilterOpContainsAny, FilterOpContainsAll:
		// These operators need an array of values
		if _, ok := fc.Value.([]interface{}); !ok {
			return fmt.Errorf("operator %s requires an array of values", fc.Operator)
		}

	case FilterOpRelative:
		// Relative date operator needs a valid period
		if str, ok := fc.Value.(string); ok {
			period := RelativeDatePeriod(str)
			if !isValidRelativeDatePeriod(period) {
				return fmt.Errorf("invalid relative date period: %s", str)
			}
		} else {
			return fmt.Errorf("relative operator requires a string period")
		}

	default:
		// Other operators need a single value
		if fc.Value == nil {
			return fmt.Errorf("operator %s requires a value", fc.Operator)
		}
	}

	return nil
}

// isValidRelativeDatePeriod checks if a relative date period is valid
func isValidRelativeDatePeriod(period RelativeDatePeriod) bool {
	switch period {
	case RelativeDateToday, RelativeDateYesterday, RelativeDateThisWeek,
		RelativeDateLastWeek, RelativeDateThisMonth, RelativeDateLastMonth,
		RelativeDateThisYear, RelativeDateLastYear, RelativeDateLast7Days,
		RelativeDateLast30Days, RelativeDateLast90Days:
		return true
	default:
		return false
	}
}

// Validate validates a filter group
func (fg *FilterGroup) Validate() error {
	if len(fg.Conditions) == 0 {
		return fmt.Errorf("filter group must have at least one condition")
	}

	if fg.Logic != FilterLogicAnd && fg.Logic != FilterLogicOr {
		return fmt.Errorf("invalid logic: must be 'and' or 'or'")
	}

	for i, condition := range fg.Conditions {
		if err := condition.Validate(); err != nil {
			return fmt.Errorf("condition %d: %w", i, err)
		}
	}

	return nil
}

// Validate validates a filter query
func (fq *FilterQuery) Validate() error {
	if len(fq.Groups) == 0 {
		return fmt.Errorf("filter query must have at least one group")
	}

	if fq.Logic != FilterLogicAnd && fq.Logic != FilterLogicOr {
		return fmt.Errorf("invalid logic: must be 'and' or 'or'")
	}

	for i, group := range fq.Groups {
		if err := group.Validate(); err != nil {
			return fmt.Errorf("group %d: %w", i, err)
		}
	}

	return nil
}

// Validate validates a saved filter
func (sf *SavedFilter) Validate() error {
	if sf.Name == "" {
		return fmt.Errorf("name is required")
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

	return sf.Query.Validate()
}

// GetRelativeDateRange returns the start and end dates for a relative period
func GetRelativeDateRange(period RelativeDatePeriod) (time.Time, time.Time, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	switch period {
	case RelativeDateToday:
		return today, today.Add(24 * time.Hour), nil

	case RelativeDateYesterday:
		yesterday := today.Add(-24 * time.Hour)
		return yesterday, today, nil

	case RelativeDateThisWeek:
		// Start of this week (Monday)
		weekday := int(today.Weekday())
		if weekday == 0 {
			weekday = 7 // Sunday = 7
		}
		startOfWeek := today.Add(-time.Duration(weekday-1) * 24 * time.Hour)
		endOfWeek := startOfWeek.Add(7 * 24 * time.Hour)
		return startOfWeek, endOfWeek, nil

	case RelativeDateLastWeek:
		weekday := int(today.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		startOfThisWeek := today.Add(-time.Duration(weekday-1) * 24 * time.Hour)
		startOfLastWeek := startOfThisWeek.Add(-7 * 24 * time.Hour)
		return startOfLastWeek, startOfThisWeek, nil

	case RelativeDateThisMonth:
		startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, 0)
		return startOfMonth, endOfMonth, nil

	case RelativeDateLastMonth:
		startOfThisMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		startOfLastMonth := startOfThisMonth.AddDate(0, -1, 0)
		return startOfLastMonth, startOfThisMonth, nil

	case RelativeDateThisYear:
		startOfYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		endOfYear := startOfYear.AddDate(1, 0, 0)
		return startOfYear, endOfYear, nil

	case RelativeDateLastYear:
		startOfThisYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		startOfLastYear := startOfThisYear.AddDate(-1, 0, 0)
		return startOfLastYear, startOfThisYear, nil

	case RelativeDateLast7Days:
		start := today.Add(-7 * 24 * time.Hour)
		return start, today, nil

	case RelativeDateLast30Days:
		start := today.Add(-30 * 24 * time.Hour)
		return start, today, nil

	case RelativeDateLast90Days:
		start := today.Add(-90 * 24 * time.Hour)
		return start, today, nil

	default:
		return time.Time{}, time.Time{}, fmt.Errorf("invalid relative date period: %s", period)
	}
}