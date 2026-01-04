/**
 * Photosensitivity Safety Module
 * 
 * Implements WCAG 2.1 Level A compliance for photosensitive seizure prevention.
 * Reference: https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html
 * 
 * Safe thresholds (WCAG 2.1):
 * - Max 3 general flashes per 1 second
 * - Max 3 red flashes per 1 second (saturated red only)
 * - Flashing area ≤ 25% of 341×256px rectangle (~10° visual field)
 * - Luminance change ≥ 20 cd/m² or Michelson contrast ≥ 1/17
 */

class PhotosensitivityAnalyzer {
  constructor() {
    this.SAFE_FLASH_RATE = 3; // flashes per second
    this.FLASH_WINDOW_MS = 1000; // 1 second window
    this.MAX_FLASH_AREA_PIXELS = 87296; // 341 × 256 pixels (10° visual field)
    this.RED_LUMINANCE_THRESHOLD = 75; // More conservative for red
    this.GENERAL_LUMINANCE_THRESHOLD = 20; // cd/m²
    this.RED_SATURATION_THRESHOLD = 0.8; // Saturated red (HSL saturation)
    
    this.flashHistory = [];
    this.redFlashHistory = [];
    this.warnings = [];
    this.violations = [];
  }

  /**
   * Analyze a frame transition for flash safety
   * @param {ImageData} previousFrame - Previous canvas frame
   * @param {ImageData} currentFrame - Current canvas frame
   * @param {number} timestamp - Frame timestamp in milliseconds
   * @returns {Object} Analysis result
   */
  analyzeFrame(previousFrame, currentFrame, timestamp = Date.now()) {
    this.warnings = [];
    this.violations = [];

    if (!previousFrame || !currentFrame) {
      return { safe: true, warnings: [], violations: [] };
    }

    // Clean old history entries (older than 1 second)
    const cutoff = timestamp - this.FLASH_WINDOW_MS;
    this.flashHistory = this.flashHistory.filter(entry => entry.timestamp > cutoff);
    this.redFlashHistory = this.redFlashHistory.filter(entry => entry.timestamp > cutoff);

    // Detect flashing areas and intensity
    const flashData = this.detectFlashes(previousFrame, currentFrame);
    
    if (flashData.hasFlash) {
      this.flashHistory.push({
        timestamp,
        luminanceChange: flashData.luminanceChange,
        flashArea: flashData.flashArea,
        isRedFlash: flashData.isRedFlash
      });

      if (flashData.isRedFlash) {
        this.redFlashHistory.push({
          timestamp,
          luminanceChange: flashData.luminanceChange
        });
      }
    }

    // Check thresholds
    this.checkFlashRateThreshold();
    this.checkRedFlashThreshold();
    this.checkFlashAreaThreshold();
    this.checkLuminanceThreshold();

    const safe = this.violations.length === 0;
    
    return {
      safe,
      warnings: this.warnings,
      violations: this.violations,
      flashCount: this.flashHistory.length,
      redFlashCount: this.redFlashHistory.length
    };
  }

  /**
   * Detect flashing areas between two frames
   * @private
   */
  detectFlashes(prev, curr) {
    const data1 = prev.data;
    const data2 = curr.data;
    let totalLuminanceChange = 0;
    let flashPixelCount = 0;
    let isRedFlash = false;
    let maxLuminanceChange = 0;

    // Sample every 4th pixel for performance (most monitors won't detect single-pixel flashes)
    for (let i = 0; i < data1.length; i += 16) {
      const r1 = data1[i];
      const g1 = data1[i + 1];
      const b1 = data1[i + 2];

      const r2 = data2[i];
      const g2 = data2[i + 1];
      const b2 = data2[i + 2];

      // Calculate relative luminance (ITU-R BT.1702)
      const lum1 = this.getRelativeLuminance(r1, g1, b1);
      const lum2 = this.getRelativeLuminance(r2, g2, b2);
      
      const lumChange = Math.abs(lum2 - lum1);
      
      if (lumChange > this.GENERAL_LUMINANCE_THRESHOLD / 255) {
        flashPixelCount += 4; // Account for sampling
        totalLuminanceChange += lumChange;
        maxLuminanceChange = Math.max(maxLuminanceChange, lumChange);

        // Check if this is a red flash
        if (this.isRedFlash(r2, g2, b2)) {
          isRedFlash = true;
        }
      }
    }

    return {
      hasFlash: flashPixelCount > 0,
      luminanceChange: maxLuminanceChange * 255,
      flashArea: flashPixelCount,
      isRedFlash
    };
  }

