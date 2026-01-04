import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

/**
 * ScriptExecutionHUD - Semi-transparent overlay showing real-time script execution status
 * Displays: current command, variables, progress, loop context
 */
function ScriptExecutionHUD() {
  const [hudData, setHudData] = useState({
    visible: false,
    currentLine: '',
    variables: {},
    context: '', // Loop/block context
    progress: null, // { current, total, label } for operations like UNTIL_STEADY
    loopDepth: 0
  });

  useEffect(() => {
    function onScriptDebug(event) {
      const detail = event.detail;
      
      if (detail.type === 'command') {
        // Command starting (e.g., UNTIL_STEADY)
        setHudData(prev => ({
          ...prev,
          visible: true,
          currentLine: detail.command || detail.msg
        }));
      } else if (detail.type === 'state') {
        // State change (CLEAR, START, STOP)
        setHudData(prev => ({
          ...prev,
          context: detail.msg,
          ...(detail.variables && { variables: detail.variables })
        }));
      } else if (detail.type === 'progress') {
        // Progress update (UNTIL_STEADY steps)
        setHudData(prev => ({
          ...prev,
          currentLine: detail.command || 'Running...',
          progress: {
            current: detail.current,
            total: detail.total,
            label: detail.msg || `Progress: ${detail.current}/${detail.total}`
          }
        }));
      } else if (detail.type === 'complete') {
        // Command completed
        setHudData(prev => ({
          ...prev,
          context: detail.msg,
          progress: null
        }));
      }
    }

    function onScriptStart(event) {
      const detail = event.detail;
      setHudData(prev => ({ 
        ...prev, 
        visible: true,
        context: 'Script started...',
        currentLine: detail.script ? detail.script.substring(0, 40) + '...' : 'Running script'
      }));
    }

    function onScriptEnd(event) {
      const detail = event.detail;
      setTimeout(() => {
        setHudData(prev => ({ 
          ...prev, 
          visible: false,
          context: detail.status === 'error' ? `Error: ${detail.error}` : 'Script completed'
        }));
      }, 500);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('gol:script:debug', onScriptDebug);
      window.addEventListener('gol:script:start', onScriptStart);
      window.addEventListener('gol:script:end', onScriptEnd);

      return () => {
        window.removeEventListener('gol:script:debug', onScriptDebug);
        window.removeEventListener('gol:script:start', onScriptStart);
        window.removeEventListener('gol:script:end', onScriptEnd);
      };
    }
  }, []);

  if (!hudData.visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        left: 16,
        backgroundColor: alpha('#000000', 0.75),
        color: '#e5e7eb',
        padding: '12px 16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '400px',
        border: '1px solid ' + alpha('#4f46e5', 0.5),
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      {/* Current Command */}
      {hudData.currentLine && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: '#a5f3fc', mb: 0.5 }}>
            Executing:
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '12px',
              color: '#86efac',
              fontWeight: 'bold',
              wordBreak: 'break-word'
            }}
          >
            {hudData.currentLine}
          </Typography>
        </Box>
      )}

      {/* Context */}
      {hudData.context && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: '#fbbf24' }}>
            {hudData.context}
          </Typography>
        </Box>
      )}

      {/* Progress Bar */}
      {hudData.progress && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: '#f472b6', mb: 0.5 }}>
            {hudData.progress.label || 'Progress'}
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: '4px',
              backgroundColor: alpha('#4f46e5', 0.3),
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(hudData.progress.current / hudData.progress.total) * 100}%`,
                backgroundColor: '#f472b6',
                transition: 'width 0.1s ease-out'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ fontSize: '10px', color: '#cbd5f5', mt: 0.5 }}>
            {hudData.progress.current} / {hudData.progress.total}
          </Typography>
        </Box>
      )}

      {/* Variables */}
      {Object.keys(hudData.variables).length > 0 && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid ' + alpha('#4f46e5', 0.5) }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: '#a5f3fc', mb: 0.5 }}>
            Variables:
          </Typography>
          {Object.entries(hudData.variables).map(([key, value]) => (
            <Typography
              key={key}
              variant="body2"
              sx={{ fontSize: '11px', color: '#d1d5db' }}
            >
              {key} = <span style={{ color: '#fbbf24' }}>{String(value)}</span>
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default ScriptExecutionHUD;
