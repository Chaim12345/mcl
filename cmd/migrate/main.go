package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"project-management-platform/internal/config"
	"project-management-platform/internal/database"
	"project-management-platform/internal/migration"
)

func main() {
	var (
		sourceDB     = flag.String("source", "", "PostgreSQL source database connection string")
		targetDB     = flag.String("target", "", "MongoDB target database connection string")
		operation    = flag.String("operation", "migrate", "Operation: migrate, validate, rollback, status")
		dryRun       = flag.Bool("dry-run", false, "Perform a dry run without making changes")
		batchSize    = flag.Int("batch-size", 1000, "Number of records to process in each batch")
		configFile   = flag.String("config", "", "Path to migration configuration file")
		verbose      = flag.Bool("verbose", false, "Enable verbose logging")
		rollbackFile = flag.String("rollback-file", "", "Path to rollback data file")
	)
	flag.Parse()

	if *sourceDB == "" && *operation != "status" {
		log.Fatal("Source database connection string is required")
	}

	if *targetDB == "" && *operation != "status" {
		log.Fatal("Target database connection string is required")
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Override with command line arguments
	if *targetDB != "" {
		cfg.Database.URI = *targetDB
	}

	// Create migration manager
	migrationConfig := migration.Config{
		SourceDB:     *sourceDB,
		TargetDB:     cfg.Database.URI,
		BatchSize:    *batchSize,
		DryRun:       *dryRun,
		Verbose:      *verbose,
		ConfigFile:   *configFile,
		RollbackFile: *rollbackFile,
	}

	manager, err := migration.NewManager(migrationConfig)
	if err != nil {
		log.Fatalf("Failed to create migration manager: %v", err)
	}
	defer manager.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	switch *operation {
	case "migrate":
		fmt.Println("Starting PostgreSQL to MongoDB migration...")
		if err := manager.Migrate(ctx); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		fmt.Println("Migration completed successfully!")

	case "validate":
		fmt.Println("Validating migration data...")
		if err := manager.Validate(ctx); err != nil {
			log.Fatalf("Validation failed: %v", err)
		}
		fmt.Println("Validation completed successfully!")

	case "rollback":
		fmt.Println("Rolling back migration...")
		if err := manager.Rollback(ctx); err != nil {
			log.Fatalf("Rollback failed: %v", err)
		}
		fmt.Println("Rollback completed successfully!")

	case "status":
		fmt.Println("Checking migration status...")
		status, err := manager.Status(ctx)
		if err != nil {
			log.Fatalf("Failed to get status: %v", err)
		}
		printStatus(status)

	default:
		log.Fatalf("Unknown operation: %s", *operation)
	}
}

func printStatus(status *migration.Status) {
	fmt.Printf("Migration Status Report\n")
	fmt.Printf("======================\n")
	fmt.Printf("Started: %s\n", status.StartTime.Format(time.RFC3339))
	if !status.EndTime.IsZero() {
		fmt.Printf("Completed: %s\n", status.EndTime.Format(time.RFC3339))
		fmt.Printf("Duration: %s\n", status.EndTime.Sub(status.StartTime))
	}
	fmt.Printf("Status: %s\n", status.State)
	fmt.Printf("Progress: %d/%d (%.2f%%)\n", status.Processed, status.Total, status.Progress)
	
	if len(status.Errors) > 0 {
		fmt.Printf("\nErrors:\n")
		for _, err := range status.Errors {
			fmt.Printf("  - %s\n", err)
		}
	}

	fmt.Printf("\nTable Migration Status:\n")
	for table, tableStatus := range status.Tables {
		fmt.Printf("  %s: %d/%d records (%.2f%%)\n", 
			table, tableStatus.Processed, tableStatus.Total, tableStatus.Progress)
	}
}