  /**
   * Get relative luminance using sRGB formula
   * @private
   */
  getRelativeLuminance(r, g, b) {
    // Normalize to 0-1
    r /= 255;
    g /= 255;
    b /= 255;

    // Apply gamma correction
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // ITU-R BT.1702 weights
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Detect if a color is saturated red
   * @private
   */
  isRedFlash(r, g, b) {
    // Red is high, green and blue are low, and saturation is high
    if (r < 150) return false; // Not red enough
    if (g > 100 || b > 100) return false; // Green or blue too high

    // Calculate saturation (HSL)
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const lightness = (max + min) / 2;
    const saturation = lightness === 0 || lightness === 1
      ? 0
      : (max - min) / (1 - Math.abs(2 * lightness - 1));

    return saturation > this.RED_SATURATION_THRESHOLD;
  }

  /**
   * Check if flash rate exceeds safe threshold
   * @private
   */
  checkFlashRateThreshold() {
    if (this.flashHistory.length > this.SAFE_FLASH_RATE) {
      this.violations.push({
        type: 'FLASH_RATE',
        message: `Flash rate exceeds safe threshold: ${this.flashHistory.length} flashes in 1 second (max: ${this.SAFE_FLASH_RATE})`,
        severity: 'CRITICAL',
        affectedPixels: this.flashHistory.reduce((sum, f) => sum + f.flashArea, 0)
      });
    } else if (this.flashHistory.length >= 2) {
      this.warnings.push({
        type: 'FLASH_RATE_WARNING',
        message: `Flash rate approaching threshold: ${this.flashHistory.length}/${this.SAFE_FLASH_RATE} flashes in window`,
        severity: 'WARNING'
      });
    }
  }

  /**
   * Check if red flash rate exceeds safe threshold
   * @private
   */
  checkRedFlashThreshold() {
    if (this.redFlashHistory.length > this.SAFE_FLASH_RATE) {
      this.violations.push({
        type: 'RED_FLASH_RATE',
        message: `Red flash rate exceeds safe threshold: ${this.redFlashHistory.length} red flashes in 1 second (max: ${this.SAFE_FLASH_RATE})`,
        severity: 'CRITICAL',
        note: 'Red flashing is especially dangerous for photosensitive users'
      });
    }
  }

  /**
   * Check if total flashing area exceeds safe threshold
   * @private
   */
  checkFlashAreaThreshold() {
    const totalArea = this.flashHistory.reduce((sum, f) => sum + f.flashArea, 0);
    if (totalArea > this.MAX_FLASH_AREA_PIXELS) {
      this.violations.push({
        type: 'FLASH_AREA',
        message: `Flashing area exceeds safe threshold: ${totalArea} pixels (max: ${this.MAX_FLASH_AREA_PIXELS})`,
        severity: 'CRITICAL',
        percentageOfScreen: ((totalArea / this.MAX_FLASH_AREA_PIXELS) * 100).toFixed(1)
      });
    }
  }

  /**
   * Check luminance change threshold
   * @private
   */
  checkLuminanceThreshold() {
    const maxChange = Math.max(...this.flashHistory.map(f => f.luminanceChange));
    if (maxChange > this.GENERAL_LUMINANCE_THRESHOLD) {
      this.violations.push({
        type: 'LUMINANCE_CHANGE',
        message: `Luminance change exceeds safe threshold: ${maxChange.toFixed(1)} cd/m² (max: ${this.GENERAL_LUMINANCE_THRESHOLD})`,
        severity: 'CRITICAL'
      });
    }
  }

  /**
   * Get human-readable safety assessment
   */
  getSafetyAssessment() {
    return {
      isSafe: this.violations.length === 0,
      complianceLevel: this.violations.length === 0 ? 'WCAG 2.1 Level A' : 'NON-COMPLIANT',
      violationCount: this.violations.length,
      warningCount: this.warnings.length,
      violations: this.violations,
      warnings: this.warnings,
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Generate accessibility recommendations
   */
  getRecommendations() {
    const recommendations = [];

    if (this.violations.some(v => v.type === 'FLASH_RATE')) {
      recommendations.push(
        'Reduce animation speed or add delays between frame updates'
      );
    }

    if (this.violations.some(v => v.type === 'RED_FLASH_RATE')) {
      recommendations.push(
        'Avoid rapid changes between bright red and black/dark colors'
      );
    }

    if (this.violations.some(v => v.type === 'FLASH_AREA')) {
      recommendations.push(
        'Reduce the area of the screen that flashes, or increase animation duration'
      );
    }

    if (this.violations.some(v => v.type === 'LUMINANCE_CHANGE')) {
      recommendations.push(
        'Use less extreme color contrasts or add transitional frames'
      );
    }

    if (recommendations.length === 0 && this.warnings.length > 0) {
      recommendations.push(
        'Continue monitoring animation speeds and color transitions'
      );
    }

    return recommendations;
  }
}

/**
 * Renderer wrapper that enforces photosensitivity safety
 */
class SafeRenderer {
  constructor(canvasContext, analyzer = null) {
    this.ctx = canvasContext;
    this.analyzer = analyzer || new PhotosensitivityAnalyzer();
    this.previousFrame = null;
    this.frameCount = 0;
    this.safeMode = false;
  }

  /**
   * Capture frame for analysis
   */
  captureFrame() {
    try {
      const imageData = this.ctx.getImageData(
        0, 0,
        this.ctx.canvas.width,
        this.ctx.canvas.height
      );
      return imageData;
    } catch (e) {
      console.warn('Could not capture frame for photosensitivity analysis:', e);
      return null;
    }
  }

  /**
   * Analyze current frame and return safety status
   */
  analyzeCurrentFrame() {
    const currentFrame = this.captureFrame();
    if (!currentFrame || !this.previousFrame) {
      this.previousFrame = currentFrame;
      return { safe: true };
    }

    const analysis = this.analyzer.analyzeFrame(this.previousFrame, currentFrame);
    this.previousFrame = currentFrame;
    this.frameCount++;

    if (!analysis.safe) {
      this.safeMode = true;
      console.error('Photosensitivity safety violation detected!', analysis);
    }

    return analysis;
  }

  /**
   * Get accessibility report
   */
  getAccessibilityReport() {
    return this.analyzer.getSafetyAssessment();
  }

  /**
   * Reset safety tracking
   */
  reset() {
    this.previousFrame = null;
    this.frameCount = 0;
    this.safeMode = false;
    this.analyzer = new PhotosensitivityAnalyzer();
  }
}

export { PhotosensitivityAnalyzer, SafeRenderer };
