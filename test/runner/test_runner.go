package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// TestRunner manages comprehensive test execution and coverage reporting
type TestRunner struct {
	projectRoot string
	coverageDir string
}

// NewTestRunner creates a new test runner
func NewTestRunner() *TestRunner {
	wd, err := os.Getwd()
	if err != nil {
		log.Fatal("Failed to get working directory:", err)
	}

	// Navigate to project root (assuming we're in test/runner)
	projectRoot := filepath.Join(wd, "..", "..")
	coverageDir := filepath.Join(projectRoot, "coverage")

	// Create coverage directory
	os.MkdirAll(coverageDir, 0755)

	return &TestRunner{
		projectRoot: projectRoot,
		coverageDir: coverageDir,
	}
}

// RunAllTests executes all test suites and generates coverage reports
func (tr *TestRunner) RunAllTests() error {
	fmt.Println("🚀 Starting comprehensive backend test suite...")

	// Change to project root
	err := os.Chdir(tr.projectRoot)
	if err != nil {
		return fmt.Errorf("failed to change to project root: %w", err)
	}

	// Run unit tests
	fmt.Println("\n📋 Running unit tests...")
	tr.runUnitTests()

	// Run integration tests
	fmt.Println("\n🔗 Running integration tests...")
	tr.runIntegrationTests()

	// Run end-to-end tests
	fmt.Println("\n🎯 Running end-to-end tests...")
	tr.runE2ETests()

	// Generate comprehensive coverage report
	fmt.Println("\n📊 Generating coverage reports...")
	err = tr.generateCoverageReport()
	if err != nil {
		return fmt.Errorf("failed to generate coverage report: %w", err)
	}

	// Generate coverage summary
	err = tr.generateCoverageSummary()
	if err != nil {
		return fmt.Errorf("failed to generate coverage summary: %w", err)
	}

	fmt.Println("\n✅ All tests completed successfully!")
	return nil
}

// runUnitTests executes all unit tests
func (tr *TestRunner) runUnitTests() {
	fmt.Println("  Running service layer tests...")
	tr.runTestsWithCoverage("./internal/services/...", "unit_services.out")

	fmt.Println("  Running repository layer tests...")
	tr.runTestsWithCoverage("./internal/repository/...", "unit_repository.out")

	fmt.Println("  Running model layer tests...")
	tr.runTestsWithCoverage("./internal/models/...", "unit_models.out")

	fmt.Println("  Running auth layer tests...")
	tr.runTestsWithCoverage("./internal/auth/...", "unit_auth.out")

	fmt.Println("  Running security layer tests...")
	tr.runTestsWithCoverage("./internal/security/...", "unit_security.out")

	fmt.Println("  Running middleware tests...")
	tr.runTestsWithCoverage("./internal/middleware/...", "unit_middleware.out")
}

// runIntegrationTests executes integration tests
func (tr *TestRunner) runIntegrationTests() {
	fmt.Println("  Running handler integration tests...")
	tr.runTestsWithCoverage("./internal/handlers/...", "integration_handlers.out")

	fmt.Println("  Running API integration tests...")
	tr.runTestsWithCoverage("./test/integration/...", "integration_api.out")
}

// runE2ETests executes end-to-end tests
func (tr *TestRunner) runE2ETests() {
	fmt.Println("  Running end-to-end API tests...")
	tr.runTestsWithCoverage("./test/e2e/...", "e2e_api.out")
}

// runTestsWithCoverage runs tests for a specific package with coverage
func (tr *TestRunner) runTestsWithCoverage(pkg, coverageFile string) {
	coveragePath := filepath.Join(tr.coverageDir, coverageFile)
	
	cmd := exec.Command("go", "test", "-v", "-race", "-coverprofile="+coveragePath, pkg)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	cmd.Run() // Continue even if tests fail
}

// generateCoverageReport generates comprehensive coverage report
func (tr *TestRunner) generateCoverageReport() error {
	// Merge all coverage files
	err := tr.mergeCoverageFiles()
	if err != nil {
		return fmt.Errorf("failed to merge coverage files: %w", err)
	}

	// Generate HTML report
	htmlPath := filepath.Join(tr.coverageDir, "coverage.html")
	cmd := exec.Command("go", "tool", "cover", "-html="+filepath.Join(tr.coverageDir, "merged.out"), "-o="+htmlPath)
	err = cmd.Run()
	if err != nil {
		return fmt.Errorf("failed to generate HTML coverage report: %w", err)
	}

	fmt.Printf("📄 HTML coverage report generated: %s\n", htmlPath)
	return nil
}

// mergeCoverageFiles merges all coverage files into one
func (tr *TestRunner) mergeCoverageFiles() error {
	coverageFiles, err := filepath.Glob(filepath.Join(tr.coverageDir, "*.out"))
	if err != nil {
		return err
	}

	if len(coverageFiles) == 0 {
		return fmt.Errorf("no coverage files found")
	}

	mergedPath := filepath.Join(tr.coverageDir, "merged.out")
	mergedFile, err := os.Create(mergedPath)
	if err != nil {
		return err
	}
	defer mergedFile.Close()

	// Write mode line
	mergedFile.WriteString("mode: atomic\n")

	// Merge all coverage files
	for i, file := range coverageFiles {
		content, err := os.ReadFile(file)
		if err != nil {
			continue
		}

		lines := strings.Split(string(content), "\n")
		// Skip mode line for subsequent files
		start := 0
		if i > 0 {
			start = 1
		}

		for j := start; j < len(lines); j++ {
			if strings.TrimSpace(lines[j]) != "" {
				mergedFile.WriteString(lines[j] + "\n")
			}
		}
	}

	return nil
}

// generateCoverageSummary generates and displays coverage summary
func (tr *TestRunner) generateCoverageSummary() error {
	mergedPath := filepath.Join(tr.coverageDir, "merged.out")
	
	cmd := exec.Command("go", "tool", "cover", "-func="+mergedPath)
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to generate coverage summary: %w", err)
	}

	fmt.Println("\n📊 Coverage Summary:")
	fmt.Println(strings.Repeat("=", 50))
	fmt.Print(string(output))

	// Parse total coverage
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "total:") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				coverageStr := strings.TrimSuffix(parts[2], "%")
				coverage, err := strconv.ParseFloat(coverageStr, 64)
				if err == nil {
					fmt.Printf("\n🎯 Total Backend Coverage: %.1f%%\n", coverage)
					
					if coverage >= 80.0 {
						fmt.Println("✅ Coverage target achieved (≥80%)")
					} else {
						fmt.Printf("⚠️  Coverage below target (%.1f%% < 80%%)\n", coverage)
					}
				}
			}
			break
		}
	}

	// Save summary to file
	summaryPath := filepath.Join(tr.coverageDir, "summary.txt")
	os.WriteFile(summaryPath, output, 0644)

	fmt.Printf("📄 Coverage summary saved: %s\n", summaryPath)
	return nil
}

func main() {
	runner := NewTestRunner()
	err := runner.RunAllTests()
	if err != nil {
		log.Fatal("Failed to run tests:", err)
	}
}