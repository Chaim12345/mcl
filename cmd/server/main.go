package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/sirupsen/logrus"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/config"
	"project-management-platform/internal/database"
	"project-management-platform/internal/handlers"
	"project-management-platform/internal/logger"
	"project-management-platform/internal/middleware"
	"project-management-platform/internal/monitoring"
	"project-management-platform/internal/repository"
	"project-management-platform/internal/security"
	"project-management-platform/internal/services"
	"project-management-platform/internal/websocket"
)

func main() {
	log.Println("Starting server...")
	
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	log.Println("Configuration loaded successfully")

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration validation failed: %v", err)
	}
	log.Println("Configuration validated successfully")

	// Setup structured logger
	loggerConfig := logger.DefaultConfig()
	if cfg.Environment == "development" {
		loggerConfig.Level = "debug"
		loggerConfig.Format = "text"
	}
	structuredLogger := logger.New(loggerConfig)

	// Connect to MongoDB
	client, err := database.NewClient(cfg.Database.URI)
	if err != nil {
		structuredLogger.Error("Failed to connect to MongoDB", "error", err)
		os.Exit(1)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := client.Disconnect(ctx); err != nil {
			structuredLogger.Error("Failed to disconnect from MongoDB", "error", err)
		}
	}()

	// Initialize monitoring service
	monitoringService := monitoring.NewMonitoringService(structuredLogger)

	// Start background monitoring tasks
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	monitoringService.StartBackgroundTasks(ctx)

	db := client.Database(cfg.Database.Name)

	// Initialize repositories
	repos := repository.NewRepositories(db)

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.AccessExpiration,
		cfg.JWT.RefreshExpiration,
	)

	// Initialize password hasher
	passwordHasher := auth.NewPasswordHasher()

	// Initialize validator (unused for now)
	_ = validator.New()

	// Initialize services
	emailService := services.NewEmailService(services.EmailConfig{
		SMTPHost:     cfg.Email.SMTPHost,
		SMTPPort:     cfg.Email.SMTPPort,
		SMTPUser:     cfg.Email.SMTPUser,
		SMTPPassword: cfg.Email.SMTPPassword,
		FromAddress:  cfg.Email.FromAddress,
	}, structuredLogger.Logger)
	authService := services.NewAuthService(repos.User, jwtManager, passwordHasher, emailService)
	workspaceService := services.NewWorkspaceService(repos.Workspace, repos.User, emailService)
	boardService := services.NewBoardService(repos.Board, repos.Workspace, repos.User)
	filterService := services.NewFilterService(repos.Item, repos.Comment, repos.Board, repos.Activity, nil)
	savedFilterService := services.NewSavedFilterService(repos.SavedFilter)
	searchService := services.NewSearchService(repos.Item, repos.Comment, repos.Board)

	// Initialize cache service
	cacheService := services.NewCacheService(5*time.Minute, 1000)

	// Initialize comment and activity services
	commentService := services.NewCommentService(
		repos.Comment,
		repos.Activity,
		repos.Notification,
		repos.User,
		repos.Item,
		repos.Board,
	)
	activityService := services.NewActivityService(repos.Activity, repos.User)

	// Initialize logrus logger for handlers (temporary compatibility)
	logrusLogger := logrus.New()
	logrusLogger.SetFormatter(&logrus.JSONFormatter{})

	// Initialize handlers
	itemService := services.NewItemService(repos.Item, repos.Board, repos.Workspace)
	itemHandler := handlers.NewItemHandler(itemService)
	authHandler := handlers.NewAuthHandler(authService, logrusLogger)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceService)
	boardHandler := handlers.NewBoardHandler(boardService)
	commentHandler := handlers.NewCommentHandler(commentService)
	activityHandler := handlers.NewActivityHandler(activityService)
	filterHandler := handlers.NewFilterHandler(filterService, cacheService, jwtManager)
	savedFilterHandler := handlers.NewSavedFilterHandler(savedFilterService, jwtManager)
	searchHandler := handlers.NewSearchHandler(searchService, cacheService, jwtManager)
	healthHandler := handlers.NewHealthHandler(client, structuredLogger)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Add middleware
	router.Use(gin.Recovery())

	// Security middleware
	if cfg.Environment == "production" {
		router.Use(middleware.HTTPSRedirectMiddleware())
	}
	router.Use(middleware.HSTSMiddleware())
	router.Use(middleware.CORSMiddleware(middleware.DefaultCORSConfig()))
	router.Use(middleware.SecurityHeadersMiddleware())
	router.Use(middleware.ContentSecurityPolicyMiddleware())
	router.Use(middleware.InputSanitizationMiddleware())
	router.Use(middleware.SecurityValidationMiddleware())
	router.Use(middleware.ValidationMiddleware())

	// CSRF protection
	router.Use(middleware.CSRFMiddleware())

	// Session security middleware
	router.Use(security.SessionSecurityMiddleware())

	// Rate limiting
	router.Use(middleware.RateLimitMiddleware(middleware.AuthRateLimitConfig{
		RequestsPerMinute: 100,
		BurstSize:         10,
	}))

	// Logging and monitoring
	router.Use(middleware.RequestIDMiddleware())
	router.Use(middleware.StructuredLoggingMiddleware(structuredLogger))
	router.Use(middleware.SecurityLoggingMiddleware(structuredLogger))
	router.Use(middleware.PerformanceLoggingMiddleware(structuredLogger))
	router.Use(middleware.ErrorLoggingMiddleware(structuredLogger))
	router.Use(monitoringService.GetMetricsCollector().MetricsMiddleware())

	// Initialize WebSocket handler and broadcaster
	websocketHandler := websocket.NewHandler(jwtManager)
	broadcaster := websocket.NewBroadcaster(websocketHandler.GetHub(), client)
	
	// Start WebSocket hub
	go websocketHandler.GetHub().Run()
	
	// Start WebSocket broadcaster
	ctxBroadcaster, cancelBroadcaster := context.WithCancel(context.Background())
	defer cancelBroadcaster()
	go broadcaster.Start(ctxBroadcaster)
	
	// Setup routes including WebSocket
	setupRoutes(router, authHandler, workspaceHandler, boardHandler, itemHandler, commentHandler, activityHandler, filterHandler, savedFilterHandler, searchHandler, healthHandler, monitoringService, jwtManager, websocketHandler)

	// Serve static files
	router.Static("/css", "frontend/vanilla/css")
	router.Static("/js", "frontend/vanilla/js")
	router.Static("/assets", "frontend/vanilla/assets")
	router.Static("/static", "frontend/vanilla")

	// Serve specific HTML pages
	router.StaticFile("/boards", "frontend/vanilla/boards.html")
	router.StaticFile("/board", "frontend/vanilla/board.html")
	router.StaticFile("/dashboard", "frontend/vanilla/dashboard.html")
	router.StaticFile("/calendar", "frontend/vanilla/calendar.html")
	router.StaticFile("/workspaces", "frontend/vanilla/workspaces.html")
	router.StaticFile("/users", "frontend/vanilla/users.html")
	router.StaticFile("/search", "frontend/vanilla/search.html")
	router.StaticFile("/activity", "frontend/vanilla/activity.html")

	// Serve index.html for root route
	router.StaticFile("/", "frontend/vanilla/index.html")

	// SPA catch-all: serve index.html for any non-API, non-static routes
	router.NoRoute(func(c *gin.Context) {
		// Don't serve index.html for API routes
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}
		// Don't serve index.html for static asset routes that already 404'd
		if strings.HasPrefix(c.Request.URL.Path, "/css/") ||
			strings.HasPrefix(c.Request.URL.Path, "/js/") ||
			strings.HasPrefix(c.Request.URL.Path, "/assets/") ||
			strings.HasPrefix(c.Request.URL.Path, "/static/") {
			c.String(404, "Static file not found")
			return
		}
		// Serve index.html for all other routes (SPA routing)
		c.File("frontend/vanilla/index.html")
	})

	// Create HTTP server
	server := &http.Server{
		Addr:         cfg.Server.Host + ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start server in a goroutine
	go func() {
		structuredLogger.Info("Starting server",
			"host", cfg.Server.Host,
			"port", cfg.Server.Port,
			"environment", cfg.Environment)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			structuredLogger.Error("Failed to start server", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	structuredLogger.Info("Shutting down server...")

	// Cancel monitoring tasks
	cancel()
	cancelBroadcaster()

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		structuredLogger.Error("Server forced to shutdown", "error", err)
		os.Exit(1)
	}

	structuredLogger.Info("Server exited")
}

func setupRoutes(router *gin.Engine, authHandler *handlers.AuthHandler, workspaceHandler *handlers.WorkspaceHandler, boardHandler *handlers.BoardHandler, itemHandler *handlers.ItemHandler, commentHandler *handlers.CommentHandler, activityHandler *handlers.ActivityHandler, filterHandler *handlers.FilterHandler, savedFilterHandler *handlers.SavedFilterHandler, searchHandler *handlers.SearchHandler, healthHandler *handlers.HealthHandler, monitoringService *monitoring.MonitoringService, jwtManager *auth.JWTManager, websocketHandler *websocket.Handler) {
	api := router.Group("/api")
	{
		// Authentication routes (public) with stricter rate limiting
		auth := api.Group("/auth")
		auth.Use(middleware.AuthRateLimitMiddleware())
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			auth.POST("/verify-email", authHandler.VerifyEmail)
		}

		// Public board routes for development
		boards := api.Group("/boards")
		{
			boards.GET("", boardHandler.GetUserBoards) // List all user's boards
			boards.POST("", boardHandler.CreateUserBoard) // Create new board
			boards.GET("/:boardId", boardHandler.GetBoard)
			boards.PUT("/:boardId", boardHandler.UpdateBoard)
			boards.DELETE("/:boardId", boardHandler.DeleteBoard)
			boards.POST("/:boardId/columns", boardHandler.AddColumn)
			boards.PUT("/:boardId/columns/reorder", boardHandler.ReorderColumns)
			boards.PUT("/:boardId/columns/:columnId", boardHandler.UpdateColumn)
			boards.DELETE("/:boardId/columns/:columnId", boardHandler.RemoveColumn)
			boards.POST("/:boardId/share", boardHandler.ShareBoard)
			boards.PUT("/:boardId/permissions", boardHandler.UpdatePermissions)
			boards.GET("/:boardId/permissions", boardHandler.GetPermissions)

			// Item endpoints under board
			boards.POST("/:boardId/items", itemHandler.CreateItem)
			boards.GET("/:boardId/items", itemHandler.GetBoardItems)
			boards.POST("/:boardId/items/bulk", itemHandler.BulkCreateItems)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(jwtManager))
		{
			// Auth verification route
			protected.GET("/auth/verify", authHandler.Verify)

			// Workspace routes
			workspaces := protected.Group("/workspaces")
			{
				workspaces.POST("", workspaceHandler.CreateWorkspace)
				workspaces.GET("", workspaceHandler.GetUserWorkspaces)
				workspaces.GET("/:workspaceId", workspaceHandler.GetWorkspace)
				workspaces.PUT("/:workspaceId", workspaceHandler.UpdateWorkspace)
				workspaces.DELETE("/:workspaceId", workspaceHandler.DeleteWorkspace)
				workspaces.POST("/:workspaceId/members", workspaceHandler.AddMember)
				workspaces.DELETE("/:workspaceId/members/:userId", workspaceHandler.RemoveMember)
				workspaces.PUT("/:workspaceId/members/:userId/role", workspaceHandler.UpdateMemberRole)
				workspaces.GET("/:workspaceId/members", workspaceHandler.GetMembers)

				// Board routes within workspaces
				workspaces.POST("/:workspaceId/boards", boardHandler.CreateBoard)
				workspaces.GET("/:workspaceId/boards", boardHandler.GetWorkspaceBoards)
			}

			// Item routes for individual items
			items := protected.Group("/items")
			{
				items.GET("/search", searchHandler.SearchItems)
				items.GET("/filter", filterHandler.FilterItems)
				items.GET("/my", itemHandler.GetMyItems)
				items.GET("/:itemId", itemHandler.GetItem)
				items.PUT("/:itemId", itemHandler.UpdateItem)
				items.DELETE("/:itemId", itemHandler.DeleteItem)
				items.POST("/:itemId/move", itemHandler.MoveItem)
				items.PUT("/bulk", itemHandler.BulkUpdateItems)
				items.DELETE("/bulk", itemHandler.BulkDeleteItems)

				// Comment routes for items
				items.POST("/:itemId/comments", commentHandler.CreateComment)
				items.GET("/:itemId/comments", commentHandler.GetItemComments)
				items.GET("/:itemId/comments/threaded", commentHandler.GetThreadedComments)

				// Activity routes for items
				items.GET("/:itemId/activity", activityHandler.GetItemActivity)
			}

			// Comment routes
			comments := protected.Group("/comments")
			{
				comments.GET("/:commentId", commentHandler.GetComment)
				comments.PUT("/:commentId", commentHandler.UpdateComment)
				comments.DELETE("/:commentId", commentHandler.DeleteComment)
				comments.POST("/:commentId/replies", commentHandler.CreateReply)
				comments.GET("/:commentId/replies", commentHandler.GetReplies)
				comments.POST("/:commentId/mentions", commentHandler.AddMention)
				comments.DELETE("/:commentId/mentions/:userId", commentHandler.RemoveMention)
				comments.POST("/:commentId/attachments", commentHandler.AddAttachment)
				comments.DELETE("/:commentId/attachments/:filename", commentHandler.RemoveAttachment)
			}

			// Activity routes
			activity := protected.Group("/activity")
			{
				activity.GET("", activityHandler.GetUserActivity)
				activity.GET("/timeline", activityHandler.GetActivityTimeline)
				activity.GET("/recent", activityHandler.GetRecentActivity)
				activity.GET("/stats", activityHandler.GetActivityStats)
				activity.GET("/:activityId", activityHandler.GetActivity)
			}

			// User-specific routes
			users := protected.Group("/users")
			{
				users.GET("/:userId/comments", commentHandler.GetUserComments)
				users.GET("/:userId/activity/summary", activityHandler.GetUserActivitySummary)
			}

			// Workspace activity routes
			workspaces.GET("/:workspaceId/activity", activityHandler.GetWorkspaceActivity)

			// Board activity routes
			boards.GET("/:boardId/activity", activityHandler.GetBoardActivity)

			// Filter routes
			filterHandler.RegisterRoutes(protected)

			// Saved filter routes
			savedFilterHandler.RegisterRoutes(protected)

			// Search routes
			searchHandler.RegisterRoutes(protected)
		}
	}

	// CSRF token endpoint
	router.GET("/csrf-token", middleware.CSRFTokenHandler())

	// Health check endpoints
	router.GET("/health", healthHandler.Health)
	router.GET("/health/ready", healthHandler.Readiness)
	router.GET("/health/live", healthHandler.Liveness)

	// Error reporting endpoint (public)
	router.POST("/api/errors", func(c *gin.Context) {
		var errorData map[string]interface{}
		if err := c.ShouldBindJSON(&errorData); err != nil {
			c.JSON(400, gin.H{"error": "Invalid error data"})
			return
		}
		
		// Log the error for debugging using gin's default logger
		gin.DefaultWriter.Write([]byte(fmt.Sprintf("Client error reported: %+v\n", errorData)))
		
		c.JSON(200, gin.H{"success": true})
	})

	// Monitoring endpoints
	router.GET("/metrics", healthHandler.Metrics)
	router.GET("/metrics/prometheus", monitoring.NewPrometheusMetrics(monitoringService.GetMetricsCollector()).Handler())

	// WebSocket endpoints
	websocketHandler.RegisterRoutes(router, middleware.AuthMiddleware(jwtManager))

	// Admin endpoints (protected)
	admin := router.Group("/admin")
	admin.Use(middleware.AuthMiddleware(jwtManager))
	{
		admin.GET("/alerts", func(c *gin.Context) {
			alerts := monitoringService.GetAlertManager().GetAlerts()
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    alerts,
			})
		})
		admin.GET("/alerts/active", func(c *gin.Context) {
			alerts := monitoringService.GetAlertManager().GetActiveAlerts()
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    alerts,
			})
		})
		admin.POST("/alerts/:id/resolve", func(c *gin.Context) {
			alertID := c.Param("id")
			monitoringService.GetAlertManager().ResolveAlert(alertID)
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "Alert resolved",
			})
		})
	}
}
