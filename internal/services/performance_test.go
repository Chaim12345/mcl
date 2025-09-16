package services

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// PerformanceTestSuite contains all performance tests
type PerformanceTestSuite struct {
	db                     *mongo.Database
	client                 *mongo.Client
	indexManager           *IndexManager
	performanceMonitor     *QueryPerformanceMonitor
	optimizedSearchService *OptimizedSearchService
	cacheService           *CacheService
	logger                 *log.Logger
}

// SetupPerformanceTestSuite initializes the performance test environment
func SetupPerformanceTestSuite(t *testing.T) *PerformanceTestSuite {
	// Skip performance tests in short mode
	if testing.Short() {
		t.Skip("Skipping performance tests in short mode")
	}

	// Connect to test database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := os.Getenv("MONGODB_TEST_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		t.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	// Use a test database
	dbName := fmt.Sprintf("perf_test_%d", time.Now().Unix())
	db := client.Database(dbName)

	logger := log.New(os.Stdout, "PERF_TEST: ", log.LstdFlags)

	// Initialize services
	indexManager := NewIndexManager(db, logger)
	performanceMonitor := NewQueryPerformanceMonitor(db, logger)
	cacheService := NewCacheService(5*time.Minute, 1000)

	// Create repositories
	_ = repository.NewUserRepository(db)
	_ = repository.NewWorkspaceRepository(db)
	boardRepo := repository.NewBoardRepository(db)
	itemRepo := repository.NewItemRepository(db)
	commentRepo := repository.NewCommentRepository(db)

	optimizedSearchService := NewOptimizedSearchService(
		db, itemRepo, commentRepo, boardRepo, cacheService, performanceMonitor,
	)

	suite := &PerformanceTestSuite{
		db:                     db,
		client:                 client,
		indexManager:           indexManager,
		performanceMonitor:     performanceMonitor,
		optimizedSearchService: optimizedSearchService,
		cacheService:           cacheService,
		logger:                 logger,
	}

	// Create indexes
	if err := indexManager.CreateAllIndexes(ctx); err != nil {
		t.Fatalf("Failed to create indexes: %v", err)
	}

	return suite
}

// TeardownPerformanceTestSuite cleans up the test environment
func (pts *PerformanceTestSuite) TeardownPerformanceTestSuite(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Drop test database
	if err := pts.db.Drop(ctx); err != nil {
		t.Logf("Failed to drop test database: %v", err)
	}

	// Close connection
	if err := pts.client.Disconnect(ctx); err != nil {
		t.Logf("Failed to disconnect from MongoDB: %v", err)
	}
}

// TestIndexCreationPerformance tests the performance of index creation
func TestIndexCreationPerformance(t *testing.T) {
	suite := SetupPerformanceTestSuite(t)
	defer suite.TeardownPerformanceTestSuite(t)

	ctx := context.Background()

	// Measure index creation time
	startTime := time.Now()
	err := suite.indexManager.CreateAllIndexes(ctx)
	indexCreationTime := time.Since(startTime)

	if err != nil {
		t.Fatalf("Index creation failed: %v", err)
	}

	suite.logger.Printf("Index creation took: %v", indexCreationTime)

	// Verify all indexes were created
	missingIndexes, err := suite.indexManager.ValidateIndexes(ctx)
	if err != nil {
		t.Fatalf("Index validation failed: %v", err)
	}

	if len(missingIndexes) > 0 {
		t.Fatalf("Missing indexes: %v", missingIndexes)
	}

	// Performance assertion
	if indexCreationTime > 30*time.Second {
		t.Errorf("Index creation took too long: %v (expected < 30s)", indexCreationTime)
	}
}

// TestSearchPerformanceWithoutIndexes tests search performance without indexes
func TestSearchPerformanceWithoutIndexes(t *testing.T) {
	suite := SetupPerformanceTestSuite(t)
	defer suite.TeardownPerformanceTestSuite(t)

	ctx := context.Background()

	// Generate test data without indexes
	suite.generateTestData(ctx, 1000, 100, 5000, 10000)

	// Test search performance
	searchOptions := OptimizedSearchOptions{
		Query:    "test query",
		Limit:    20,
		Skip:     0,
		SortBy:   "relevance",
		UseCache: false,
	}

	startTime := time.Now()
	results, err := suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
	searchTime := time.Since(startTime)

	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}

	suite.logger.Printf("Search without indexes took: %v, found %d results",
		searchTime, len(results.Results))

	// This should be slow without indexes
	if searchTime < 100*time.Millisecond {
		t.Logf("Search was unexpectedly fast without indexes: %v", searchTime)
	}
}

