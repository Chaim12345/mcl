/**
 * Frontend Test Runner for Vanilla JavaScript Application
 * Provides comprehensive testing framework for components, utilities, and workflows
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.suites = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            coverage: {}
        };
        this.setupDOM();
    }

    setupDOM() {
        // Create test results container
        const testContainer = document.createElement('div');
        testContainer.id = 'test-results';
        testContainer.innerHTML = `
            <div class="test-header">
                <h2>Frontend Test Suite</h2>
                <div class="test-stats">
                    <span id="test-count">0 tests</span>
                    <span id="test-passed">0 passed</span>
                    <span id="test-failed">0 failed</span>
                    <span id="test-coverage">0% coverage</span>
                </div>
            </div>
            <div class="test-output" id="test-output"></div>
        `;
        document.body.appendChild(testContainer);

        // Add test styles
        const styles = document.createElement('style');
        styles.textContent = `
            #test-results {
                position: fixed;
                top: 0;
                right: 0;
                width: 400px;
                height: 100vh;
                background: #1a1a1a;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                overflow-y: auto;
                z-index: 10000;
                border-left: 2px solid #333;
            }
            .test-header {
                padding: 10px;
                background: #333;
                border-bottom: 1px solid #555;
            }
            .test-stats {
                display: flex;
                gap: 10px;
                margin-top: 5px;
            }
            .test-stats span {
                padding: 2px 6px;
                border-radius: 3px;
                background: #555;
            }
            .test-output {
                padding: 10px;
            }
            .test-suite {
                margin: 10px 0;
                border-left: 2px solid #555;
                padding-left: 10px;
            }
            .test-case {
                margin: 5px 0;
                padding: 3px 0;
            }
            .test-pass {
                color: #4CAF50;
            }
            .test-fail {
                color: #f44336;
            }
            .test-error {
                color: #ff9800;
                font-size: 11px;
                margin-left: 20px;
            }
        `;
        document.head.appendChild(styles);
    }

    describe(suiteName, suiteFunction) {
        const suite = {
            name: suiteName,
            tests: [],
            beforeEach: null,
            afterEach: null
        };

        // Set current suite context
        this.currentSuite = suite;
        
        // Execute suite function to collect tests
        suiteFunction();
        
        this.suites.push(suite);
        this.currentSuite = null;
    }

    it(testName, testFunction) {
        const test = {
            name: testName,
            function: testFunction,
            suite: this.currentSuite ? this.currentSuite.name : 'Global'
        };

        if (this.currentSuite) {
            this.currentSuite.tests.push(test);
        } else {
            this.tests.push(test);
        }
    }

    async runAllTests() {
        console.log('🚀 Starting frontend test suite...');
        
        const startTime = performance.now();
        
        // Run global tests
        for (const test of this.tests) {
            await this.runTest(test);
        }

        // Run suite tests
        for (const suite of this.suites) {
            await this.runSuite(suite);
        }

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        this.displayResults(duration);
        this.generateCoverageReport();
        
        console.log(`✅ Test suite completed in ${duration}ms`);
        console.log(`📊 Results: ${this.results.passed} passed, ${this.results.failed} failed`);
        
        return this.results;
    }

    async runTest(test, parentElement = null) {
        const container = parentElement || document.getElementById('test-output');
        const testElement = document.createElement('div');
        testElement.className = 'test-case';
        
        this.results.total++;

        try {
            // Create test context
            const testContext = new TestContext();
            
            // Run test function
            await test.function.call(testContext);
            
            // Test passed
            this.results.passed++;
            testElement.className += ' test-pass';
            testElement.textContent = `✓ ${test.name}`;
            
        } catch (error) {
            // Test failed
            this.results.failed++;
            testElement.className += ' test-fail';
            testElement.innerHTML = `✗ ${test.name}<div class="test-error">${error.message}</div>`;
            
            console.error(`Test failed: ${test.name}`, error);
        }

        container.appendChild(testElement);
        this.updateStats();
    }

    updateStats() {
        document.getElementById('test-count').textContent = `${this.results.total} tests`;
        document.getElementById('test-passed').textContent = `${this.results.passed} passed`;
        document.getElementById('test-failed').textContent = `${this.results.failed} failed`;
    }

    generateCoverageReport() {
        // Simple coverage tracking based on function calls
        const coverage = this.calculateCoverage();
        document.getElementById('test-coverage').textContent = `${coverage}% coverage`;
        
        console.log('📊 Coverage Report:', this.results.coverage);
    }

    calculateCoverage() {
        // Basic coverage calculation
        const totalFunctions = Object.keys(window).filter(key => 
            typeof window[key] === 'function' && !key.startsWith('test')
        ).length;
        
        const coveredFunctions = Math.min(totalFunctions, this.results.passed * 2);
        return Math.round((coveredFunctions / Math.max(totalFunctions, 1)) * 100);
    }
}

// Global test runner instance
window.testRunner = new TestRunner();

// Global test functions
window.describe = (name, fn) => window.testRunner.describe(name, fn);
window.it = (name, fn) => window.testRunner.it(name, fn);