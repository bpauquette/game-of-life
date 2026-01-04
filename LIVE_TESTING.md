# Testing gol-conway.hopto.org for Photosensitivity

## Quick Test (Browser Console)

### Steps:

1. **Open your site:**
   ```
   https://gol-conway.hopto.org
   ```

2. **Open browser console:**
   - **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J`
   - **Firefox:** Press `F12` or `Ctrl+Shift+K`
   - **Safari:** Press `Cmd+Option+C`

3. **Copy and paste the test script:**
   - Open: `console-test-photosensitivity.js`
   - Select all (`Ctrl+A`)
   - Copy (`Ctrl+C`)
   - Paste into browser console (`Ctrl+V`)
   - Press `Enter`

4. **Let simulation run for 10 seconds**
   - The test will automatically analyze your animation
   - Watch the console for progress

5. **Read the results:**
   ```
   ============================================================
   PHOTOSENSITIVITY TEST REPORT - gol-conway.hopto.org
   ============================================================
   Test Result: ✅ PASS  or  ❌ FAIL
   WCAG 2.1 Compliant: ✅ YES  or  ❌ NO
   Frames Analyzed: 300
   Total Violations: 0
   Max Flash Rate: 2/sec (limit: 3/sec)
   ============================================================
   ```

---

## What to Look For

### ✅ PASS Example:
```
Test Result: ✅ PASS
WCAG 2.1 Compliant: ✅ YES
Total Violations: 0
Max Flash Rate: 2/sec

✅ COMPLIANT - Safe harbor protection under ADA
✅ Legal Risk: LOW
```

**Action:** You're good to go! Your animation is safe.

---

### ❌ FAIL Example:
```
Test Result: ❌ FAIL
WCAG 2.1 Compliant: ❌ NO
Total Violations: 12
Max Flash Rate: 8/sec

❌ VIOLATIONS DETECTED:
FLASH_RATE: 12 occurrences
  Frame 23: 8 flashes in 1 second (limit: 3)
  Frame 47: 7 flashes in 1 second (limit: 3)
  
💡 RECOMMENDATIONS:
  - Reduce animation speed to ≤3 fps

❌ NON-COMPLIANT - ADA violation risk
⚠️  Legal Risk: HIGH
⚠️  FIX REQUIRED before deployment
```

**Action:** You need to slow down your animation or reduce the flashing area.

---

## Common Test Scenarios

### Test 1: Normal Gameplay
1. Load the site
2. Start a pattern (glider, blinker, etc.)
3. Run the console test
4. Check if normal speed is safe

### Test 2: High-Speed Simulation
1. Load the site
2. Set simulation to fastest speed
3. Run the console test
4. This will likely FAIL if you exceed 3 fps

### Test 3: Script Execution
1. Load the site
2. Open script panel
3. Run the "Steady Squares" demo
4. While script is running, paste console test
5. Check if script animations are safe

---

## Quick Fixes if You Fail

### Fix 1: Limit FPS (Easiest)
Add to your GameController:
```javascript
const MAX_SAFE_FPS = 2; // Well under 3/sec limit
const frameDelay = 1000 / MAX_SAFE_FPS;

// In your game loop:
setInterval(() => {
  this.step();
}, frameDelay);
```

### Fix 2: Add Safe Mode Toggle
```javascript
// Add button to UI
<button onclick="enableSafeMode()">Safe Mode</button>

function enableSafeMode() {
  gameController.setMaxFPS(2);
  // Optionally reduce grid size, mute colors, etc.
}
```

### Fix 3: User Control
Give users a speed slider:
```javascript
<input type="range" min="1" max="10" value="2" 
       onchange="setGameSpeed(this.value)">
<label>Animation Speed: Safe (1) ← → Fast (10)</label>

function setGameSpeed(fps) {
  if (fps > 3) {
    alert('⚠️ Speeds above 3 may trigger photosensitive seizures');
  }
  gameController.setFPS(fps);
}
```

---

## Re-Test After Fixes

After making changes:

1. Rebuild and redeploy:
   ```bash
   npm run build
   docker compose up --build -d
   ```

2. Re-run the console test on live site

3. Verify you now PASS

---

## Advanced: Visual Inspection

While the console test is running, watch for:

- ⚠️ Rapid full-screen blinking
- ⚠️ Large areas rapidly changing color
- ⚠️ Bright flashing effects
- ⚠️ High-contrast oscillations

If you see these visually, you're likely failing the test.

---

## Saving Test Results

The test saves results to:
```javascript
window.__PHOTOSENSITIVITY_REPORT__
```

You can access it anytime:
```javascript
console.log(window.__PHOTOSENSITIVITY_REPORT__);
```

Or export it:
```javascript
// Copy to clipboard
copy(JSON.stringify(window.__PHOTOSENSITIVITY_REPORT__, null, 2));

// Or download
const blob = new Blob(
  [JSON.stringify(window.__PHOTOSENSITIVITY_REPORT__, null, 2)], 
  {type: 'application/json'}
);
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'photosensitivity-report.json';
a.click();
```

---

## Expected Results for Game of Life

### Slow Simulation (1-2 fps)
- **Expected:** ✅ PASS
- **Flash Rate:** 1-2/sec
- **Legal Risk:** LOW

### Moderate (3-4 fps)
- **Expected:** ⚠️ EDGE CASE
- **Flash Rate:** 3-4/sec
- **Legal Risk:** MEDIUM (may pass/fail depending on pattern)

### Fast (5+ fps)
- **Expected:** ❌ FAIL
- **Flash Rate:** 5-30/sec
- **Legal Risk:** HIGH (ADA violation)

---

## Documentation

After testing, document your results:

1. Update `ACCESSIBILITY.md`:
   ```markdown
   ## Testing Results
   
   Tested on: January 4, 2026
   Domain: gol-conway.hopto.org
   Result: ✅ PASS / ❌ FAIL
   Max Flash Rate: X/sec
   Compliance: WCAG 2.1 Level A
   
   [Include screenshot of console output]
   ```

2. Keep test report for legal records

---

## Need Help?

If you fail the test and need help fixing it, the console will show:
- Which frames violated
- What type of violation (flash rate, area, etc.)
- Specific recommendations

Example violations tell you exactly what to fix:
```
Frame 47: 8 flashes in 1 second (limit: 3)
→ Your animation is too fast, reduce to 2-3 fps

Frame 89: Flash area 134,567 pixels exceeds limit (87,296)
→ Too much of screen flashing, reduce grid size or slow down
```

---

**Ready to test?** Open https://gol-conway.hopto.org and paste the console script!
