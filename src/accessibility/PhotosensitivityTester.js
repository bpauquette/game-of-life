/**
 * PHOTOSENSITIVITY TEST HARNESS
 * 
 * This file provides practical testing for Game of Life grid animations
 * to detect WCAG 2.1 photosensitivity violations.
 * 
 * USAGE:
 * 1. Import this in your GameController or test file
 * 2. Wrap your renderer with PhotosensitivityTestWrapper
 * 3. Run game simulation and check for violations
 * 4. Review test results and fix any issues
 */

import { PhotosensitivityAnalyzer } from './PhotosensitivitySafety';

/**
 * Test wrapper for Game of Life renderer
 * Captures frames and analyzes for photosensitivity safety
 */
export class PhotosensitivityTestWrapper {
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.analyzer = new PhotosensitivityAnalyzer();
    this.enabled = options.enabled !== false;
    this.frameCount = 0;
    this.testResults = {
      totalFrames: 0,
      violations: [],
      warnings: [],
      testStartTime: Date.now(),
      maxFlashRate: 0,
      maxRedFlashRate: 0,
      dangerousFrames: []
    };
    
    // Capture settings
    this.captureEveryNthFrame = options.captureEveryNthFrame || 1;
    this.maxCaptureFrames = options.maxCaptureFrames || 100;
    this.stopOnViolation = options.stopOnViolation || false;
    
