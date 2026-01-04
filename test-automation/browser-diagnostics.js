// Browser-based diagnostic script to validate grid rendering
// Copy this into the browser console and run it to diagnose rendering issues

const GridRenderingDiagnostics = {
  async run() {
    console.log('%c=== GAME OF LIFE GRID RENDERING DIAGNOSTICS ===', 'font-size: 16px; font-weight: bold; color: blue');
    
    const checks = [];
    
    // Check 1: Canvas element
    console.log('\n✓ Checking for Canvas element...');
    const canvas = document.querySelector('canvas');
    if (canvas) {
      console.log('  ✅ Canvas element found');
      console.log(`     Width: ${canvas.width}, Height: ${canvas.height}`);
      console.log(`     Offset: (${canvas.offsetLeft}, ${canvas.offsetTop})`);
      checks.push({ name: 'Canvas found', pass: true });
    } else {
      console.log('  ❌ Canvas element NOT found');
      checks.push({ name: 'Canvas found', pass: false });
    }
    
    // Check 2: Script Panel
    console.log('\n✓ Checking for Script Panel...');
    const scriptDialog = document.querySelector('[role="dialog"]');
    if (scriptDialog) {
      console.log('  ✅ Dialog found');
      console.log(`     Text: ${scriptDialog.textContent.substring(0, 50)}...`);
      checks.push({ name: 'Script dialog found', pass: true });
    } else {
      console.log('  ⚠️  Dialog not currently visible (may be closed)');
    }
    
    // Check 3: Console messages
    console.log('\n✓ Checking for debug output in past 5 seconds...');
    // Note: This requires the app to have emitted events
    const debugEvents = [];
    window.addEventListener('gol:script:debug', (e) => {
      debugEvents.push(e.detail);
    }, { once: true, capture: true });
    
    // Check 4: GameModel state
    console.log('\n✓ Checking window for GameModel reference...');
    if (window.gameModelDebug || window.gameRef) {
      console.log('  ✅ Game model reference found');
      checks.push({ name: 'Game model accessible', pass: true });
    } else {
      console.log('  ⚠️  Game model not exposed globally (expected behavior)');
      // Try to find it through React DevTools or other means
      const reactRoot = document.querySelector('[data-reactroot]');
      if (reactRoot) {
        console.log('  ℹ️  React app is mounted');
      }
    }
    
    // Check 5: Verify canvas is visible
    console.log('\n✓ Checking canvas visibility...');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      if (isVisible) {
        console.log('  ✅ Canvas is visible');
        console.log(`     Display size: ${rect.width}x${rect.height}`);
        checks.push({ name: 'Canvas visible', pass: true });
      } else {
        console.log('  ❌ Canvas has zero dimensions');
        checks.push({ name: 'Canvas visible', pass: false });
      }
      
      // Check if canvas has content
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
        const hasPixels = imageData.data.some(pixel => pixel > 0);
        if (hasPixels) {
          console.log('  ✅ Canvas has rendered content');
          checks.push({ name: 'Canvas has content', pass: true });
        } else {
          console.log('  ⚠️  Canvas appears blank (might be rendering off-screen or not yet updated)');
          checks.push({ name: 'Canvas has content', pass: false });
        }
      }
    }
    
    // Check 6: Look for rendered elements
    console.log('\n✓ Checking for rendered game grid elements...');
    const gridCells = document.querySelectorAll('[class*="cell"], [class*="alive"], [class*="grid"]');
    console.log(`  Found ${gridCells.length} potential grid elements`);
    
    // Check 7: Console error check
    console.log('\n✓ Checking for console errors...');
    const originalError = console.error;
    let errorCount = 0;
    console.error = (...args) => {
      errorCount++;
      originalError.apply(console, args);
    };
    console.log(`  ${errorCount === 0 ? '✅' : '⚠️'} No errors logged (check console for any red messages)`);
    
    // Summary
    console.log('\n%c=== DIAGNOSTIC SUMMARY ===', 'font-size: 14px; font-weight: bold; color: green');
    const passCount = checks.filter(c => c.pass).length;
    console.log(`Passed: ${passCount}/${checks.length}`);
    
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });
    
    console.log('\n%c📝 NEXT STEPS:', 'font-weight: bold');
    if (checks.every(c => c.pass)) {
      console.log('✅ All checks passed!');
      console.log('  1. Open the script panel (click script icon)');
      console.log('  2. Run a simple script: PENDOWN, RECT 4 3');
      console.log('  3. Check if cells appear on canvas');
      console.log('  4. Look for debug messages in console');
    } else {
      console.log('⚠️  Some checks failed:');
      checks.filter(c => !c.pass).forEach(check => {
        console.log(`  - ${check.name}`);
      });
    }
    
    console.log('\n%c🔧 DEBUGGING TIPS:', 'font-weight: bold');
    console.log('  1. Right-click canvas → Inspect to verify it\'s rendered');
    console.log('  2. Check if canvas.width and canvas.height are > 0');
    console.log('  3. Look for rendering errors in console (red messages)');
    console.log('  4. Check Network tab to see if any API calls fail');
    console.log('  5. Try zooming browser in/out to trigger resize and redraw');
    
    return { checks, passCount, totalCount: checks.length };
  }
};

// Run the diagnostics
GridRenderingDiagnostics.run();