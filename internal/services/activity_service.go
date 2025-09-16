package services

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

type ActivityService struct {
	activityRepo repository.ActivityRepository
	userRepo     repository.UserRepository
}

// ActivityFilter represents filtering options for activity queries
type ActivityFilter struct {
	WorkspaceID  primitive.ObjectID `json:"workspaceId,omitempty"`
	UserID       primitive.ObjectID `json:"userId,omitempty"`
	EntityType   string             `json:"entityType,omitempty"`
	EntityID     primitive.ObjectID `json:"entityId,omitempty"`
	ActivityType string             `json:"activityType,omitempty"`
	StartDate    time.Time          `json:"startDate,omitempty"`
	EndDate      time.Time          `json:"endDate,omitempty"`
	Limit        int64              `json:"limit,omitempty"`
	Skip         int64              `json:"skip,omitempty"`
}

// ActivityTimeline represents a timeline of activities with metadata
type ActivityTimeline struct {
	Activities []*models.Activity `json:"activities"`
	TotalCount int64              `json:"totalCount"`
	HasMore    bool               `json:"hasMore"`
}

// ActivityStats represents activity statistics
type ActivityStats struct {
	TotalActivities  int64                `json:"totalActivities"`
	ActivitiesByType map[string]int64     `json:"activitiesByType"`
	ActivitiesByUser map[string]int64     `json:"activitiesByUser"`
	DailyActivity    []DailyActivityCount `json:"dailyActivity"`
}

// DailyActivityCount represents activity count for a specific date
type DailyActivityCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// UserActivitySummary represents activity summary for a user
type UserActivitySummary struct {
	UserID           primitive.ObjectID   `json:"userId"`
	TotalActivities  int64                `json:"totalActivities"`
	ActivitiesByType map[string]int64     `json:"activitiesByType"`
	DailyActivity    []DailyActivityCount `json:"dailyActivity"`
}

func NewActivityService(activityRepo repository.ActivityRepository, userRepo repository.UserRepository) *ActivityService {
	return &ActivityService{
		activityRepo: activityRepo,
		userRepo:     userRepo,
	}
}

// LogActivity creates a new activity entry
func (s *ActivityService) LogActivity(ctx context.Context, activity *models.Activity) error {
	if err := activity.Validate(); err != nil {
		return fmt.Errorf("invalid activity: %w", err)
	}

	_, err := s.activityRepo.Create(ctx, activity)
	return err
}

// GetActivityByID retrieves an activity by its ID
func (s *ActivityService) GetActivityByID(ctx context.Context, id primitive.ObjectID) (*models.Activity, error) {
	return s.activityRepo.GetByID(ctx, id)
}

// GetByWorkspaceID retrieves activities by workspace ID with pagination
func (s *ActivityService) GetByWorkspaceID(ctx context.Context, workspaceID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	return s.activityRepo.GetByWorkspaceID(ctx, workspaceID, limit, skip)
}

// GetByUserID retrieves activities by user ID with pagination
func (s *ActivityService) GetByUserID(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	return s.activityRepo.GetByUserID(ctx, userID, limit, skip)
}

// GetByEntityID retrieves activities by entity ID and type with pagination
func (s *ActivityService) GetByEntityID(ctx context.Context, entityType string, entityID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	return s.activityRepo.GetByEntityID(ctx, entityType, entityID, limit, skip)
}

// ListActivitiesByEntity lists activities for a given entity (item, board, workspace)
func (s *ActivityService) ListActivitiesByEntity(ctx context.Context, entityType string, entityID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	return s.activityRepo.GetByEntityID(ctx, entityType, entityID, limit, skip)
}

// ListActivitiesByUser lists activities performed by a specific user
func (s *ActivityService) ListActivitiesByUser(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Activity, error) {
	return s.activityRepo.GetByUserID(ctx, userID, limit, skip)
}

// GetRecentActivity retrieves recent activities within specified hours
func (s *ActivityService) GetRecentActivity(ctx context.Context, workspaceID primitive.ObjectID, hours int, limit int64) ([]*models.Activity, error) {
	return s.activityRepo.GetRecentActivity(ctx, workspaceID, hours, limit)
}

