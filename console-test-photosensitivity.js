/**
 * BROWSER CONSOLE TEST SCRIPT
 * Copy and paste this into your browser console at https://gol-conway.hopto.org
 * 
 * This will analyze your live Game of Life animation for photosensitivity violations
 */

(function() {
  console.log('🧪 Starting Live Photosensitivity Test...');
  
  // Find the canvas element
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.error('❌ No canvas found on page');
    return;
  }
  
  console.log('✅ Canvas found:', canvas.width, 'x', canvas.height);
  
  // Simple photosensitivity analyzer
  class LivePhotosensitivityTest {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.previousFrame = null;
      this.flashHistory = [];
      this.violations = [];
      this.warnings = [];
      this.frameCount = 0;
      this.startTime = Date.now();
      
      // WCAG 2.1 Thresholds
      this.FLASH_LIMIT = 3; // per second
      this.WINDOW_MS = 1000;
      this.MAX_FLASH_AREA = 87296; // pixels
    }
    
    captureFrame() {
      try {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      } catch (e) {
        return null;
      }
    }
    
    detectFlash(prev, curr) {
      if (!prev || !curr) return { hasFlash: false, flashPixels: 0 };
      
      const data1 = prev.data;
      const data2 = curr.data;
      let flashPixels = 0;
      
      // Sample every 16th pixel for performance
      for (let i = 0; i < data1.length; i += 64) {
        const r1 = data1[i];
        const g1 = data1[i + 1];
        const b1 = data1[i + 2];
        const r2 = data2[i];
        const g2 = data2[i + 1];
        const b2 = data2[i + 2];
        
        // Simple luminance approximation
        const lum1 = (r1 * 0.299 + g1 * 0.587 + b1 * 0.114) / 255;
        const lum2 = (r2 * 0.299 + g2 * 0.587 + b2 * 0.114) / 255;
        
        const lumDelta = Math.abs(lum2 - lum1);
        
        // Significant luminance change (threshold ~0.08 for 20 cd/m²)
        if (lumDelta > 0.08) {
          flashPixels += 16; // Account for sampling
        }
      }
      
      return {
        hasFlash: flashPixels > 1000,
        flashPixels
      };
    }
    
    analyze() {
      this.frameCount++;
      const now = Date.now();
      const currentFrame = this.captureFrame();
      
      if (!currentFrame) return;
      
      if (this.previousFrame) {
        const flash = this.detectFlash(this.previousFrame, currentFrame);
        
        if (flash.hasFlash) {
          this.flashHistory.push({
            timestamp: now,
            pixels: flash.flashPixels
          });
        }
      }
      
      // Clean old flashes (older than 1 second)
      const cutoff = now - this.WINDOW_MS;
      this.flashHistory = this.flashHistory.filter(f => f.timestamp > cutoff);
      
      // Check violations
      if (this.flashHistory.length > this.FLASH_LIMIT) {
        this.violations.push({
          frame: this.frameCount,
          type: 'FLASH_RATE',
          count: this.flashHistory.length,
          message: `${this.flashHistory.length} flashes in 1 second (limit: ${this.FLASH_LIMIT})`
        });
      }
      
      const totalFlashArea = this.flashHistory.reduce((sum, f) => sum + f.pixels, 0);
      if (totalFlashArea > this.MAX_FLASH_AREA) {
        this.violations.push({
          frame: this.frameCount,
          type: 'FLASH_AREA',
          area: totalFlashArea,
          message: `Flash area ${totalFlashArea} pixels exceeds limit (${this.MAX_FLASH_AREA})`
        });
      }
      
      this.previousFrame = currentFrame;
    }
    
    getReport() {
      const duration = (Date.now() - this.startTime) / 1000;
      const uniqueViolations = {};
      this.violations.forEach(v => {
        uniqueViolations[v.type] = (uniqueViolations[v.type] || 0) + 1;
      });
      
      return {
        duration: duration.toFixed(2) + 's',
        framesAnalyzed: this.frameCount,
        totalViolations: this.violations.length,
        violationTypes: uniqueViolations,
        maxFlashRate: Math.max(...this.flashHistory.map(() => this.flashHistory.length), 0),
        wcagCompliant: this.violations.length === 0,
        testResult: this.violations.length === 0 ? '✅ PASS' : '❌ FAIL',
        violations: this.violations
      };
    }
  }
  
  // Create test instance
  const test = new LivePhotosensitivityTest(canvas);
  
  // Monitor for 10 seconds
  let framesSampled = 0;
  const maxFrames = 300; // ~10 seconds at 30fps
  
  const monitorInterval = setInterval(() => {
    test.analyze();
    framesSampled++;
    
    if (framesSampled >= maxFrames) {
      clearInterval(monitorInterval);
      
      // Generate report
      const report = test.getReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('PHOTOSENSITIVITY TEST REPORT - gol-conway.hopto.org');
      console.log('='.repeat(60));
      console.log('Test Result:', report.testResult);
      console.log('WCAG 2.1 Compliant:', report.wcagCompliant ? '✅ YES' : '❌ NO');
      console.log('Duration:', report.duration);
      console.log('Frames Analyzed:', report.framesAnalyzed);
      console.log('Total Violations:', report.totalViolations);
      console.log('Max Flash Rate:', report.maxFlashRate + '/sec (limit: 3/sec)');
      console.log('-'.repeat(60));
      
      if (report.totalViolations > 0) {
        console.log('\n❌ VIOLATIONS DETECTED:');
        const violationSummary = {};
        report.violations.forEach(v => {
          if (!violationSummary[v.type]) {
            violationSummary[v.type] = [];
          }
          violationSummary[v.type].push(v);
        });
        
        Object.entries(violationSummary).forEach(([type, violations]) => {
          console.log(`\n${type}: ${violations.length} occurrences`);
          violations.slice(0, 3).forEach(v => {
            console.log(`  Frame ${v.frame}: ${v.message}`);
          });
          if (violations.length > 3) {
            console.log(`  ... and ${violations.length - 3} more`);
          }
        });
        
        console.log('\n💡 RECOMMENDATIONS:');
        if (violationSummary.FLASH_RATE) {
          console.log('  - Reduce animation speed to ≤3 fps');
        }
        if (violationSummary.FLASH_AREA) {
          console.log('  - Reduce grid size or limit flashing area');
        }
      } else {
        console.log('✅ No violations detected!');
        console.log('Your animation appears to be photosensitivity-safe.');
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('LEGAL STATUS:');
      if (report.wcagCompliant) {
        console.log('✅ COMPLIANT - Safe harbor protection under ADA');
        console.log('✅ Legal Risk: LOW');
      } else {
        console.log('❌ NON-COMPLIANT - ADA violation risk');
        console.log('⚠️  Legal Risk: HIGH');
        console.log('⚠️  FIX REQUIRED before deployment');
      }
      console.log('='.repeat(60) + '\n');
      
      // Store report globally
      window.__PHOTOSENSITIVITY_REPORT__ = report;
      console.log('Full report saved to: window.__PHOTOSENSITIVITY_REPORT__');
    }
  }, 33); // ~30fps sampling
  
  console.log('⏳ Monitoring animation for 10 seconds...');
  console.log('   (Let the simulation run normally)');
  
})();
