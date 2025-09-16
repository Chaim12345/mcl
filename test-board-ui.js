const { chromium } = require('playwright');

async function testBoardFunctionality() {
    console.log('Starting UI test for board functionality...');
    
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const page = await browser.newPage();
    
    try {
        // Navigate to the application
        console.log('Navigating to application...');
        await page.goto('http://localhost:8080');
        
        // Wait for the page to load
        await page.waitForTimeout(2000);
        
        // Check if we're on login page or dashboard
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        // If we're redirected to login, perform login
        if (currentUrl.includes('/login') || await page.locator('form#login-form').isVisible()) {
            console.log('Login required, performing login...');
            
            // Fill login form
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="password"]', 'TestPassword123!');
            
            // Submit login form
            await page.click('button[type="submit"]');
            
            // Wait for redirect to dashboard
            await page.waitForURL('**/dashboard', { timeout: 10000 });
            console.log('Login successful, redirected to dashboard');
        }
        
        // Navigate to boards page
        console.log('Navigating to boards page...');
        await page.click('a[href="/boards"]');
        await page.waitForURL('**/boards', { timeout: 5000 });
        
        // Check if boards page loaded correctly
        const boardsTitle = await page.locator('h1').textContent();
        console.log('Boards page title:', boardsTitle);
        
        // Test workspace filtering functionality
        console.log('Testing workspace filter...');
        const workspaceFilter = page.locator('#workspace-filter');
        if (await workspaceFilter.isVisible()) {
            const options = await workspaceFilter.locator('option').allTextContents();
            console.log('Available workspace filter options:', options);
        }
        
        // Test board creation
        console.log('Testing board creation...');
        
        // Check if "Create Board" button exists
        const createBoardBtn = page.locator('#create-board-btn, #create-first-board-btn').first();
        if (await createBoardBtn.isVisible()) {
            console.log('Create board button found, clicking...');
            await createBoardBtn.click();
            
            // Wait for modal to appear
            await page.waitForSelector('.modal-overlay', { timeout: 5000 });
            console.log('Board creation modal opened');
            
            // Check modal content
            const modalTitle = await page.locator('.modal h2').textContent();
            console.log('Modal title:', modalTitle);
            
            // Close modal for now
            await page.click('.modal-close, .modal-cancel');
            console.log('Modal closed');
        } else {
            console.log('No create board button found');
        }
        
        // Test existing boards if any
        const boardCards = await page.locator('.board-card').count();
        console.log(`Found ${boardCards} existing board(s)`);
        
        if (boardCards > 0) {
            console.log('Testing board interactions...');
            
            // Test board menu
            const firstBoardMenu = page.locator('.board-menu-btn').first();
            if (await firstBoardMenu.isVisible()) {
                await firstBoardMenu.click();
                console.log('Board menu opened');
                
                // Check menu items
                const menuItems = await page.locator('.menu-item').allTextContents();
                console.log('Board menu items:', menuItems);
                
                // Close menu by clicking elsewhere
                await page.click('body');
            }
            
            // Test board opening
            const openBoardBtn = page.locator('.open-board-btn').first();
            if (await openBoardBtn.isVisible()) {
                console.log('Testing board opening...');
                await openBoardBtn.click();
                
                // Check if redirected to board view
                await page.waitForTimeout(2000);
                const newUrl = page.url();
                console.log('After clicking open board, URL:', newUrl);
                
                if (newUrl.includes('/board/')) {
                    console.log('Successfully navigated to board view');
                    
                    // Go back to boards page
                    await page.goBack();
                    await page.waitForTimeout(2000);
                }
            }
        }
        
        // Test navigation between different sections
        console.log('Testing navigation...');
        
        // Test workspace navigation
        await page.click('a[href="/workspaces"]');
        await page.waitForURL('**/workspaces', { timeout: 5000 });
        console.log('Successfully navigated to workspaces');
        
        const workspacesTitle = await page.locator('h1').textContent();
        console.log('Workspaces page title:', workspacesTitle);
        
        // Count existing workspaces
        const workspaceCards = await page.locator('.workspace-card').count();
        console.log(`Found ${workspaceCards} existing workspace(s)`);
        
        // Go back to boards
        await page.click('a[href="/boards"]');
        await page.waitForURL('**/boards', { timeout: 5000 });
        console.log('Returned to boards page');
        
        // Test dashboard navigation
        await page.click('a[href="/dashboard"]');
        await page.waitForURL('**/dashboard', { timeout: 5000 });
        console.log('Successfully navigated to dashboard');
        
        console.log('UI test completed successfully!');
        
    } catch (error) {
        console.error('Error during UI test:', error);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-error-screenshot.png' });
        console.log('Screenshot saved as test-error-screenshot.png');
        
        // Get page content for debugging
        const pageContent = await page.content();
        console.log('Page content length:', pageContent.length);
        
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testBoardFunctionality().catch(console.error);
