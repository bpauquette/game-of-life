/**
 * IMPLEMENTATION GUIDE: Photosensitivity Safety
 * 
 * This guide shows how to integrate photosensitivity monitoring
 * into your Game of Life application.
 */

// ============================================
// 1. BASIC SETUP
// ============================================

import { SafeRenderer, PhotosensitivityAnalyzer } from '@/accessibility/PhotosensitivitySafety';

// Create analyzer (can be reused across renders)
const analyzer = new PhotosensitivityAnalyzer();

// ============================================
// 2. INTEGRATION WITH RENDERER
// ============================================

class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Wrap renderer with safety checks
    this.safeRenderer = new SafeRenderer(this.ctx, analyzer);
    
    // Optional: Enable aggressive mode for extra caution
    this.aggressiveMode = false;
  }

  /**
   * Called after each render frame
   */
  renderFrame(cells) {
    // Your normal rendering code
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderCells(cells);
    
    // Analyze for safety (run every few frames to avoid overhead)
    if (this.frameCount % 10 === 0) {
      const analysis = this.safeRenderer.analyzeCurrentFrame();
      
      if (!analysis.safe) {
        this.handleSafetyViolation(analysis);
      }
    }
  }

  /**
   * Handle safety violations
   */
  handleSafetyViolation(analysis) {
    console.error('Photosensitivity violation detected:', analysis);
    
    // Log for debugging
    console.table(analysis.violations);
    
    // Display warning to user
    this.displayAccessibilityWarning(analysis);
    
    // Optional: Pause animation
    if (this.aggressiveMode) {
      this.pauseAnimation();
    }
  }

  /**
   * Show warning UI
   */
  displayAccessibilityWarning(analysis) {
    const warning = document.createElement('div');
    warning.className = 'accessibility-warning';
    warning.innerHTML = `
      <strong>⚠️ Photosensitivity Warning</strong>
      <p>This animation may not be safe for photosensitive users.</p>
      <ul>
        ${analysis.violations.map(v => `
          <li>${v.message}</li>
        `).join('')}
      </ul>
      <button onclick="this.parentElement.style.display='none'">Dismiss</button>
    `;
    document.body.appendChild(warning);
  }

  pauseAnimation() {
    // Stop animation loop
  }

  // ... rest of renderer methods
}

// ============================================
// 3. ACCESSIBILITY REPORT EXPORT
// ============================================

/**
 * Generate accessibility report at end of session
 */
function generateAccessibilityReport() {
  const report = analyzer.getSafetyAssessment();
  
  return {
    timestamp: new Date().toISOString(),
    compliance: {
      isSafe: report.isSafe,
      complianceLevel: report.complianceLevel,
      standard: 'WCAG 2.1 Level A'
    },
    violations: report.violations,
    warnings: report.warnings,
    recommendations: report.recommendations,
    summary: `
      WCAG 2.1 Compliance Report
      ===========================
      Safe: ${report.isSafe ? 'YES' : 'NO'}
      Violations: ${report.violationCount}
      Warnings: ${report.warningCount}
      Compliance Level: ${report.complianceLevel}
      
      ${report.violations.length > 0 ? 'Violations Found:\n' + 
        report.violations.map(v => `- ${v.message}`).join('\n') : 
        'No violations detected.'}
      
      Recommendations:
      ${report.recommendations.map(r => `- ${r}`).join('\n')}
    `
  };
}

// ============================================
// 4. ANIMATION SPEED CONTROLS
// ============================================

/**
 * Safe animation speed settings
 * Based on WCAG 2.1 thresholds
 */
const AnimationSpeeds = {
  // Safe for all users, no restrictions
  SAFE: {
    fps: 2,
    label: 'Safe for photosensitive users',
    description: 'Well below all thresholds'
  },
  
  // Requires monitoring
  MODERATE: {
    fps: 3,
    label: 'Standard (monitored)',
    description: 'At WCAG 2.1 limit, automatically monitored'
  },
  
  // Requires explicit safety analysis
  FAST: {
    fps: 6,
    label: 'Fast (requires analysis)',
    description: 'Requires photosensitivity analysis before playback'
  },
  
  // UNSAFE - Do not use
  EXTREME: {
    fps: 15,
    label: 'Extreme (unsafe)',
    description: 'Exceeds safe thresholds, not recommended',
    warning: true
  }
};

/**
 * Validate speed before using
 */
function validateAnimationSpeed(fps) {
  if (fps > AnimationSpeeds.FAST.fps) {
    console.warn(`
      WARNING: Animation speed (${fps} fps) exceeds safe threshold.
      This animation MUST be analyzed with PEAT before deployment.
      See: https://trace.umd.edu/peat/
    `);
    return false;
  }
  return true;
}

// ============================================
// 5. COLOR SAFETY RULES
// ============================================

/**
 * Safe color palettes for Game of Life
 * Avoid rapid red/black transitions
 */