    // Store original render method
    this._originalRender = renderer.render.bind(renderer);
  }

  /**
   * Wrap the renderer's render method to capture frames
   */
  install() {
    if (!this.enabled) return;
    
    const self = this;
    this.renderer.render = function(liveCells, colorScheme, overlay) {
      // Call original render
      self._originalRender(liveCells, colorScheme, overlay);
      
      // Analyze frame after render
      self.analyzeFrame();
      
      return this;
    };
    
    console.log('📊 Photosensitivity test wrapper installed');
  }

  /**
   * Restore original render method
   */
  uninstall() {
    if (this._originalRender) {
      this.renderer.render = this._originalRender;
      console.log('✅ Photosensitivity test wrapper removed');
    }
  }

  /**
   * Analyze current frame
   */
  analyzeFrame() {
    this.frameCount++;
    this.testResults.totalFrames++;
    
    // Only capture every Nth frame for performance
    if (this.frameCount % this.captureEveryNthFrame !== 0) {
      return;
    }
    
    // Stop if we've hit max capture limit
    if (this.testResults.totalFrames >= this.maxCaptureFrames) {
      return;
    }
    
    try {
      const currentFrame = this.captureFrame();
      if (!currentFrame) return;
      
      const analysis = this.analyzer.analyzeFrame(
        this.previousFrame,
        currentFrame,
        Date.now()
      );
      
      this.previousFrame = currentFrame;
      
      // Record results
      if (analysis.violations && analysis.violations.length > 0) {
        this.testResults.violations.push({
          frameNumber: this.frameCount,
          timestamp: Date.now(),
          violations: analysis.violations
        });
        
        this.testResults.dangerousFrames.push(this.frameCount);
        
        console.error(`🚨 FRAME ${this.frameCount}: Photosensitivity violation!`, analysis);
        
        if (this.stopOnViolation) {
          this.generateReport();
          throw new Error('Photosensitivity violation detected - stopping test');
        }
      }
      
      if (analysis.warnings && analysis.warnings.length > 0) {
        this.testResults.warnings.push({
          frameNumber: this.frameCount,
          warnings: analysis.warnings
        });
      }
      
      // Track max flash rates
      if (analysis.flashCount > this.testResults.maxFlashRate) {
        this.testResults.maxFlashRate = analysis.flashCount;
      }
      if (analysis.redFlashCount > this.testResults.maxRedFlashRate) {
        this.testResults.maxRedFlashRate = analysis.redFlashCount;
      }
      
    } catch (e) {
      console.warn('Failed to analyze frame:', e);
    }
  }

  /**
   * Capture current canvas frame
   */
  captureFrame() {
    try {
      const canvas = this.renderer.canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.warn('Could not capture frame:', e);
      return null;
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const duration = Date.now() - this.testResults.testStartTime;
    const assessment = this.analyzer.getSafetyAssessment();
    
    const report = {
      // Test metadata
      testDuration: `${(duration / 1000).toFixed(2)}s`,
      totalFramesCaptured: this.testResults.totalFrames,
      framesAnalyzed: this.frameCount,
      
      // WCAG 2.1 Compliance
      wcagCompliant: this.testResults.violations.length === 0,
      complianceLevel: this.testResults.violations.length === 0 ? 'WCAG 2.1 Level A' : 'NON-COMPLIANT',
      
      // Flash metrics
      maxFlashRateDetected: this.testResults.maxFlashRate,
      maxRedFlashRateDetected: this.testResults.maxRedFlashRate,
      wcagFlashLimit: 3,
      
      // Violations
      totalViolations: this.testResults.violations.length,
      violationFrames: this.testResults.dangerousFrames,
      violations: this.testResults.violations,
      
      // Warnings
      totalWarnings: this.testResults.warnings.length,
      warnings: this.testResults.warnings,
      
      // Safety assessment
      ...assessment,
      
      // Pass/Fail
      testResult: this.testResults.violations.length === 0 ? '✅ PASS' : '❌ FAIL',
      legalRisk: this.testResults.violations.length === 0 ? 'LOW' : 'HIGH'
    };
    
    return report;
  }

  /**
   * Print report to console
   */
  printReport() {
    const report = this.generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('PHOTOSENSITIVITY TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Test Result: ${report.testResult}`);
    console.log(`Compliance: ${report.complianceLevel}`);
    console.log(`Legal Risk: ${report.legalRisk}`);
    console.log('-'.repeat(60));
    console.log(`Frames Analyzed: ${report.framesAnalyzed}`);
    console.log(`Test Duration: ${report.testDuration}`);
    console.log(`Max Flash Rate: ${report.maxFlashRateDetected}/sec (limit: ${report.wcagFlashLimit}/sec)`);
    console.log(`Max Red Flash Rate: ${report.maxRedFlashRateDetected}/sec (limit: ${report.wcagFlashLimit}/sec)`);
    console.log('-'.repeat(60));
    console.log(`Total Violations: ${report.totalViolations}`);
    console.log(`Total Warnings: ${report.totalWarnings}`);
    
    if (report.violations.length > 0) {
      console.log('\n❌ VIOLATIONS DETECTED:');
      report.violations.forEach((v, idx) => {
        console.log(`  ${idx + 1}. Frame ${v.frameNumber}:`);
        v.violations.forEach(violation => {
          console.log(`     - ${violation.type}: ${violation.message}`);
        });
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((r, idx) => {
        console.log(`  ${idx + 1}. ${r}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
    
    return report;
  }

  /**
   * Reset test state
   */
  reset() {
    this.frameCount = 0;
    this.previousFrame = null;
    this.testResults = {
      totalFrames: 0,
      violations: [],
      warnings: [],
      testStartTime: Date.now(),
      maxFlashRate: 0,
      maxRedFlashRate: 0,
      dangerousFrames: []
    };
    this.analyzer = new PhotosensitivityAnalyzer();
  }
}

/**
 * Quick test helper - run a Game of Life simulation and check for violations
 */
export async function testGameOfLifeAnimation(renderer, liveCellsSequence, durationMs = 5000) {
  console.log('🧪 Starting Game of Life photosensitivity test...');
  
  const wrapper = new PhotosensitivityTestWrapper(renderer, {
    enabled: true,
    captureEveryNthFrame: 1,
    stopOnViolation: false
  });
  
  wrapper.install();
  
  return new Promise((resolve) => {
    let frameIndex = 0;
    const startTime = Date.now();
    
    function step() {
      if (Date.now() - startTime >= durationMs) {
        wrapper.uninstall();
        const report = wrapper.printReport();
        resolve(report);
        return;
      }
      
      // Render next frame
      const cells = liveCellsSequence[frameIndex % liveCellsSequence.length];
      renderer.render(cells);
      
      frameIndex++;
      requestAnimationFrame(step);
    }
    
    requestAnimationFrame(step);
  });
}

/**
 * Test a specific pattern for violations
 * Useful for testing gliders, oscillators, etc.
 */
export function testPattern(renderer, patternFrames, fps = 60) {
  const wrapper = new PhotosensitivityTestWrapper(renderer);
  wrapper.install();
  
  const frameDelay = 1000 / fps;
  let currentFrame = 0;
  
  const interval = setInterval(() => {
    if (currentFrame >= patternFrames.length) {
      clearInterval(interval);
      wrapper.uninstall();
      wrapper.printReport();
      return;
    }
    
    renderer.render(patternFrames[currentFrame]);
    currentFrame++;
  }, frameDelay);
}

/**
 * AUTOMATED TEST SCENARIOS
 */

export const PhotosensitivityTestScenarios = {
  /**
   * Test 1: Rapid full-screen blink (should FAIL)
   */
  rapidFullScreenBlink: (renderer) => {
    console.log('Test: Rapid full-screen blink (expected: FAIL)');
    const frames = [];
    
    // Alternate between all cells alive and all dead at 10 Hz (too fast!)
    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        // All cells alive
        const cells = new Map();
        for (let x = 0; x < 50; x++) {
          for (let y = 0; y < 50; y++) {
            cells.set(`${x},${y}`, true);
          }
        }
        frames.push(cells);
      } else {
        // All cells dead
        frames.push(new Map());
      }
    }
    
    return testGameOfLifeAnimation(renderer, frames, 2000);
  },
  
  /**
   * Test 2: Slow evolution (should PASS)
   */
  slowEvolution: (renderer) => {
    console.log('Test: Slow evolution at 2 fps (expected: PASS)');
    // Glider pattern evolving slowly
    const frames = [
      new Map([['1,0', true], ['2,1', true], ['0,2', true], ['1,2', true], ['2,2', true]]),
      new Map([['2,0', true], ['0,1', true], ['2,1', true], ['1,2', true], ['2,2', true]]),
      new Map([['1,0', true], ['2,1', true], ['2,2', true], ['0,1', true], ['1,2', true]])
    ];
    
    return testGameOfLifeAnimation(renderer, frames, 3000); // 3 frames over 3 seconds = 1 fps
  },
  
  /**
   * Test 3: Moderate speed (edge case)
   */
  moderateSpeed: (renderer) => {
    console.log('Test: Moderate speed at 3 fps (expected: PASS, but near limit)');
    const frames = [];
    
    // Simple blinker pattern
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        frames.push(new Map([['1,0', true], ['1,1', true], ['1,2', true]]));
      } else {
        frames.push(new Map([['0,1', true], ['1,1', true], ['2,1', true]]));
      }
    }
    
    return testGameOfLifeAnimation(renderer, frames, 3000); // 10 frames over 3 sec ≈ 3.3 fps
  }
};

/**
 * Run all test scenarios
 */
export async function runAllPhotosensitivityTests(renderer) {
  console.log('\n🧪 Running comprehensive photosensitivity test suite...\n');
  
  const results = {};
  
  for (const [testName, testFn] of Object.entries(PhotosensitivityTestScenarios)) {
    console.log(`\n📋 Running: ${testName}`);
    results[testName] = await testFn(renderer);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([name, result]) => {
    console.log(`${result.testResult} ${name}`);
    console.log(`   Compliance: ${result.complianceLevel}`);
    console.log(`   Violations: ${result.totalViolations}`);
  });
  
  console.log('='.repeat(60) + '\n');
  
  return results;
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.PhotosensitivityTestWrapper = PhotosensitivityTestWrapper;
  window.testGameOfLifeAnimation = testGameOfLifeAnimation;
  window.runAllPhotosensitivityTests = runAllPhotosensitivityTests;
}

export default PhotosensitivityTestWrapper;
