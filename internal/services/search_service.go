package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// SearchService handles search operations across different entities
type SearchService struct {
	itemRepo    repository.ItemRepository
	commentRepo repository.CommentRepository
	boardRepo   repository.BoardRepository
}

// NewSearchService creates a new search service
func NewSearchService(
	itemRepo repository.ItemRepository,
	commentRepo repository.CommentRepository,
	boardRepo repository.BoardRepository,
) *SearchService {
	return &SearchService{
		itemRepo:    itemRepo,
		commentRepo: commentRepo,
		boardRepo:   boardRepo,
	}
}

// SearchResult represents a unified search result
type SearchResult struct {
	ID          primitive.ObjectID `json:"id"`
	Type        string             `json:"type"`    // "item", "comment", "board"
	Title       string             `json:"title"`   // Name for items/boards, truncated content for comments
	Content     string             `json:"content"` // Full content or description
	Score       float64            `json:"score"`   // Search relevance score
	WorkspaceID primitive.ObjectID `json:"workspaceId"`
	BoardID     primitive.ObjectID `json:"boardId,omitempty"`
	ItemID      primitive.ObjectID `json:"itemId,omitempty"` // For comments
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`
	Highlights  []string           `json:"highlights,omitempty"` // Highlighted text snippets
}

// SearchOptions represents search parameters
type SearchOptions struct {
	Query       string               `json:"query"`
	WorkspaceID primitive.ObjectID   `json:"workspaceId"`
	BoardIDs    []primitive.ObjectID `json:"boardIds,omitempty"` // Filter by specific boards
	ItemIDs     []primitive.ObjectID `json:"itemIds,omitempty"`  // Filter by specific items
	Types       []string             `json:"types,omitempty"`    // Filter by result types
	Limit       int64                `json:"limit"`
	Skip        int64                `json:"skip"`
	SortBy      string               `json:"sortBy"`    // "relevance", "date", "name"
	SortOrder   string               `json:"sortOrder"` // "asc", "desc"
}

// SearchResults represents paginated search results
type SearchResults struct {
	Results    []SearchResult `json:"results"`
	TotalCount int64          `json:"totalCount"`
	HasMore    bool           `json:"hasMore"`
	Query      string         `json:"query"`
	TimeTaken  time.Duration  `json:"timeTaken"`
	Skip       int64          `json:"skip"`
	Limit      int64          `json:"limit"`
}

// Search performs a unified search across different entities
func (s *SearchService) Search(ctx context.Context, query SearchOptions) (*SearchResults, error) {
	startTime := time.Now()

	if query.Query == "" {
		return &SearchResults{
			Results:    []SearchResult{},
			TotalCount: 0,
			HasMore:    false,
			Query:      query.Query,
			TimeTaken:  time.Since(startTime),
			Skip:       query.Skip,
			Limit:      query.Limit,
		}, nil
	}

	// Validate and set defaults
	if query.Limit <= 0 || query.Limit > 100 {
		query.Limit = 20
	}
	if query.Skip < 0 {
		query.Skip = 0
	}
	if query.SortBy == "" {
		query.SortBy = "relevance"
	}
	if query.SortOrder == "" {
		query.SortOrder = "desc"
	}

	var allResults []SearchResult
	var totalCount int64

	// Search items if not filtered out
	if len(query.Types) == 0 || contains(query.Types, "item") {
		itemResults, itemCount, err := s.SearchItems(ctx, query)
		if err != nil {
			return nil, fmt.Errorf("failed to search items: %w", err)
		}
		allResults = append(allResults, itemResults...)
		totalCount += itemCount
	}

	// Search comments if not filtered out
	if len(query.Types) == 0 || contains(query.Types, "comment") {
		commentResults, commentCount, err := s.SearchComments(ctx, query)
		if err != nil {
			return nil, fmt.Errorf("failed to search comments: %w", err)
		}
		allResults = append(allResults, commentResults...)
		totalCount += commentCount
	}

	// Search boards if not filtered out
	if len(query.Types) == 0 || contains(query.Types, "board") {
		boardResults, boardCount, err := s.SearchBoards(ctx, query)
		if err != nil {
			return nil, fmt.Errorf("failed to search boards: %w", err)
		}
		allResults = append(allResults, boardResults...)
		totalCount += boardCount
	}

	// Sort results
	sortedResults := s.sortResults(allResults, query.SortBy, query.SortOrder)

	// Apply pagination
	paginatedResults := s.PaginateResults(sortedResults, query.Skip, query.Limit)

	return &SearchResults{
		Results:    paginatedResults,
		TotalCount: totalCount,
		HasMore:    totalCount > query.Skip+int64(len(paginatedResults)),
		Query:      query.Query,
		TimeTaken:  time.Since(startTime),
		Skip:       query.Skip,
		Limit:      query.Limit,
	}, nil
}

// SearchItems searches for items using MongoDB text search
func (s *SearchService) SearchItems(ctx context.Context, query SearchOptions) ([]SearchResult, int64, error) {
	// Build MongoDB filter
	filter := bson.M{
		"$text": bson.M{"$search": query.Query},
	}

	// Add workspace filter through board lookup
	if !query.WorkspaceID.IsZero() {
		// We need to join with boards to filter by workspace
		// For now, we'll get all boards in the workspace first
		boardFilter := bson.M{"workspaceId": query.WorkspaceID}
		boards, err := s.boardRepo.List(ctx, boardFilter, 0, 0)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get boards for workspace: %w", err)
		}

		var boardIDs []primitive.ObjectID
		for _, board := range boards {
			boardIDs = append(boardIDs, board.ID)
		}

		if len(boardIDs) > 0 {
			filter["boardId"] = bson.M{"$in": boardIDs}
		} else {
			// No boards in workspace, return empty results
			return []SearchResult{}, 0, nil
		}
	}

	// Add board filter
	if len(query.BoardIDs) > 0 {
		filter["boardId"] = bson.M{"$in": query.BoardIDs}
	}

	// Get total count
	totalCount, err := s.itemRepo.Count(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count items: %w", err)
	}

	// Search with text score - MongoDB text search will automatically sort by relevance
	items, err := s.itemRepo.List(ctx, filter, query.Limit*2, 0)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search items: %w", err)
	}

	var results []SearchResult
	for _, item := range items {
		// Get board info for workspace ID
		board, err := s.boardRepo.GetByID(ctx, item.BoardID)
		if err != nil {
			continue // Skip if board not found
		}

		result := SearchResult{
			ID:          item.ID,
			Type:        "item",
			Title:       item.Name,
			Content:     s.extractItemContent(item),
			Score:       s.calculateItemScore(item, query.Query),
			WorkspaceID: board.WorkspaceID,
			BoardID:     item.BoardID,
			CreatedAt:   item.CreatedAt,
			UpdatedAt:   item.UpdatedAt,
			Highlights:  s.generateHighlights(item.Name, query.Query),
		}
		results = append(results, result)
	}

	return results, totalCount, nil
}

// SearchComments searches for comments using MongoDB text search
func (s *SearchService) SearchComments(ctx context.Context, query SearchOptions) ([]SearchResult, int64, error) {
	// Build MongoDB filter
	filter := bson.M{
		"$text": bson.M{"$search": query.Query},
	}

	// Add item filter if specified
	if len(query.ItemIDs) > 0 {
		filter["itemId"] = bson.M{"$in": query.ItemIDs}
	}

	// For workspace filtering, we need to join with items and boards
	if !query.WorkspaceID.IsZero() || len(query.BoardIDs) > 0 {
		// Get items that match the workspace/board criteria
		itemFilter := bson.M{}

		if !query.WorkspaceID.IsZero() {
			// Get boards in workspace first
			boardFilter := bson.M{"workspaceId": query.WorkspaceID}
			boards, err := s.boardRepo.List(ctx, boardFilter, 0, 0)
			if err != nil {
				return nil, 0, fmt.Errorf("failed to get boards for workspace: %w", err)
			}

			var boardIDs []primitive.ObjectID
			for _, board := range boards {
				boardIDs = append(boardIDs, board.ID)
			}

			if len(boardIDs) > 0 {
				itemFilter["boardId"] = bson.M{"$in": boardIDs}
			} else {
				return []SearchResult{}, 0, nil
			}
		}

		if len(query.BoardIDs) > 0 {
			itemFilter["boardId"] = bson.M{"$in": query.BoardIDs}
		}

		// Get items that match the criteria
		items, err := s.itemRepo.List(ctx, itemFilter, 0, 0)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get items for filtering: %w", err)
		}

		var itemIDs []primitive.ObjectID
		for _, item := range items {
			itemIDs = append(itemIDs, item.ID)
		}

		if len(itemIDs) > 0 {
			filter["itemId"] = bson.M{"$in": itemIDs}
		} else {
			return []SearchResult{}, 0, nil
		}
	}

	// Get total count
	totalCount, err := s.commentRepo.Count(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count comments: %w", err)
	}

	// Search comments
	comments, err := s.commentRepo.List(ctx, filter, query.Limit*2, 0)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search comments: %w", err)
	}

	var results []SearchResult
	for _, comment := range comments {
		// Get item and board info
		item, err := s.itemRepo.GetByID(ctx, comment.ItemID)
		if err != nil {
			continue // Skip if item not found
		}

		board, err := s.boardRepo.GetByID(ctx, item.BoardID)
		if err != nil {
			continue // Skip if board not found
		}

		result := SearchResult{
			ID:          comment.ID,
			Type:        "comment",
			Title:       s.truncateText(comment.Content, 100),
			Content:     comment.Content,
			Score:       s.calculateCommentScore(comment, query.Query),
			WorkspaceID: board.WorkspaceID,
			BoardID:     item.BoardID,
			ItemID:      comment.ItemID,
			CreatedAt:   comment.CreatedAt,
			UpdatedAt:   comment.UpdatedAt,
			Highlights:  s.generateHighlights(comment.Content, query.Query),
		}
		results = append(results, result)
	}

	return results, totalCount, nil
}

// SearchBoards searches for boards using MongoDB text search
func (s *SearchService) SearchBoards(ctx context.Context, query SearchOptions) ([]SearchResult, int64, error) {
	// Build MongoDB filter
	filter := bson.M{
		"$text": bson.M{"$search": query.Query},
	}

	// Add workspace filter
	if !query.WorkspaceID.IsZero() {
		filter["workspaceId"] = query.WorkspaceID
	}

	// Add board filter
	if len(query.BoardIDs) > 0 {
		filter["_id"] = bson.M{"$in": query.BoardIDs}
	}

	// Get total count
	totalCount, err := s.boardRepo.Count(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count boards: %w", err)
	}

	// Search boards
	boards, err := s.boardRepo.List(ctx, filter, query.Limit*2, 0)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search boards: %w", err)
	}

	var results []SearchResult
	for _, board := range boards {
		result := SearchResult{
			ID:          board.ID,
			Type:        "board",
			Title:       board.Name,
			Content:     board.Description,
			Score:       s.calculateBoardScore(board, query.Query),
			WorkspaceID: board.WorkspaceID,
			BoardID:     board.ID,
			CreatedAt:   board.CreatedAt,
			UpdatedAt:   board.UpdatedAt,
			Highlights:  s.generateHighlights(board.Name+" "+board.Description, query.Query),
		}
		results = append(results, result)
	}

	return results, totalCount, nil
}

// extractItemContent extracts searchable content from item field values
func (s *SearchService) extractItemContent(item *models.Item) string {
	var content []string
	content = append(content, item.Name)

	// Extract text from field values
	for _, fieldValue := range item.FieldValues {
		if str, ok := fieldValue.Value.(string); ok && str != "" {
			content = append(content, str)
		}
	}

	return strings.Join(content, " ")
}

// calculateItemScore calculates relevance score for items
func (s *SearchService) calculateItemScore(item *models.Item, query string) float64 {
	score := 0.0
	queryLower := strings.ToLower(query)

	// Name match gets highest score
	if strings.Contains(strings.ToLower(item.Name), queryLower) {
		score += 10.0
		if strings.ToLower(item.Name) == queryLower {
			score += 20.0 // Exact match bonus
		}
	}

	// Field value matches get lower score
	for _, fieldValue := range item.FieldValues {
		if str, ok := fieldValue.Value.(string); ok {
			if strings.Contains(strings.ToLower(str), queryLower) {
				score += 5.0
			}
		}
	}

	// Recency bonus (newer items get slight boost)
	daysSinceCreation := time.Since(item.CreatedAt).Hours() / 24
	if daysSinceCreation < 7 {
		score += (7 - daysSinceCreation) * 0.1
	}

	return score
}

// calculateCommentScore calculates relevance score for comments
func (s *SearchService) calculateCommentScore(comment *models.Comment, query string) float64 {
	score := 0.0
	queryLower := strings.ToLower(query)
	contentLower := strings.ToLower(comment.Content)

	// Content match
	if strings.Contains(contentLower, queryLower) {
		score += 8.0

		// Exact phrase match bonus
		if strings.Contains(contentLower, queryLower) {
			score += 5.0
		}
	}

	// Recency bonus
	daysSinceCreation := time.Since(comment.CreatedAt).Hours() / 24
	if daysSinceCreation < 7 {
		score += (7 - daysSinceCreation) * 0.1
	}

	return score
}

// calculateBoardScore calculates relevance score for boards
func (s *SearchService) calculateBoardScore(board *models.Board, query string) float64 {
	score := 0.0
	queryLower := strings.ToLower(query)

	// Name match gets highest score
	if strings.Contains(strings.ToLower(board.Name), queryLower) {
		score += 15.0
		if strings.ToLower(board.Name) == queryLower {
			score += 25.0 // Exact match bonus
		}
	}

	// Description match
	if strings.Contains(strings.ToLower(board.Description), queryLower) {
		score += 8.0
	}

	return score
}

// generateHighlights generates highlighted text snippets
func (s *SearchService) generateHighlights(text, query string) []string {
	if text == "" || query == "" {
		return []string{}
	}

	queryLower := strings.ToLower(query)
	textLower := strings.ToLower(text)

	var highlights []string

	// Find all occurrences of the query
	searchText := textLower
	offset := 0

	for len(highlights) < 3 { // Limit to 3 highlights
		index := strings.Index(searchText, queryLower)
		if index == -1 {
			break
		}

		actualIndex := offset + index
		start := max(0, actualIndex-30)
		end := min(len(text), actualIndex+len(query)+30)

		if start < len(text) && end <= len(text) && start <= end {
			snippet := text[start:end]
			if start > 0 {
				snippet = "..." + snippet
			}
			if end < len(text) {
				snippet = snippet + "..."
			}
			highlights = append(highlights, snippet)
		}

		// Move to next potential match
		offset = actualIndex + 1
		if offset >= len(textLower) {
			break
		}
		searchText = textLower[offset:]
	}

	return highlights
}

// sortResults sorts search results based on criteria
func (s *SearchService) sortResults(results []SearchResult, sortBy, sortOrder string) []SearchResult {
	// Implementation would use sort.Slice with appropriate comparison functions
	// For now, return as-is (already sorted by relevance from MongoDB)
	return results
}

// paginateResults applies pagination to results
func (s *SearchService) PaginateResults(results []SearchResult, skip, limit int64) []SearchResult {
	if skip >= int64(len(results)) {
		return []SearchResult{}
	}

	end := minInt64(int64(len(results)), skip+limit)
	return results[skip:end]
}

// truncateText truncates text to specified length
func (s *SearchService) truncateText(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return text[:maxLength-3] + "..."
}

// Helper functions
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func minInt64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
