// Browser automation test for Game of Life scripting functionality
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost'; // Adjust for your deployed domain
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const TIMEOUT = 30000;

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitForElementAndClick(page, selector, timeout = TIMEOUT) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector);
}

async function waitForElementAndType(page, selector, text, timeout = TIMEOUT) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector);
  await page.keyboard.selectAll();
  await page.type(selector, text);
}

async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(SCREENSHOT_DIR, `${timestamp}-${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`Screenshot saved: ${filename}`);
  return filename;
}

async function testScriptingFeature(page) {
  console.log('🧪 Testing scripting feature...');
  
  try {
    // Take initial screenshot
    await takeScreenshot(page, 'initial-load');
    
    // Look for the script icon in the header (could be various selectors)
    const scriptSelectors = [
      'button[aria-label*="script" i]',
      'button[title*="script" i]',
      'button:has-text("Script")',
      '[data-testid="script-button"]',
      'button svg[data-testid="CodeIcon"]',
      'button[aria-label="Script Panel"]',
      'button[title="Script Panel"]'
    ];
    
    let scriptButton = null;
    for (const selector of scriptSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        scriptButton = selector;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!scriptButton) {
      // Try to find any button that might be the script button by text content
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent?.toLowerCase() || '', button);
        const title = await page.evaluate(el => el.title?.toLowerCase() || '', button);
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
        
        if (text.includes('script') || title.includes('script') || ariaLabel.includes('script')) {
          console.log(`Found potential script button with text: "${text}", title: "${title}", aria-label: "${ariaLabel}"`);
          scriptButton = button;
          break;
        }
      }
    }
    
    if (!scriptButton) {
      throw new Error('Could not find script button');
    }
    
    console.log('✅ Found script button, clicking...');
    if (typeof scriptButton === 'string') {
      await waitForElementAndClick(page, scriptButton);
    } else {
      await scriptButton.click();
    }
    
    // Wait for dialog to appear
    await page.waitForSelector('dialog, .MuiDialog-root, [role="dialog"]', { timeout: 10000 });
    await takeScreenshot(page, 'script-dialog-open');
    
    // Find the script input area (textarea or code editor)
    const scriptInputSelectors = [
      'textarea[placeholder*="script" i]',
      'textarea',
      '.monaco-editor textarea',
      '[data-testid="script-input"]',
      'input[type="text"]'
    ];
    
    let scriptInput = null;
    for (const selector of scriptInputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        scriptInput = selector;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!scriptInput) {
      throw new Error('Could not find script input field');
    }
    
    // Clear any existing content and enter test script
    const testScript = `CLEAR
PENDOWN
RECT 4 3
GOTO 10 5
RECT 2 2`;
    
    console.log('✅ Found script input, entering test script...');
    await waitForElementAndType(page, scriptInput, testScript);
    await takeScreenshot(page, 'script-entered');
    
    // Find and click run button
    const runSelectors = [
      'button:has-text("Run")',
      'button[aria-label*="run" i]',
      'button[title*="run" i]',
      '[data-testid="run-button"]'
    ];
    
    let runButton = null;
    for (const selector of runSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        runButton = selector;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!runButton) {
      // Find button by text content
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent?.toLowerCase() || '', button);
        if (text.includes('run') || text.includes('execute') || text.includes('play')) {
          runButton = button;
          break;
        }
      }
    }
    
    if (!runButton) {
      throw new Error('Could not find run button');
    }
    
    console.log('✅ Found run button, executing script...');
    if (typeof runButton === 'string') {
      await waitForElementAndClick(page, runButton);
    } else {
      await runButton.click();
    }
    
    // Wait a moment for script to execute
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'script-executed');
    
    // Close the dialog if it's still open
    try {
      const closeSelectors = [
        'button[aria-label*="close" i]',
        'button:has-text("Close")',
        '.MuiDialog-root button[aria-label="close"]',
        '[data-testid="close-button"]'
      ];
      
      for (const selector of closeSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 1000 });
          await page.click(selector);
          break;
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('Dialog may have auto-closed or close button not found');
    }
    
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'final-result');
    
    // Check if cells were actually drawn by looking for canvas or grid elements
    const canvasElements = await page.$$('canvas');
    console.log(`Found ${canvasElements.length} canvas elements`);
    
    // Look for evidence of drawn cells
    let cellsDrawn = false;
    try {
      // Check if there are any live cells indicators
      const liveCellsIndicators = await page.$$('[data-testid*="cell"], .live-cell, .cell-alive');
      if (liveCellsIndicators.length > 0) {
        cellsDrawn = true;
        console.log(`✅ Found ${liveCellsIndicators.length} live cell indicators`);
      }
      
      // Check for canvas with content
      if (canvasElements.length > 0) {
        const canvasData = await page.evaluate(() => {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let hasContent = false;
            for (let i = 0; i < data.length; i += 4) {
              // Check if any pixel is not transparent
              if (data[i + 3] > 0) {
                hasContent = true;
                break;
              }
            }
            return hasContent;
          }
          return false;
        });
        
        if (canvasData) {
          cellsDrawn = true;
          console.log('✅ Canvas has visible content');
        }
      }
    } catch (e) {
      console.log('Could not verify cell drawing, but script executed');
    }
    
    console.log('🎉 Script execution test completed');
    return {
      success: true,
      cellsDrawn,
      screenshots: [
        'initial-load',
        'script-dialog-open', 
        'script-entered',
        'script-executed',
        'final-result'
      ]
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await takeScreenshot(page, 'error-state');
    throw error;
  }
}

async function runTests() {
  console.log('🚀 Starting browser automation tests...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`Browser ${type.toUpperCase()}: ${msg.text()}`);
      }
    });
    
    // Navigate to the application
    console.log(`🌐 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: TIMEOUT });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Run the scripting test
    const result = await testScriptingFeature(page);
    
    console.log('📊 Test Results:', result);
    
    if (result.cellsDrawn) {
      console.log('✅ SUCCESS: Drawing commands appear to be working!');
    } else {
      console.log('⚠️  WARNING: Could not verify that cells were drawn');
    }
    
    // Keep browser open for manual inspection if needed
    console.log('🔍 Browser will remain open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testScriptingFeature };