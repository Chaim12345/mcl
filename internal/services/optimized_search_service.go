package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/repository"
)

// OptimizedSearchService provides high-performance search using aggregation pipelines
type OptimizedSearchService struct {
	db                 *mongo.Database
	itemRepo           repository.ItemRepository
	commentRepo        repository.CommentRepository
	boardRepo          repository.BoardRepository
	cacheService       *CacheService
	performanceMonitor *QueryPerformanceMonitor
}

// NewOptimizedSearchService creates a new optimized search service
func NewOptimizedSearchService(
	db *mongo.Database,
	itemRepo repository.ItemRepository,
	commentRepo repository.CommentRepository,
	boardRepo repository.BoardRepository,
	cacheService *CacheService,
	performanceMonitor *QueryPerformanceMonitor,
) *OptimizedSearchService {
	return &OptimizedSearchService{
		db:                 db,
		itemRepo:           itemRepo,
		commentRepo:        commentRepo,
		boardRepo:          boardRepo,
		cacheService:       cacheService,
		performanceMonitor: performanceMonitor,
	}
}

// UnifiedSearchResult represents a search result with workspace context
type UnifiedSearchResult struct {
	ID          primitive.ObjectID `json:"id" bson:"_id"`
	Type        string             `json:"type" bson:"type"`
	Title       string             `json:"title" bson:"title"`
	Content     string             `json:"content" bson:"content"`
	Score       float64            `json:"score" bson:"score"`
	WorkspaceID primitive.ObjectID `json:"workspaceId" bson:"workspaceId"`
	BoardID     primitive.ObjectID `json:"boardId" bson:"boardId"`
	ItemID      primitive.ObjectID `json:"itemId,omitempty" bson:"itemId,omitempty"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt"`
	Highlights  []string           `json:"highlights" bson:"highlights"`
	Metadata    bson.M             `json:"metadata" bson:"metadata"`
}

// OptimizedSearchOptions represents search parameters with caching support
type OptimizedSearchOptions struct {
	Query       string               `json:"query"`
	WorkspaceID primitive.ObjectID   `json:"workspaceId"`
	BoardIDs    []primitive.ObjectID `json:"boardIds,omitempty"`
	ItemIDs     []primitive.ObjectID `json:"itemIds,omitempty"`
	Types       []string             `json:"types,omitempty"`
	Limit       int64                `json:"limit"`
	Skip        int64                `json:"skip"`
	SortBy      string               `json:"sortBy"`
	SortOrder   string               `json:"sortOrder"`
	UseCache    bool                 `json:"useCache"`
	CacheTTL    time.Duration        `json:"cacheTtl"`
}

// OptimizedSearchResults represents search results with performance metrics
type OptimizedSearchResults struct {
	Results    []UnifiedSearchResult `json:"results"`
	TotalCount int64                 `json:"totalCount"`
	HasMore    bool                  `json:"hasMore"`
	Query      string                `json:"query"`
	TimeTaken  time.Duration         `json:"timeTaken"`
	Skip       int64                 `json:"skip"`
	Limit      int64                 `json:"limit"`
	CacheHit   bool                  `json:"cacheHit"`
	QueryPlan  string                `json:"queryPlan,omitempty"`
}