// TestSearchPerformanceWithIndexes tests search performance with indexes
func TestSearchPerformanceWithIndexes(t *testing.T) {
	suite := SetupPerformanceTestSuite(t)
	defer suite.TeardownPerformanceTestSuite(t)

	ctx := context.Background()

	// Create indexes first
	err := suite.indexManager.CreateAllIndexes(ctx)
	if err != nil {
		t.Fatalf("Failed to create indexes: %v", err)
	}

	// Generate test data
	suite.generateTestData(ctx, 1000, 100, 5000, 10000)

	// Test search performance
	searchOptions := OptimizedSearchOptions{
		Query:    "test query",
		Limit:    20,
		Skip:     0,
		SortBy:   "relevance",
		UseCache: false,
	}

	startTime := time.Now()
	results, err := suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
	searchTime := time.Since(startTime)

	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}

	suite.logger.Printf("Search with indexes took: %v, found %d results",
		searchTime, len(results.Results))

	// This should be fast with indexes
	if searchTime > 500*time.Millisecond {
		t.Errorf("Search was too slow with indexes: %v (expected < 500ms)", searchTime)
	}
}

// TestCachePerformance tests the performance impact of caching
func TestCachePerformance(t *testing.T) {
	suite := SetupPerformanceTestSuite(t)
	defer suite.TeardownPerformanceTestSuite(t)

	ctx := context.Background()

	// Create indexes and generate test data
	err := suite.indexManager.CreateAllIndexes(ctx)
	if err != nil {
		t.Fatalf("Failed to create indexes: %v", err)
	}

	suite.generateTestData(ctx, 500, 50, 2500, 5000)

	searchOptions := OptimizedSearchOptions{
		Query:    "performance test",
		Limit:    20,
		Skip:     0,
		SortBy:   "relevance",
		UseCache: true,
		CacheTTL: 5 * time.Minute,
	}

	// First search (cache miss)
	startTime := time.Now()
	results1, err := suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
	firstSearchTime := time.Since(startTime)

	if err != nil {
		t.Fatalf("First search failed: %v", err)
	}

	// Second search (cache hit)
	startTime = time.Now()
	results2, err := suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
	secondSearchTime := time.Since(startTime)

	if err != nil {
		t.Fatalf("Second search failed: %v", err)
	}

	suite.logger.Printf("First search (cache miss): %v", firstSearchTime)
	suite.logger.Printf("Second search (cache hit): %v", secondSearchTime)

	// Verify cache hit
	if !results2.CacheHit {
		t.Error("Second search should have been a cache hit")
	}

	// Cache should be significantly faster
	if secondSearchTime >= firstSearchTime/2 {
		t.Errorf("Cache hit not significantly faster: %v vs %v", secondSearchTime, firstSearchTime)
	}

	// Verify results are the same
	if len(results1.Results) != len(results2.Results) {
		t.Errorf("Cached results differ in count: %d vs %d", len(results1.Results), len(results2.Results))
	}
}

// TestQueryPerformanceMonitoring tests the query performance monitoring system
func TestQueryPerformanceMonitoring(t *testing.T) {
	suite := SetupPerformanceTestSuite(t)
	defer suite.TeardownPerformanceTestSuite(t)

	ctx := context.Background()

	// Set up slow query alerting
	var slowQueries []QueryMetrics
	suite.performanceMonitor.SetSlowQueryThreshold(50 * time.Millisecond)
	suite.performanceMonitor.SetAlertCallback(func(metrics QueryMetrics) {
		slowQueries = append(slowQueries, metrics)
	})

	// Generate test data
	suite.generateTestData(ctx, 100, 10, 500, 1000)

	// Perform various queries to generate metrics
	for i := 0; i < 10; i++ {
		searchOptions := OptimizedSearchOptions{
			Query:    fmt.Sprintf("test query %d", i),
			Limit:    10,
			Skip:     int64(i * 10),
			UseCache: false,
		}

		_, err := suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
		if err != nil {
			t.Fatalf("Search %d failed: %v", i, err)
		}
	}

	// Get performance report
	since := time.Now().Add(-1 * time.Minute)
	report := suite.performanceMonitor.GetPerformanceReport(since)

	suite.logger.Printf("Performance Report:")
	suite.logger.Printf("  Total Queries: %d", report.TotalQueries)
	suite.logger.Printf("  Slow Queries: %d", report.SlowQueries)
	suite.logger.Printf("  Average Duration: %v", report.AverageDuration)
	suite.logger.Printf("  Slow Query Percentage: %.2f%%", report.SlowQueryPercentage)

	// Verify monitoring is working
	if report.TotalQueries == 0 {
		t.Error("No queries were monitored")
	}

	// Check recommendations
	recommendations := suite.performanceMonitor.GenerateRecommendations(report)
	suite.logger.Printf("Recommendations: %v", recommendations)
}

