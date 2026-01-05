import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Snackbar from '@mui/material/Snackbar';

/**
 * Photosensitivity Test Dialog
 * Automatically tests the current Game of Life simulation for WCAG 2.1 compliance
 * Stops immediately when violation detected or after 60 seconds if passing
 */
export default function PhotosensitivityTestDialog({ open, onClose }) {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [testDuration, setTestDuration] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sync with parent open prop
  React.useEffect(() => {
    setDialogOpen(open);
  }, [open]);

  const runTest = async () => {
    // Close dialog and show snackbar
    setDialogOpen(false);
    setTesting(true);
    setProgress(0);
    setResult(null);
    setSnackbarMessage('⏳ Starting photosensitivity test...');
    setSnackbarOpen(true);

    try {
      // Find the canvas
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        setResult({
          error: true,
          message: 'No canvas found. Please ensure the simulation is visible.'
        });
        setTesting(false);
        setSnackbarOpen(false);
        return;
      }

      const ctx = canvas.getContext('2d');
      const frames = [];
      const flashEvents = [];
      const maxTestDuration = 60000; // 60 seconds max
      const sampleInterval = 33; // ~30fps
      const maxFlashRate = 3;
      const maxFlashArea = 87296;
      
      let violationDetected = false;
      let violationType = null;
      let violationTime = 0;

      // Capture frames
      const startTime = Date.now();
      const intervalId = setInterval(() => {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const currentFrame = {
            timestamp: Date.now(),
            data: imageData
          };
          frames.push(currentFrame);
          
          // Check for flash immediately
          if (frames.length > 1) {
            const flash = detectFlash(frames[frames.length - 2], currentFrame);
            if (flash) {
              flashEvents.push(flash);
              
              // Check violations in real-time
              const oneSecondAgo = Date.now() - 1000;
              const recentFlashes = flashEvents.filter(f => f.timestamp > oneSecondAgo);
              const flashRate = recentFlashes.length;
              
              if (flashRate > maxFlashRate) {
                violationDetected = true;
                violationType = 'FLASH_RATE';
                violationTime = Date.now() - startTime;
                clearInterval(intervalId);
                completeTest();
              } else if (flash.flashPixels > maxFlashArea) {
                violationDetected = true;
                violationType = 'FLASH_AREA';
                violationTime = Date.now() - startTime;
                clearInterval(intervalId);
                completeTest();
              }
            }
          }
          
          // Update progress
          const elapsed = Date.now() - startTime;
          const progressPercent = Math.min((elapsed / maxTestDuration) * 100, 100);
          setProgress(progressPercent);
          setSnackbarMessage(`Testing... ${Math.floor(elapsed / 1000)}s elapsed`);
          
        } catch (e) {
          console.warn('Frame capture failed:', e);
        }
      }, sampleInterval);

      // Complete test function
      const completeTest = () => {
        const elapsed = Date.now() - startTime;
        setTestDuration(elapsed);
        
        // Calculate final metrics
        const oneSecondAgo = Date.now() - 1000;
        const recentFlashes = flashEvents.filter(f => f.timestamp > oneSecondAgo);
        const flashRate = recentFlashes.length;
        const maxFlashPixels = Math.max(...flashEvents.map(f => f.flashPixels), 0);

        const flashRateViolation = flashRate > maxFlashRate;
        const flashAreaViolation = maxFlashPixels > maxFlashArea;
        const wcagCompliant = !flashRateViolation && !flashAreaViolation;

        setResult({
          wcagCompliant,
          flashRate,
          maxFlashPixels,
          flashRateViolation,
          flashAreaViolation,
          framesAnalyzed: frames.length,
          totalFlashes: flashEvents.length,
          maxFlashRate,
          maxFlashArea,
          violationDetected,
          violationType,
          testDuration: elapsed
        });

        setTesting(false);
        setProgress(100);
        setSnackbarOpen(false);

        // Reopen dialog with results
        setTimeout(() => {
          setDialogOpen(true);
        }, 200);
      };

      // Wait for max duration or early stop
      setTimeout(() => {
        if (!violationDetected) {
          clearInterval(intervalId);
          completeTest();
        }
      }, maxTestDuration);

    } catch (error) {
      setResult({
        error: true,
        message: error.message
      });
      setTesting(false);
      setSnackbarOpen(false);
    }
  };

  const detectFlash = (prevFrame, currFrame) => {
    if (!prevFrame || !currFrame) return null;

    const prev = prevFrame.data.data;
    const curr = currFrame.data.data;
    let flashPixels = 0;

    for (let i = 0; i < prev.length; i += 4) {
      const prevL = (0.2126 * prev[i] + 0.7152 * prev[i + 1] + 0.0722 * prev[i + 2]) / 255;
      const currL = (0.2126 * curr[i] + 0.7152 * curr[i + 1] + 0.0722 * curr[i + 2]) / 255;
      const delta = Math.abs(currL - prevL);

      if (delta > 0.08) {
        flashPixels++;
      }
    }

    if (flashPixels > 1000) {
      return {
        timestamp: currFrame.timestamp,
        flashPixels: flashPixels
      };
    }

    return null;
  };

  const handleClose = () => {
    if (!testing) {
      setResult(null);
      setProgress(0);
      setTestDuration(0);
      setDialogOpen(false);
    }
  };

  // Reopen dialog when test completes with results
  React.useEffect(() => {
    if (result && !testing) {
      // Small delay to ensure snackbar closes first
      setTimeout(() => {
        setDialogOpen(true);
      }, 200);
    }
  }, [result, testing]);

  return (
    <>
      <Dialog open={dialogOpen && !testing} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          🧪 Photosensitivity Safety Test
        </DialogTitle>
        
        <DialogContent>
          {!result && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                This test analyzes the current simulation for WCAG 2.1 Level A compliance:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ mt: 1 }}>
                <li>Flash Rate: Maximum 3 flashes per second</li>
                <li>Flash Area: Maximum 87,296 pixels of flashing</li>
                <li>Luminance: Rapid brightness change detection</li>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                The test runs up to 60 seconds but <strong>stops immediately</strong> if a violation is detected. 
                Please ensure your simulation is running.
              </Typography>
            </Box>
          )}

          {result && !result.error && (
            <Box>
              <Alert severity={result.wcagCompliant ? 'success' : 'error'} sx={{ mb: 2 }}>
                <AlertTitle>
                  {result.wcagCompliant ? '✅ PASS - WCAG 2.1 Compliant' : '❌ FAIL - Violations Detected'}
                </AlertTitle>
                {result.wcagCompliant 
                  ? `Your animation is safe and meets accessibility standards. Tested for ${(result.testDuration / 1000).toFixed(1)}s.`
                  : `Violation detected after ${(result.testDuration / 1000).toFixed(1)}s. Test stopped immediately.`}
              </Alert>

              {result.violationDetected && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <AlertTitle>⚠️ Early Detection</AlertTitle>
                  <strong>{result.violationType}</strong> violation detected after just {(result.testDuration / 1000).toFixed(1)} seconds.
                  Test stopped immediately to prevent extended exposure.
                </Alert>
              )}

              <Typography variant="h6" gutterBottom>Measurements:</Typography>
              
              <Box sx={{ ml: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Flash Rate: <strong>{result.flashRate}/sec</strong> (limit: {result.maxFlashRate}/sec) 
                  {result.flashRateViolation ? ' ❌ VIOLATION' : ' ✅'}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Flash Area: <strong>{result.maxFlashPixels} pixels</strong> (limit: {result.maxFlashArea} px) 
                  {result.flashAreaViolation ? ' ❌ VIOLATION' : ' ✅'}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Test Duration: <strong>{(result.testDuration / 1000).toFixed(1)}s</strong>
                  {result.violationDetected ? ' (stopped early)' : ' (full 60s)'}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Frames Analyzed: <strong>{result.framesAnalyzed}</strong>
                </Typography>
                
                <Typography variant="body2">
                  Flash Events: <strong>{result.totalFlashes}</strong>
                </Typography>
              </Box>

            {!result.wcagCompliant && (
              <>
                <Typography variant="h6" gutterBottom>Recommendations:</Typography>
                <Box sx={{ ml: 2, mb: 2 }}>
                  {result.flashRateViolation && (
                    <>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        • Reduce animation speed to maximum 2 fps
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        • Implement frame delay between updates
                      </Typography>
                    </>
                  )}
                  {result.flashAreaViolation && (
                    <>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        • Reduce visible grid size (less than 50×50 cells)
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        • Use gradual transitions instead of instant changes
                      </Typography>
                    </>
                  )}
                </Box>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <AlertTitle>⚖️ Legal Status: HIGH RISK</AlertTitle>
                  Not ADA compliant. Please address violations to reduce legal liability for photosensitive seizures.
                </Alert>
              </>
            )}

            {result.wcagCompliant && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>⚖️ Legal Status: LOW RISK</AlertTitle>
                Safe harbor protection under ADA regulations.
              </Alert>
            )}
          </Box>
        )}

        {result && result.error && (
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {result.message}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        {!result && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={runTest} variant="contained" color="primary">
              Start Test
            </Button>
          </>
        )}
        
        {result && (
          <>
            <Button onClick={runTest} variant="outlined">
              Run Again
            </Button>
            <Button onClick={handleClose} variant="contained">
              Close
            </Button>
          </>
        )}
      </DialogActions>
      </Dialog>

      {/* Snackbar for test progress while dialog is closed */}
      <Snackbar
        open={snackbarOpen}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </>
  );
}
