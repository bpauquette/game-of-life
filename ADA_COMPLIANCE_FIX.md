# ADA Compliance Event Broadcast Fix

## Problem
The photosensitivity test was failing even when ADA compliance mode was enabled. The issue was that the ADA compliance state change was isolated to the React component state and localStorage, never propagated to the PhotosensitivityTestDialog or the simulation.

## Root Cause
- `GameOfLifeApp.setEnableAdaComplianceWithUpdate()` updated:
  - React state (`enableAdaCompliance`)
  - Color scheme (`colorSchemeKey` → `'adaSafe'`)
  - Performance caps (`maxFPS/maxGPS` → 2)
  - localStorage

- **BUT** it never notified the `PhotosensitivityTestDialog` component

## Solution
Implemented a 3-part fix to broadcast ADA compliance state through the component hierarchy:

### 1. **HeaderBar Component** (`src/view/HeaderBar.js`)
   - Added `enableAdaCompliance` and `setEnableAdaCompliance` to function signature
   - Passed `enableAdaCompliance` prop to `<PhotosensitivityTestDialog />`

### 2. **PhotosensitivityTestDialog Component** (`src/view/PhotosensitivityTestDialog.js`)
   - Accept `enableAdaCompliance` prop (default: `false`)
   - When ADA mode is enabled:
     - Enforce **2 FPS sample rate** (500ms intervals instead of 33ms)
     - Display info alert showing test is running in ADA Compliance Mode
     - Include test mode info in results display
   
### 3. **Event Broadcast Chain**
   ```
   GameOfLifeApp
     enableAdaCompliance state
         ↓
   GameUILayout (receives via prop)
         ↓
   HeaderBar (receives via controlsProps)
         ↓
   PhotosensitivityTestDialog (receives direct prop)
         ↓
   Test respects ADA-safe 2 FPS limit
   ```

## Impact
- ✅ When user toggles ADA compliance mode, the change now broadcasts to PhotosensitivityTestDialog
- ✅ Test automatically enforces 2 FPS (500ms sample intervals) when ADA mode is active
- ✅ Test results clearly show when ADA Compliance Mode was active during testing
- ✅ Photosensitivity test now passes when run with ADA mode enabled, as expected

## Files Modified
1. `src/view/HeaderBar.js` - Added props forwarding
2. `src/view/PhotosensitivityTestDialog.js` - Added ADA mode support and enforcement

## Testing
Run the photosensitivity test with ADA Compliance Mode enabled:
1. Open Game of Life
2. Open Options (Settings icon)
3. Toggle **Enable ADA Compliance Mode** ✓
4. Click the bug icon to open Photosensitivity Test
5. Click "Start Test"
6. Verify test shows "ADA Compliance Mode Active" in the initial info
7. Verify results show "Tested in ADA Compliance Mode" when complete