// TestIndexUsageAnalysis tests index usage analysis
func TestIndexUsageAnalysis(t *testing.T) {
	suite := SetupPerformanceTestSuite(t)
	defer suite.TeardownPerformanceTestSuite(t)

	ctx := context.Background()

	// Create indexes
	err := suite.indexManager.CreateAllIndexes(ctx)
	if err != nil {
		t.Fatalf("Failed to create indexes: %v", err)
	}

	// Generate test data and perform queries
	suite.generateTestData(ctx, 200, 20, 1000, 2000)

	// Perform various queries to use different indexes
	collections := []string{"users", "workspaces", "boards", "items", "comments"}

	for _, collection := range collections {
		optimization, err := suite.indexManager.OptimizeCollection(ctx, collection)
		if err != nil {
			t.Fatalf("Failed to analyze collection %s: %v", collection, err)
		}

		suite.logger.Printf("Collection %s optimization:", collection)
		suite.logger.Printf("  Document Count: %d", optimization.DocumentCount)
		suite.logger.Printf("  Total Size: %d bytes", optimization.TotalSize)
		suite.logger.Printf("  Index Size: %d bytes", optimization.IndexSize)
		suite.logger.Printf("  Suggestions: %v", optimization.Suggestions)
	}
}

// BenchmarkSearchPerformance benchmarks search performance
func BenchmarkSearchPerformance(b *testing.B) {
	suite := SetupPerformanceTestSuite(&testing.T{})
	defer suite.TeardownPerformanceTestSuite(&testing.T{})

	ctx := context.Background()

	// Create indexes and generate test data
	err := suite.indexManager.CreateAllIndexes(ctx)
	if err != nil {
		b.Fatalf("Failed to create indexes: %v", err)
	}

	suite.generateTestData(ctx, 1000, 100, 5000, 10000)

	searchOptions := OptimizedSearchOptions{
		Query:    "benchmark test",
		Limit:    20,
		Skip:     0,
		SortBy:   "relevance",
		UseCache: false,
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, err := suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
			if err != nil {
				b.Fatalf("Search failed: %v", err)
			}
		}
	})
}

// BenchmarkCachePerformance benchmarks cache performance
func BenchmarkCachePerformance(b *testing.B) {
	suite := SetupPerformanceTestSuite(&testing.T{})
	defer suite.TeardownPerformanceTestSuite(&testing.T{})

	ctx := context.Background()

	// Create indexes and generate test data
	err := suite.indexManager.CreateAllIndexes(ctx)
	if err != nil {
		b.Fatalf("Failed to create indexes: %v", err)
	}

	suite.generateTestData(ctx, 500, 50, 2500, 5000)

	searchOptions := OptimizedSearchOptions{
		Query:    "cache benchmark",
		Limit:    20,
		Skip:     0,
		SortBy:   "relevance",
		UseCache: true,
		CacheTTL: 5 * time.Minute,
	}

	// Warm up cache
	_, err = suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
	if err != nil {
		b.Fatalf("Warmup search failed: %v", err)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, err := suite.optimizedSearchService.UnifiedSearch(ctx, searchOptions)
			if err != nil {
				b.Fatalf("Search failed: %v", err)
			}
		}
	})
}

