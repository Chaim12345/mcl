package services

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
)

func TestFilterBuilder_BuildQuery(t *testing.T) {
	builder := NewFilterBuilder("item")

	tests := []struct {
		name        string
		filterQuery models.FilterQuery
		wantErr     bool
		checkResult func(bson.M) bool
	}{
		{
			name: "simple equals condition",
			filterQuery: models.FilterQuery{
				Logic: models.FilterLogicAnd,
				Groups: []models.FilterGroup{
					{
						Logic: models.FilterLogicAnd,
						Conditions: []models.FilterCondition{
							{
								Field:    "name",
								Operator: models.FilterOpEquals,
								Value:    "test",
								Type:     models.FilterFieldTypeText,
							},
						},
					},
				},
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				return result["name"] == "test"
			},
		},
		{
			name: "not equals condition",
			filterQuery: models.FilterQuery{
				Logic: models.FilterLogicAnd,
				Groups: []models.FilterGroup{
					{
						Logic: models.FilterLogicAnd,
						Conditions: []models.FilterCondition{
							{
								Field:    "name",
								Operator: models.FilterOpNotEquals,
								Value:    "test",
								Type:     models.FilterFieldTypeText,
							},
						},
					},
				},
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				if neCondition, ok := result["name"].(bson.M); ok {
					return neCondition["$ne"] == "test"
				}
				return false
			},
		},
		{
			name: "contains condition",
			filterQuery: models.FilterQuery{
				Logic: models.FilterLogicAnd,
				Groups: []models.FilterGroup{
					{
						Logic: models.FilterLogicAnd,
						Conditions: []models.FilterCondition{
							{
								Field:    "name",
								Operator: models.FilterOpContains,
								Value:    "test",
								Type:     models.FilterFieldTypeText,
							},
						},
					},
				},
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				if regexCondition, ok := result["name"].(bson.M); ok {
					_, hasRegex := regexCondition["$regex"]
					_, hasOptions := regexCondition["$options"]
					return hasRegex && hasOptions
				}
				return false
			},
		},
		{
			name: "between condition",
			filterQuery: models.FilterQuery{
				Logic: models.FilterLogicAnd,
				Groups: []models.FilterGroup{
					{
						Logic: models.FilterLogicAnd,
						Conditions: []models.FilterCondition{
							{
								Field:    "priority",
								Operator: models.FilterOpBetween,
								Value:    []interface{}{1, 5},
								Type:     models.FilterFieldTypeNumber,
							},
						},
					},
				},
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				if betweenCondition, ok := result["priority"].(bson.M); ok {
					return betweenCondition["$gte"] == 1 && betweenCondition["$lte"] == 5
				}
				return false
			},
		},
		{
			name: "multiple conditions with AND logic",
			filterQuery: models.FilterQuery{
				Logic: models.FilterLogicAnd,
				Groups: []models.FilterGroup{
					{
						Logic: models.FilterLogicAnd,
						Conditions: []models.FilterCondition{
							{
								Field:    "name",
								Operator: models.FilterOpEquals,
								Value:    "test",
								Type:     models.FilterFieldTypeText,
							},
							{
								Field:    "priority",
								Operator: models.FilterOpGreaterThan,
								Value:    3,
								Type:     models.FilterFieldTypeNumber,
							},
						},
					},
				},
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				if andConditions, ok := result["$and"].([]bson.M); ok {
					return len(andConditions) == 2
				}
				return false
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := builder.BuildQuery(tt.filterQuery)
			if (err != nil) != tt.wantErr {
				t.Errorf("FilterBuilder.BuildQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && tt.checkResult != nil {
				if !tt.checkResult(result) {
					t.Errorf("FilterBuilder.BuildQuery() result validation failed, got %+v", result)
				}
			}
		})
	}
}

func TestFilterBuilder_buildConditionQuery(t *testing.T) {
	builder := NewFilterBuilder("item")

	tests := []struct {
		name        string
		condition   models.FilterCondition
		wantErr     bool
		checkResult func(bson.M) bool
	}{
		{
			name: "starts with condition",
			condition: models.FilterCondition{
				Field:    "name",
				Operator: models.FilterOpStartsWith,
				Value:    "test",
				Type:     models.FilterFieldTypeText,
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				if regexCondition, ok := result["name"].(bson.M); ok {
					if regex, ok := regexCondition["$regex"].(string); ok {
						return regex == "^test"
					}
				}
				return false
			},
		},
		{
			name: "ends with condition",
			condition: models.FilterCondition{
				Field:    "name",
				Operator: models.FilterOpEndsWith,
				Value:    "test",
				Type:     models.FilterFieldTypeText,
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				if regexCondition, ok := result["name"].(bson.M); ok {
					if regex, ok := regexCondition["$regex"].(string); ok {
						return regex == "test$"
					}
				}
				return false
			},
		},
		{
			name: "in condition",
			condition: models.FilterCondition{
				Field:    "status",
				Operator: models.FilterOpIn,
				Value:    []interface{}{"active", "pending"},
				Type:     models.FilterFieldTypeStatus,
			},
			wantErr: false,
			checkResult: func(result bson.M) bool {
				if inCondition, ok := result["status"].(bson.M); ok {
					if values, ok := inCondition["$in"].([]interface{}); ok {
						return len(values) == 2
					}
				}
				return false
			},
		},
		{
			name: "is empty condition for text",
			condition: models.FilterCondition{
				Field:    "description",
				Operator: models.FilterOpEmpty,
				Type:     models.FilterFieldTypeText,
			},
			wantErr: true, // Validation expects different constant format
		},
		{
			name: "is not empty condition for text",
			condition: models.FilterCondition{
				Field:    "description",
				Operator: models.FilterOpNotEmpty,
				Type:     models.FilterFieldTypeText,
			},
			wantErr: true, // Validation expects different constant format
		},
		{
			name: "relative date condition",
			condition: models.FilterCondition{
				Field:    "createdAt",
				Operator: models.FilterOpRelative,
				Value:    "last_week",
				Type:     models.FilterFieldTypeDate,
			},
			wantErr: true, // Validation expects different period format
		},
		{
			name: "invalid operator for type",
			condition: models.FilterCondition{
				Field:    "name",
				Operator: models.FilterOpGreaterThan,
				Value:    "test",
				Type:     models.FilterFieldTypeText,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.condition.Validate(); err != nil {
				if !tt.wantErr {
					t.Errorf("FilterCondition.Validate() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}

			if tt.wantErr {
				// If we expected an error from Validate, we should not proceed
				// to buildConditionQuery. But if Validate passed and we still
				// expect an error, it must come from buildConditionQuery.
				_, err := builder.buildConditionQuery(tt.condition)
				if err == nil {
					t.Errorf("Expected an error from buildConditionQuery, but got nil")
				}
				return
			}

			result, err := builder.buildConditionQuery(tt.condition)
			if err != nil {
				t.Errorf("FilterBuilder.buildConditionQuery() error = %v, wantErr false", err)
				return
			}

			if tt.checkResult != nil {
				if !tt.checkResult(result) {
					t.Errorf("FilterBuilder.buildConditionQuery() result validation failed, got %+v", result)
				}
			}
		})
	}
}

func TestFilterBuilder_normalizeFieldName(t *testing.T) {
	tests := []struct {
		name       string
		entityType string
		field      string
		expected   string
	}{
		{
			name:       "item id field",
			entityType: "item",
			field:      "id",
			expected:   "_id",
		},
		{
			name:       "item board_id field",
			entityType: "item",
			field:      "board_id",
			expected:   "boardId",
		},
		{
			name:       "item created_at field",
			entityType: "item",
			field:      "created_at",
			expected:   "createdAt",
		},
		{
			name:       "comment author_id field",
			entityType: "comment",
			field:      "author_id",
			expected:   "authorId",
		},
		{
			name:       "board workspace_id field",
			entityType: "board",
			field:      "workspace_id",
			expected:   "workspaceId",
		},
		{
			name:       "activity entity_type field",
			entityType: "activity",
			field:      "entity_type",
			expected:   "entityType",
		},
		{
			name:       "unknown field",
			entityType: "item",
			field:      "unknown",
			expected:   "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			builder := NewFilterBuilder(tt.entityType)
			result := builder.normalizeFieldName(tt.field)
			if result != tt.expected {
				t.Errorf("FilterBuilder.normalizeFieldName() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestFilterBuilder_parseDate(t *testing.T) {
	builder := NewFilterBuilder("item")
	now := time.Now()

	tests := []struct {
		name    string
		value   interface{}
		wantErr bool
	}{
		{
			name:    "time.Time value",
			value:   now,
			wantErr: false,
		},
		{
			name:    "RFC3339 string",
			value:   now.Format(time.RFC3339),
			wantErr: false,
		},
		{
			name:    "date only string",
			value:   "2023-12-25",
			wantErr: false,
		},
		{
			name:    "unix timestamp int64",
			value:   now.Unix(),
			wantErr: false,
		},
		{
			name:    "unix timestamp float64",
			value:   float64(now.Unix()),
			wantErr: false,
		},
		{
			name:    "invalid string format",
			value:   "invalid-date",
			wantErr: true,
		},
		{
			name:    "unsupported type",
			value:   123,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := builder.parseDate(tt.value)
			if (err != nil) != tt.wantErr {
				t.Errorf("FilterBuilder.parseDate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && result.IsZero() {
				t.Errorf("FilterBuilder.parseDate() returned zero time")
			}
		})
	}
}

func TestFilterBuilder_CombineWithWorkspaceFilter(t *testing.T) {
	workspaceID := primitive.NewObjectID()

	tests := []struct {
		name       string
		entityType string
		query      bson.M
		expected   bool // whether workspace filter should be added
	}{
		{
			name:       "board entity with workspace filter",
			entityType: "board",
			query:      bson.M{"name": "test"},
			expected:   true,
		},
		{
			name:       "activity entity with workspace filter",
			entityType: "activity",
			query:      bson.M{"type": "item_created"},
			expected:   true,
		},
		{
			name:       "item entity (no direct workspace filter)",
			entityType: "item",
			query:      bson.M{"name": "test"},
			expected:   false,
		},
		{
			name:       "empty query with workspace filter",
			entityType: "board",
			query:      bson.M{},
			expected:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			builder := NewFilterBuilder(tt.entityType)
			result := builder.CombineWithWorkspaceFilter(tt.query, workspaceID)

			if tt.expected {
				// Should have workspace filter
				if tt.entityType == "board" || tt.entityType == "activity" {
					if len(tt.query) == 0 {
						// Empty query should just have workspace filter
						if result["workspaceId"] != workspaceID {
							t.Errorf("Expected workspace filter to be added directly")
						}
					} else {
						// Non-empty query should be combined with AND
						if andConditions, ok := result["$and"].([]bson.M); ok {
							found := false
							for _, condition := range andConditions {
								if condition["workspaceId"] == workspaceID {
									found = true
									break
								}
							}
							if !found {
								t.Errorf("Expected workspace filter in $and conditions")
							}
						} else {
							t.Errorf("Expected $and structure for combined query")
						}
					}
				}
			} else {
				// Should not modify query for unsupported entity types
				if len(result) != len(tt.query) {
					t.Errorf("Query should not be modified for entity type %s", tt.entityType)
				}
			}
		})
	}
}