// UnifiedSearch performs optimized search across all entities using aggregation pipelines
func (oss *OptimizedSearchService) UnifiedSearch(ctx context.Context, options OptimizedSearchOptions) (*OptimizedSearchResults, error) {
	startTime := time.Now()

	// Validate and set defaults
	if err := oss.validateSearchOptions(&options); err != nil {
		return nil, fmt.Errorf("invalid search options: %w", err)
	}

	// Check cache first
	if options.UseCache {
		if cached, found := oss.getCachedResults(options); found {
			cached.TimeTaken = time.Since(startTime)
			cached.CacheHit = true
			return cached, nil
		}
	}

	// Build aggregation pipeline for unified search
	pipeline, err := oss.buildUnifiedSearchPipeline(options)
	if err != nil {
		return nil, fmt.Errorf("failed to build search pipeline: %w", err)
	}

	// Execute search with performance monitoring
	var results []UnifiedSearchResult
	var totalCount int64

	err = oss.performanceMonitor.MonitoredQuery(ctx, "unified_search", "aggregate", bson.M{"query": options.Query}, func() error {
		// Execute the aggregation pipeline
		cursor, err := oss.executeUnifiedSearchPipeline(ctx, pipeline)
		if err != nil {
			return err
		}
		defer cursor.Close(ctx)

		// Decode results
		if err = cursor.All(ctx, &results); err != nil {
			return fmt.Errorf("failed to decode search results: %w", err)
		}

		// Get total count (this would be optimized in a real implementation)
		totalCount = int64(len(results))

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("search execution failed: %w", err)
	}

	// Apply post-processing
	results = oss.postProcessResults(results, options)

	// Build response
	response := &OptimizedSearchResults{
		Results:    results,
		TotalCount: totalCount,
		HasMore:    totalCount > options.Skip+int64(len(results)),
		Query:      options.Query,
		TimeTaken:  time.Since(startTime),
		Skip:       options.Skip,
		Limit:      options.Limit,
		CacheHit:   false,
		QueryPlan:  "aggregation_pipeline",
	}

	// Cache results
	if options.UseCache {
		oss.cacheResults(options, response)
	}

	return response, nil
}

// buildUnifiedSearchPipeline creates an optimized aggregation pipeline for unified search
func (oss *OptimizedSearchService) buildUnifiedSearchPipeline(options OptimizedSearchOptions) ([]bson.M, error) {
	var pipeline []bson.M

	// Create union pipeline for different entity types
	unionPipelines := []bson.M{}

	// Add item search pipeline
	if len(options.Types) == 0 || contains(options.Types, "item") {
		itemPipeline := oss.buildItemSearchPipeline(options)
		unionPipelines = append(unionPipelines, bson.M{
			"from":     "items",
			"pipeline": itemPipeline,
		})
	}

	// Add comment search pipeline
	if len(options.Types) == 0 || contains(options.Types, "comment") {
		commentPipeline := oss.buildCommentSearchPipeline(options)
		unionPipelines = append(unionPipelines, bson.M{
			"from":     "comments",
			"pipeline": commentPipeline,
		})
	}

	// Add board search pipeline
	if len(options.Types) == 0 || contains(options.Types, "board") {
		boardPipeline := oss.buildBoardSearchPipeline(options)
		unionPipelines = append(unionPipelines, bson.M{
			"from":     "boards",
			"pipeline": boardPipeline,
		})
	}

	// Use $unionWith to combine results from different collections
	pipeline = append(pipeline, bson.M{
		"$unionWith": unionPipelines,
	})

	// Add sorting
	sortStage := oss.buildSortStage(options)
	if sortStage != nil {
		pipeline = append(pipeline, sortStage)
	}

	// Add pagination
	if options.Skip > 0 {
		pipeline = append(pipeline, bson.M{"$skip": options.Skip})
	}
	if options.Limit > 0 {
		pipeline = append(pipeline, bson.M{"$limit": options.Limit})
	}

	return pipeline, nil
}

// buildItemSearchPipeline creates the aggregation pipeline for item search
func (oss *OptimizedSearchService) buildItemSearchPipeline(options OptimizedSearchOptions) []bson.M {
	pipeline := []bson.M{}

	// Text search stage
	if options.Query != "" {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"$text": bson.M{"$search": options.Query},
			},
		})
	}

	// Join with boards to get workspace information
	pipeline = append(pipeline, bson.M{
		"$lookup": bson.M{
			"from":         "boards",
			"localField":   "boardId",
			"foreignField": "_id",
			"as":           "board",
		},
	})

	// Unwind board array
	pipeline = append(pipeline, bson.M{
		"$unwind": "$board",
	})

	// Filter by workspace
	if !options.WorkspaceID.IsZero() {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"board.workspaceId": options.WorkspaceID,
			},
		})
	}

	// Filter by boards
	if len(options.BoardIDs) > 0 {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"boardId": bson.M{"$in": options.BoardIDs},
			},
		})
	}

	// Project to unified result format
	pipeline = append(pipeline, bson.M{
		"$project": bson.M{
			"_id":         1,
			"type":        bson.M{"$literal": "item"},
			"title":       "$name",
			"content":     "$description",
			"score":       bson.M{"$meta": "textScore"},
			"workspaceId": "$board.workspaceId",
			"boardId":     "$boardId",
			"createdAt":   1,
			"updatedAt":   1,
			"highlights":  bson.M{"$literal": []interface{}{}},
			"metadata": bson.M{
				"assignees":   "$assignees",
				"position":    "$position",
				"fieldValues": "$fieldValues",
			},
		},
	})

	return pipeline
}