// GetActivityTimeline retrieves activities with filtering and aggregation
func (s *ActivityService) GetActivityTimeline(ctx context.Context, filter ActivityFilter) (*ActivityTimeline, error) {
	// Build MongoDB filter
	mongoFilter := bson.M{}

	if !filter.WorkspaceID.IsZero() {
		mongoFilter["workspaceId"] = filter.WorkspaceID
	}

	if !filter.UserID.IsZero() {
		mongoFilter["userId"] = filter.UserID
	}

	if filter.EntityType != "" {
		mongoFilter["entityType"] = filter.EntityType
	}

	if !filter.EntityID.IsZero() {
		mongoFilter["entityId"] = filter.EntityID
	}

	if filter.ActivityType != "" {
		mongoFilter["type"] = filter.ActivityType
	}

	// Date range filter
	if !filter.StartDate.IsZero() || !filter.EndDate.IsZero() {
		dateFilter := bson.M{}
		if !filter.StartDate.IsZero() {
			dateFilter["$gte"] = filter.StartDate
		}
		if !filter.EndDate.IsZero() {
			dateFilter["$lte"] = filter.EndDate
		}
		mongoFilter["createdAt"] = dateFilter
	}

	// Get activities
	activities, err := s.activityRepo.List(ctx, mongoFilter, filter.Limit, filter.Skip)
	if err != nil {
		return nil, err
	}

	// Get total count
	totalCount, err := s.activityRepo.Count(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Create timeline
	timeline := &ActivityTimeline{
		Activities: activities,
		TotalCount: totalCount,
		HasMore:    totalCount > filter.Skip+int64(len(activities)),
	}

	return timeline, nil
}

// GetActivityStats retrieves activity statistics for a workspace
func (s *ActivityService) GetActivityStats(ctx context.Context, workspaceID primitive.ObjectID, days int) (*ActivityStats, error) {
	startDate := time.Now().AddDate(0, 0, -days)

	filter := bson.M{
		"workspaceId": workspaceID,
		"createdAt": bson.M{
			"$gte": startDate,
		},
	}

	activities, err := s.activityRepo.List(ctx, filter, 0, 0) // Get all activities
	if err != nil {
		return nil, err
	}

	stats := &ActivityStats{
		TotalActivities:  int64(len(activities)),
		ActivitiesByType: make(map[string]int64),
		ActivitiesByUser: make(map[string]int64),
		DailyActivity:    []DailyActivityCount{},
	}

	dailyActivityMap := make(map[string]int64)

	// Aggregate statistics
	for _, activity := range activities {
		// Count by type
		stats.ActivitiesByType[activity.Type]++

		// Count by user (we'll need to get user names)
		userIDStr := activity.UserID.Hex()
		stats.ActivitiesByUser[userIDStr]++

		// Count by date
		dateKey := activity.CreatedAt.Format("2006-01-02")
		dailyActivityMap[dateKey]++
	}

	// Convert daily activity map to slice
	for date, count := range dailyActivityMap {
		stats.DailyActivity = append(stats.DailyActivity, DailyActivityCount{
			Date:  date,
			Count: count,
		})
	}

	return stats, nil
}

// GetUserActivitySummary retrieves activity summary for a specific user
func (s *ActivityService) GetUserActivitySummary(ctx context.Context, userID primitive.ObjectID, days int) (*UserActivitySummary, error) {
	startDate := time.Now().AddDate(0, 0, -days)

	filter := bson.M{
		"userId": userID,
		"createdAt": bson.M{
			"$gte": startDate,
		},
	}

	activities, err := s.activityRepo.List(ctx, filter, 0, 0)
	if err != nil {
		return nil, err
	}

	summary := &UserActivitySummary{
		UserID:           userID,
		TotalActivities:  int64(len(activities)),
		ActivitiesByType: make(map[string]int64),
		DailyActivity:    []DailyActivityCount{},
	}

	dailyActivityMap := make(map[string]int64)

	for _, activity := range activities {
		// Count by type
		summary.ActivitiesByType[activity.Type]++

		// Count by date
		dateKey := activity.CreatedAt.Format("2006-01-02")
		dailyActivityMap[dateKey]++
	}

	// Convert daily activity map to slice
	for date, count := range dailyActivityMap {
		summary.DailyActivity = append(summary.DailyActivity, DailyActivityCount{
			Date:  date,
			Count: count,
		})
	}

	return summary, nil
}

// DeleteByEntityID deletes activities by entity ID and type
func (s *ActivityService) DeleteByEntityID(ctx context.Context, entityType string, entityID primitive.ObjectID) error {
	_, err := s.activityRepo.DeleteByEntityID(ctx, entityType, entityID)
	return err
}

// LogItemActivity logs an item-related activity
func (s *ActivityService) LogItemActivity(ctx context.Context, activityType string, itemID, userID, workspaceID, boardID primitive.ObjectID, data map[string]interface{}) error {
	activity := models.NewItemActivity(activityType, itemID, userID, workspaceID, boardID)

	if data != nil {
		for key, value := range data {
			activity.SetData(key, value)
		}
	}

	return s.LogActivity(ctx, activity)
}

// LogBoardActivity logs a board-related activity
func (s *ActivityService) LogBoardActivity(ctx context.Context, activityType string, boardID, userID, workspaceID primitive.ObjectID, data map[string]interface{}) error {
	activity := models.NewBoardActivity(activityType, boardID, userID, workspaceID)

	if data != nil {
		for key, value := range data {
			activity.SetData(key, value)
		}
	}

	return s.LogActivity(ctx, activity)
}

// LogWorkspaceActivity logs a workspace-related activity
func (s *ActivityService) LogWorkspaceActivity(ctx context.Context, activityType string, workspaceID, userID primitive.ObjectID, data map[string]interface{}) error {
	activity := models.NewWorkspaceActivity(activityType, workspaceID, userID)

	if data != nil {
		for key, value := range data {
			activity.SetData(key, value)
		}
	}

	return s.LogActivity(ctx, activity)
}

// LogCommentActivity logs a comment-related activity
func (s *ActivityService) LogCommentActivity(ctx context.Context, activityType string, commentID, userID, workspaceID, boardID, itemID primitive.ObjectID, data map[string]interface{}) error {
	activity := models.NewCommentActivity(activityType, commentID, userID, workspaceID, boardID, itemID)

	if data != nil {
		for key, value := range data {
			activity.SetData(key, value)
		}
	}

	return s.LogActivity(ctx, activity)
}

// LogItemFieldChange logs an item field change activity
func (s *ActivityService) LogItemFieldChange(ctx context.Context, itemID, userID, workspaceID, boardID primitive.ObjectID, columnID, columnName string, oldValue, newValue interface{}) error {
	activity := models.NewItemActivity(models.ActivityItemUpdated, itemID, userID, workspaceID, boardID)
	activity.SetItemFieldChange(columnID, columnName, oldValue, newValue)
	return s.LogActivity(ctx, activity)
}

// LogItemAssignment logs an item assignment activity
func (s *ActivityService) LogItemAssignment(ctx context.Context, itemID, userID, workspaceID, boardID, assigneeID primitive.ObjectID, assigneeName string, assigned bool) error {
	activityType := models.ActivityItemAssigned
	if !assigned {
		activityType = models.ActivityItemUnassigned
	}

	activity := models.NewItemActivity(activityType, itemID, userID, workspaceID, boardID)
	activity.SetItemAssignment(assigneeID, assigneeName, assigned)
	return s.LogActivity(ctx, activity)
}

// LogMemberChange logs a workspace member change activity
func (s *ActivityService) LogMemberChange(ctx context.Context, workspaceID, userID, memberID primitive.ObjectID, memberName, role, activityType string) error {
	activity := models.NewWorkspaceActivity(activityType, workspaceID, userID)
	activity.SetMemberChange(memberID, memberName, role)
	return s.LogActivity(ctx, activity)
}