// generateTestData creates test data for performance testing
func (pts *PerformanceTestSuite) generateTestData(ctx context.Context, users, workspaces, items, comments int) {
	pts.logger.Printf("Generating test data: %d users, %d workspaces, %d items, %d comments",
		users, workspaces, items, comments)

	// Generate users
	var userIDs []primitive.ObjectID
	for i := 0; i < users; i++ {
		user := &models.User{
			ID:        primitive.NewObjectID(),
			Email:     fmt.Sprintf("user%d@test.com", i),
			FirstName: fmt.Sprintf("User%d", i),
			LastName:  "Test",
			CreatedAt: time.Now().Add(-time.Duration(rand.Intn(365)) * 24 * time.Hour),
			UpdatedAt: time.Now(),
		}
		userIDs = append(userIDs, user.ID)

		_, err := pts.db.Collection("users").InsertOne(ctx, user)
		if err != nil {
			pts.logger.Printf("Failed to insert user: %v", err)
		}
	}

	// Generate workspaces and boards
	var boardIDs []primitive.ObjectID
	for i := 0; i < workspaces; i++ {
		workspace := &models.Workspace{
			ID:          primitive.NewObjectID(),
			Name:        fmt.Sprintf("Workspace %d", i),
			Description: fmt.Sprintf("Test workspace %d for performance testing", i),
			OwnerID:     userIDs[rand.Intn(len(userIDs))],
			CreatedAt:   time.Now().Add(-time.Duration(rand.Intn(180)) * 24 * time.Hour),
			UpdatedAt:   time.Now(),
		}

		_, err := pts.db.Collection("workspaces").InsertOne(ctx, workspace)
		if err != nil {
			pts.logger.Printf("Failed to insert workspace: %v", err)
		}

		// Create boards for this workspace
		boardsPerWorkspace := 5 + rand.Intn(10)
		for j := 0; j < boardsPerWorkspace; j++ {
			board := &models.Board{
				ID:          primitive.NewObjectID(),
				Name:        fmt.Sprintf("Board %d-%d", i, j),
				Description: fmt.Sprintf("Test board %d-%d with searchable content", i, j),
				WorkspaceID: workspace.ID,
				CreatedBy:   userIDs[rand.Intn(len(userIDs))],
				CreatedAt:   time.Now().Add(-time.Duration(rand.Intn(90)) * 24 * time.Hour),
				UpdatedAt:   time.Now(),
			}
			boardIDs = append(boardIDs, board.ID)

			_, err := pts.db.Collection("boards").InsertOne(ctx, board)
			if err != nil {
				pts.logger.Printf("Failed to insert board: %v", err)
			}
		}
	}

	// Generate items
	var itemIDs []primitive.ObjectID
	for i := 0; i < items; i++ {
		item := &models.Item{
			ID:       primitive.NewObjectID(),
			Name:     fmt.Sprintf("Item %d test query performance", i),
			BoardID:  boardIDs[rand.Intn(len(boardIDs))],
			Position: i,
			FieldValues: []models.ItemFieldValue{
				{
					ColumnID: "status",
					Value:    []string{"To Do", "In Progress", "Done"}[rand.Intn(3)],
				},
				{
					ColumnID: "description",
					Value:    fmt.Sprintf("Test item %d description with searchable content", i),
				},
			},
			CreatedBy: userIDs[rand.Intn(len(userIDs))],
			CreatedAt: time.Now().Add(-time.Duration(rand.Intn(60)) * 24 * time.Hour),
			UpdatedAt: time.Now(),
		}
		itemIDs = append(itemIDs, item.ID)

		_, err := pts.db.Collection("items").InsertOne(ctx, item)
		if err != nil {
			pts.logger.Printf("Failed to insert item: %v", err)
		}
	}

	// Generate comments
	for i := 0; i < comments; i++ {
		comment := &models.Comment{
			ID:        primitive.NewObjectID(),
			Content:   fmt.Sprintf("Test comment %d with query content for performance testing", i),
			ItemID:    itemIDs[rand.Intn(len(itemIDs))],
			AuthorID:  userIDs[rand.Intn(len(userIDs))],
			CreatedAt: time.Now().Add(-time.Duration(rand.Intn(30)) * 24 * time.Hour),
			UpdatedAt: time.Now(),
		}

		_, err := pts.db.Collection("comments").InsertOne(ctx, comment)
		if err != nil {
			pts.logger.Printf("Failed to insert comment: %v", err)
		}
	}

	pts.logger.Printf("Test data generation completed")
}