// buildCommentSearchPipeline creates the aggregation pipeline for comment search
func (oss *OptimizedSearchService) buildCommentSearchPipeline(options OptimizedSearchOptions) []bson.M {
	pipeline := []bson.M{}

	// Text search stage
	if options.Query != "" {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"$text": bson.M{"$search": options.Query},
			},
		})
	}

	// Join with items to get board information
	pipeline = append(pipeline, bson.M{
		"$lookup": bson.M{
			"from":         "items",
			"localField":   "itemId",
			"foreignField": "_id",
			"as":           "item",
		},
	})

	// Unwind item array
	pipeline = append(pipeline, bson.M{
		"$unwind": "$item",
	})

	// Join with boards to get workspace information
	pipeline = append(pipeline, bson.M{
		"$lookup": bson.M{
			"from":         "boards",
			"localField":   "item.boardId",
			"foreignField": "_id",
			"as":           "board",
		},
	})

	// Unwind board array
	pipeline = append(pipeline, bson.M{
		"$unwind": "$board",
	})

	// Filter by workspace
	if !options.WorkspaceID.IsZero() {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"board.workspaceId": options.WorkspaceID,
			},
		})
	}

	// Filter by boards
	if len(options.BoardIDs) > 0 {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"item.boardId": bson.M{"$in": options.BoardIDs},
			},
		})
	}

	// Filter by items
	if len(options.ItemIDs) > 0 {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"itemId": bson.M{"$in": options.ItemIDs},
			},
		})
	}

	// Project to unified result format
	pipeline = append(pipeline, bson.M{
		"$project": bson.M{
			"_id":         1,
			"type":        bson.M{"$literal": "comment"},
			"title":       bson.M{"$substr": []interface{}{"$content", 0, 100}},
			"content":     "$content",
			"score":       bson.M{"$meta": "textScore"},
			"workspaceId": "$board.workspaceId",
			"boardId":     "$item.boardId",
			"itemId":      "$itemId",
			"createdAt":   1,
			"updatedAt":   1,
			"highlights":  bson.M{"$literal": []interface{}{}},
			"metadata": bson.M{
				"authorId": "$authorId",
				"mentions": "$mentions",
				"parentId": "$parentId",
			},
		},
	})

	return pipeline
}

// buildBoardSearchPipeline creates the aggregation pipeline for board search
func (oss *OptimizedSearchService) buildBoardSearchPipeline(options OptimizedSearchOptions) []bson.M {
	pipeline := []bson.M{}

	// Text search stage
	if options.Query != "" {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"$text": bson.M{"$search": options.Query},
			},
		})
	}

	// Filter by workspace
	if !options.WorkspaceID.IsZero() {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"workspaceId": options.WorkspaceID,
			},
		})
	}

	// Filter by boards
	if len(options.BoardIDs) > 0 {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"_id": bson.M{"$in": options.BoardIDs},
			},
		})
	}

	// Project to unified result format
	pipeline = append(pipeline, bson.M{
		"$project": bson.M{
			"_id":         1,
			"type":        bson.M{"$literal": "board"},
			"title":       "$name",
			"content":     "$description",
			"score":       bson.M{"$meta": "textScore"},
			"workspaceId": "$workspaceId",
			"boardId":     "$_id",
			"createdAt":   1,
			"updatedAt":   1,
			"highlights":  bson.M{"$literal": []interface{}{}},
			"metadata": bson.M{
				"color":     "$color",
				"createdBy": "$createdBy",
				"columns":   "$columns",
			},
		},
	})

	return pipeline
}

// buildItemContentExpression creates a MongoDB expression to extract item content
func (oss *OptimizedSearchService) buildItemContentExpression() bson.M {
	return bson.M{
		"$concat": []interface{}{
			"$name",
			" ",
			bson.M{
				"$reduce": bson.M{
					"input":        "$fieldValues",
					"initialValue": "",
					"in": bson.M{
						"$concat": []interface{}{
							"$$value",
							" ",
							bson.M{
								"$cond": bson.M{
									"if":   bson.M{"$eq": []interface{}{bson.M{"$type": "$$this.value"}, "string"}},
									"then": "$$this.value",
									"else": "",
								},
							},
						},
					},
				},
			},
		},
	}
}