const SafeColorPalettes = {
  CLASSIC: {
    alive: '#000000',    // Black
    dead: '#FFFFFF',     // White
    grid: '#CCCCCC',     // Light gray
    safe: true
  },
  
  MUTED: {
    alive: '#1F2937',    // Dark gray
    dead: '#F3F4F6',     // Light gray
    grid: '#D1D5DB',     // Medium gray
    safe: true
  },
  
  COLORFUL: {
    alive: '#3B82F6',    // Blue
    dead: '#EFF6FF',     // Light blue
    grid: '#DBEAFE',     // Very light blue
    safe: true
  },
  
  NEON: {
    alive: '#00FF00',    // Bright green
    dead: '#000000',     // Black
    grid: '#222222',     // Dark gray
    safe: false,         // HIGH RISK: Rapid green/black transitions
    warning: 'Bright green on black can trigger seizures. Use muted colors instead.'
  }
};

/**
 * Validate color palette safety
 */
function validateColorPalette(palette) {
  if (!palette.safe) {
    console.error(`❌ UNSAFE COLOR PALETTE: ${palette.warning}`);
    return false;
  }
  console.log('✅ Color palette is photosensitivity-safe');
  return true;
}

// ============================================
// 6. TESTING CHECKLIST
// ============================================

/**
 * Before deployment, verify:
 */
const PreDeploymentChecklist = [
  {
    item: 'Flash Rate',
    requirement: 'Max 3 flashes per second',
    test: 'Run PEAT analysis tool',
    status: 'PENDING'
  },
  {
    item: 'Red Flash',
    requirement: 'No saturated red flashing',
    test: 'Verify color palette in SafeColorPalettes',
    status: 'PENDING'
  },
  {
    item: 'Flash Area',
    requirement: 'Flashing area < 25% of 341×256px rectangle',
    test: 'Use analyzer.checkFlashAreaThreshold()',
    status: 'PENDING'
  },
  {
    item: 'Luminance Change',
    requirement: 'Luminance changes < 20 cd/m²',
    test: 'Use analyzer.checkLuminanceThreshold()',
    status: 'PENDING'
  },
  {
    item: 'Documentation',
    requirement: 'ACCESSIBILITY.md completed',
    test: 'Review compliance statement',
    status: 'PENDING'
  },
  {
    item: 'Legal Review',
    requirement: 'Document safe harbor status',
    test: 'Verify WCAG 2.1 compliance documented',
    status: 'PENDING'
  }
];

// ============================================
// 7. MONITORING IN PRODUCTION
// ============================================

/**
 * Log accessibility metrics
 */
class AccessibilityMonitor {
  constructor() {
    this.metrics = {
      totalFrames: 0,
      violationCount: 0,
      warningCount: 0,
      sessionStartTime: Date.now()
    };
  }

  recordAnalysis(analysis) {
    this.metrics.totalFrames++;
    this.metrics.violationCount += analysis.violations.length;
    this.metrics.warningCount += analysis.warnings.length;
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.sessionStartTime;
    return {
      ...this.metrics,
      uptime: uptime / 1000, // seconds
      violationRate: (this.metrics.violationCount / this.metrics.totalFrames * 100).toFixed(2) + '%',
      safeSession: this.metrics.violationCount === 0
    };
  }

  logToServer(endpoint) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.getMetrics())
    });
  }
}

// ============================================
// 8. USAGE EXAMPLE
// ============================================

/**
 * Complete example:
 */
function initializeGameWithAccessibility(canvasElement) {
  // Setup
  const renderer = new GameRenderer(canvasElement);
  const monitor = new AccessibilityMonitor();
  
  // Validate configuration
  validateAnimationSpeed(renderer.animationFps);
  validateColorPalette(renderer.colorPalette);
  
  // Generate report on exit
  globalThis.addEventListener('beforeunload', () => {
    const report = generateAccessibilityReport();
    console.log(report.summary);
    // Optionally: monitor.logToServer('/api/accessibility-metrics');
  });
  
  return { renderer, monitor };
}

// ============================================
// 9. COMMON MISTAKES TO AVOID
// ============================================

/**
 * ❌ DON'T:
 * - Use animation speeds > 3 fps without testing
 * - Rapidly flash bright red colors
 * - Update entire screen simultaneously
 * - Disable safety analysis
 * - Use pure white to pure black transitions
 * 
 * ✅ DO:
 * - Test with PEAT tool before deployment
 * - Use muted color palettes
 * - Gradual transitions between states
 * - Monitor real-time during playback
 * - Document all safety measures
 * - Provide accessibility disclaimer
 */

export {
  SafeRenderer,
  PhotosensitivityAnalyzer,
  AnimationSpeeds,
  SafeColorPalettes,
  AccessibilityMonitor,
  generateAccessibilityReport,
  validateAnimationSpeed,
  validateColorPalette,
  initializeGameWithAccessibility,
  PreDeploymentChecklist
};
