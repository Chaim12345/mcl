package services

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestFilterCondition_Validate(t *testing.T) {
	tests := []struct {
		name      string
		condition FilterCondition
		wantErr   bool
	}{
		{
			name: "valid text equals condition",
			condition: FilterCondition{
				Field:    "name",
				Operator: FilterOpEquals,
				Value:    "test",
				Type:     FilterFieldTypeText,
			},
			wantErr: false,
		},
		{
			name: "missing field",
			condition: FilterCondition{
				Operator: FilterOpEquals,
				Value:    "test",
				Type:     FilterFieldTypeText,
			},
			wantErr: true,
		},
		{
			name: "missing operator",
			condition: FilterCondition{
				Field: "name",
				Value: "test",
				Type:  FilterFieldTypeText,
			},
			wantErr: true,
		},
		{
			name: "invalid operator for type",
			condition: FilterCondition{
				Field:    "name",
				Operator: FilterOpGreaterThan,
				Value:    "test",
				Type:     FilterFieldTypeText,
			},
			wantErr: true,
		},
		{
			name: "between operator with valid array",
			condition: FilterCondition{
				Field:    "priority",
				Operator: FilterOpBetween,
				Value:    []interface{}{1, 5},
				Type:     FilterFieldTypeNumber,
			},
			wantErr: false,
		},
		{
			name: "between operator with invalid value",
			condition: FilterCondition{
				Field:    "priority",
				Operator: FilterOpBetween,
				Value:    "invalid",
				Type:     FilterFieldTypeNumber,
			},
			wantErr: true,
		},
		{
			name: "relative date with valid period",
			condition: FilterCondition{
				Field:    "createdAt",
				Operator: FilterOpRelative,
				Value:    "last_week",
				Type:     FilterFieldTypeDate,
			},
			wantErr: false,
		},
		{
			name: "relative date with invalid period",
			condition: FilterCondition{
				Field:    "createdAt",
				Operator: FilterOpRelative,
				Value:    "invalid_period",
				Type:     FilterFieldTypeDate,
			},
			wantErr: true,
		},
		{
			name: "empty operator with no value needed",
			condition: FilterCondition{
				Field:    "description",
				Operator: FilterOpEmpty,
				Type:     FilterFieldTypeText,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.condition.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("FilterCondition.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFilterGroup_Validate(t *testing.T) {
	tests := []struct {
		name    string
		group   FilterGroup
		wantErr bool
	}{
		{
			name: "valid group with single condition",
			group: FilterGroup{
				Logic: FilterLogicAnd,
				Conditions: []FilterCondition{
					{
						Field:    "name",
						Operator: FilterOpEquals,
						Value:    "test",
						Type:     FilterFieldTypeText,
					},
				},
			},
			wantErr: false,
		},
		{
			name: "empty conditions",
			group: FilterGroup{
				Logic:      FilterLogicAnd,
				Conditions: []FilterCondition{},
			},
			wantErr: true,
		},
		{
			name: "invalid logic",
			group: FilterGroup{
				Logic: "invalid",
				Conditions: []FilterCondition{
					{
						Field:    "name",
						Operator: FilterOpEquals,
						Value:    "test",
						Type:     FilterFieldTypeText,
					},
				},
			},
			wantErr: true,
		},
		{
			name: "invalid condition in group",
			group: FilterGroup{
				Logic: FilterLogicOr,
				Conditions: []FilterCondition{
					{
						Field:    "name",
						Operator: FilterOpEquals,
						Value:    "test",
						Type:     FilterFieldTypeText,
					},
					{
						// Missing field
						Operator: FilterOpEquals,
						Value:    "test",
						Type:     FilterFieldTypeText,
					},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.group.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("FilterGroup.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFilterQuery_Validate(t *testing.T) {
	validCondition := FilterCondition{
		Field:    "name",
		Operator: FilterOpEquals,
		Value:    "test",
		Type:     FilterFieldTypeText,
	}

	tests := []struct {
		name    string
		query   FilterQuery
		wantErr bool
	}{
		{
			name: "valid query with single group",
			query: FilterQuery{
				Logic: FilterLogicAnd,
				Groups: []FilterGroup{
					{
						Logic:      FilterLogicAnd,
						Conditions: []FilterCondition{validCondition},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "empty groups",
			query: FilterQuery{
				Logic:  FilterLogicAnd,
				Groups: []FilterGroup{},
			},
			wantErr: true,
		},
		{
			name: "invalid logic",
			query: FilterQuery{
				Logic: "invalid",
				Groups: []FilterGroup{
					{
						Logic:      FilterLogicAnd,
						Conditions: []FilterCondition{validCondition},
					},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.query.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("FilterQuery.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestSavedFilter_Validate(t *testing.T) {
	userID := primitive.NewObjectID()
	workspaceID := primitive.NewObjectID()

	validQuery := FilterQuery{
		Logic: FilterLogicAnd,
		Groups: []FilterGroup{
			{
				Logic: FilterLogicAnd,
				Conditions: []FilterCondition{
					{
						Field:    "name",
						Operator: FilterOpEquals,
						Value:    "test",
						Type:     FilterFieldTypeText,
					},
				},
			},
		},
	}

	tests := []struct {
		name    string
		filter  SavedFilter
		wantErr bool
	}{
		{
			name: "valid saved filter",
			filter: SavedFilter{
				Name:        "Test Filter",
				Description: "A test filter",
				UserID:      userID,
				WorkspaceID: workspaceID,
				EntityType:  "item",
				Query:       validQuery,
			},
			wantErr: false,
		},
		{
			name: "missing name",
			filter: SavedFilter{
				Description: "A test filter",
				UserID:      userID,
				WorkspaceID: workspaceID,
				EntityType:  "item",
				Query:       validQuery,
			},
			wantErr: true,
		},
		{
			name: "missing user ID",
			filter: SavedFilter{
				Name:        "Test Filter",
				Description: "A test filter",
				WorkspaceID: workspaceID,
				EntityType:  "item",
				Query:       validQuery,
			},
			wantErr: true,
		},
		{
			name: "missing workspace ID",
			filter: SavedFilter{
				Name:        "Test Filter",
				Description: "A test filter",
				UserID:      userID,
				EntityType:  "item",
				Query:       validQuery,
			},
			wantErr: true,
		},
		{
			name: "missing entity type",
			filter: SavedFilter{
				Name:        "Test Filter",
				Description: "A test filter",
				UserID:      userID,
				WorkspaceID: workspaceID,
				Query:       validQuery,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.filter.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("SavedFilter.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestGetRelativeDateRange(t *testing.T) {
	tests := []struct {
		name    string
		period  RelativeDatePeriod
		wantErr bool
	}{
		{
			name:    "today",
			period:  RelativeDateToday,
			wantErr: false,
		},
		{
			name:    "yesterday",
			period:  RelativeDateYesterday,
			wantErr: false,
		},
		{
			name:    "this week",
			period:  RelativeDateThisWeek,
			wantErr: false,
		},
		{
			name:    "last week",
			period:  RelativeDateLastWeek,
			wantErr: false,
		},
		{
			name:    "this month",
			period:  RelativeDateThisMonth,
			wantErr: false,
		},
		{
			name:    "last month",
			period:  RelativeDateLastMonth,
			wantErr: false,
		},
		{
			name:    "last 7 days",
			period:  RelativeDateLast7Days,
			wantErr: false,
		},
		{
			name:    "last 30 days",
			period:  RelativeDateLast30Days,
			wantErr: false,
		},
		{
			name:    "invalid period",
			period:  "invalid",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start, end, err := GetRelativeDateRange(tt.period)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetRelativeDateRange() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if start.IsZero() || end.IsZero() {
					t.Errorf("GetRelativeDateRange() returned zero dates")
				}
				if !start.Before(end) && !start.Equal(end) {
					t.Errorf("GetRelativeDateRange() start date should be before or equal to end date")
				}
			}
		})
	}
}

func TestIsValidRelativeDatePeriod(t *testing.T) {
	validPeriods := []RelativeDatePeriod{
		RelativeDateToday,
		RelativeDateYesterday,
		RelativeDateThisWeek,
		RelativeDateLastWeek,
		RelativeDateThisMonth,
		RelativeDateLastMonth,
		RelativeDateThisYear,
		RelativeDateLastYear,
		RelativeDateLast7Days,
		RelativeDateLast30Days,
		RelativeDateLast90Days,
	}

	for _, period := range validPeriods {
		t.Run(string(period), func(t *testing.T) {
			if !isValidRelativeDatePeriod(period) {
				t.Errorf("isValidRelativeDatePeriod() = false, want true for %s", period)
			}
		})
	}

	// Test invalid period
	if isValidRelativeDatePeriod("invalid") {
		t.Errorf("isValidRelativeDatePeriod() = true, want false for invalid period")
	}
}