// buildSortStage creates the sort stage for the aggregation pipeline
func (oss *OptimizedSearchService) buildSortStage(options OptimizedSearchOptions) bson.M {
	sortOrder := 1
	if options.SortOrder == "desc" {
		sortOrder = -1
	}

	switch options.SortBy {
	case "relevance":
		if options.Query != "" {
			return bson.M{"$sort": bson.M{"score": bson.M{"$meta": "textScore"}}}
		}
		return bson.M{"$sort": bson.M{"updatedAt": -1}}
	case "date":
		return bson.M{"$sort": bson.M{"createdAt": sortOrder}}
	case "name":
		return bson.M{"$sort": bson.M{"title": sortOrder}}
	default:
		return bson.M{"$sort": bson.M{"updatedAt": -1}}
	}
}

// executeUnifiedSearchPipeline executes the aggregation pipeline
func (oss *OptimizedSearchService) executeUnifiedSearchPipeline(ctx context.Context, pipeline []bson.M) (*mongo.Cursor, error) {
	// For unified search, we'll start with an empty collection and use $unionWith
	// In practice, you might want to start with the most common collection
	collection := oss.db.Collection("items")

	return collection.Aggregate(ctx, pipeline)
}

// postProcessResults applies post-processing to search results
func (oss *OptimizedSearchService) postProcessResults(results []UnifiedSearchResult, options OptimizedSearchOptions) []UnifiedSearchResult {
	for i := range results {
		// Generate highlights
		if options.Query != "" {
			results[i].Highlights = oss.generateHighlights(results[i].Content, options.Query)
		}

		// Calculate enhanced score
		results[i].Score = oss.calculateEnhancedScore(results[i], options.Query)
	}

	return results
}

// generateHighlights generates highlighted text snippets
func (oss *OptimizedSearchService) generateHighlights(text, query string) []string {
	if text == "" || query == "" {
		return []string{}
	}

	queryLower := strings.ToLower(query)
	textLower := strings.ToLower(text)

	var highlights []string
	searchText := textLower
	offset := 0

	for len(highlights) < 3 {
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

		offset = actualIndex + 1
		if offset >= len(textLower) {
			break
		}
		searchText = textLower[offset:]
	}

	return highlights
}

// calculateEnhancedScore calculates an enhanced relevance score
func (oss *OptimizedSearchService) calculateEnhancedScore(result UnifiedSearchResult, query string) float64 {
	score := result.Score

	// Boost based on result type
	switch result.Type {
	case "board":
		score *= 1.5 // Boards are more important
	case "item":
		score *= 1.2 // Items are moderately important
	case "comment":
		score *= 1.0 // Comments have base importance
	}

	// Recency boost
	daysSinceUpdate := time.Since(result.UpdatedAt).Hours() / 24
	if daysSinceUpdate < 7 {
		score += (7 - daysSinceUpdate) * 0.1
	}

	// Exact match boost
	if strings.Contains(strings.ToLower(result.Title), strings.ToLower(query)) {
		score += 5.0
	}

	return score
}

// validateSearchOptions validates and normalizes search options
func (oss *OptimizedSearchService) validateSearchOptions(options *OptimizedSearchOptions) error {
	if options.Limit <= 0 || options.Limit > 100 {
		options.Limit = 20
	}
	if options.Skip < 0 {
		options.Skip = 0
	}
	if options.SortBy == "" {
		options.SortBy = "relevance"
	}
	if options.SortOrder == "" {
		options.SortOrder = "desc"
	}
	if options.CacheTTL == 0 {
		options.CacheTTL = 5 * time.Minute
	}

	return nil
}

// getCachedResults retrieves cached search results
func (oss *OptimizedSearchService) getCachedResults(options OptimizedSearchOptions) (*OptimizedSearchResults, bool) {
	if oss.cacheService == nil {
		return nil, false
	}

	cacheKey := oss.generateCacheKey(options)
	if cached, found := oss.cacheService.Get(cacheKey); found {
		if results, ok := cached.(*OptimizedSearchResults); ok {
			return results, true
		}
	}

	return nil, false
}

// cacheResults stores search results in cache
func (oss *OptimizedSearchService) cacheResults(options OptimizedSearchOptions, results *OptimizedSearchResults) {
	if oss.cacheService == nil {
		return
	}

	cacheKey := oss.generateCacheKey(options)
	oss.cacheService.SetWithTTL(cacheKey, results, options.CacheTTL)
}

// generateCacheKey generates a cache key for search options
func (oss *OptimizedSearchService) generateCacheKey(options OptimizedSearchOptions) string {
	return fmt.Sprintf("optimized_search:%s:%s:%d:%d:%s:%s",
		options.WorkspaceID.Hex(),
		options.Query,
		options.Skip,
		options.Limit,
		options.SortBy,
		options.SortOrder,
	)
}
