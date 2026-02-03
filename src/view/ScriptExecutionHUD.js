import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
// Removed unused alpha import

/**
 * ScriptExecutionHUD - Semi-transparent overlay showing real-time script execution status
 * Displays: current command, variables, progress, loop context
 */
function ScriptExecutionHUD() {
  const dismissedRef = useRef(false);

  const [hudData, setHudData] = useState({
    visible: false,
    dismissedUntilNextStart: false,
    currentLine: '',
    variables: {},
    context: '', // Loop/block context
    progress: null, // { current, total, label } for operations like UNTIL_STEADY
    loopDepth: 0,
    log: [] // rolling command log
  });

  const handleClose = () => {
    if (typeof globalThis !== 'undefined') {
      const event = new CustomEvent('gol:script:stop', { detail: { reason: 'user' } });
      globalThis.dispatchEvent(event);
    }
    dismissedRef.current = true;
    setHudData(prev => ({ ...prev, visible: false, dismissedUntilNextStart: true }));
  };

  useEffect(() => {
    function onScriptDebug(event) {
      const detail = event.detail;
      
      if (detail.type === 'command') {
        if (dismissedRef.current) return;
        // Command starting (e.g., UNTIL_STEADY)
        setHudData(prev => ({
          ...prev,
          visible: true,
          currentLine: detail.command || detail.msg || detail.line,
          log: [...prev.log, detail.line || detail.command || detail.msg || ''].slice(-200)
        }));
      } else if (detail.type === 'state') {
        if (dismissedRef.current) return;
        // State change (CLEAR, START, STOP)
        setHudData(prev => ({
          ...prev,
          context: detail.msg,
          ...(detail.variables && { variables: detail.variables }),
          log: [...prev.log, detail.msg || 'state change'].slice(-200)
        }));
      } else if (detail.type === 'progress') {
        if (dismissedRef.current) return;
        // Progress update (UNTIL_STEADY steps)
        setHudData(prev => ({
          ...prev,
          currentLine: detail.command || 'Running...',
          progress: {
            current: detail.current,
            total: detail.total,
            label: detail.msg || `Progress: ${detail.current}/${detail.total}`
          },
          log: [...prev.log, detail.msg || `Progress ${detail.current}/${detail.total}`].slice(-200)
        }));
      } else if (detail.type === 'complete') {
        if (dismissedRef.current) return;
        // Command completed
        setHudData(prev => ({
          ...prev,
          context: detail.msg,
          progress: null,
          log: [...prev.log, detail.msg || 'Command complete'].slice(-200)
        }));
      }
    }

    function onScriptStart(event) {
      const detail = event.detail;
      dismissedRef.current = false;
      setHudData(prev => ({ 
        ...prev, 
        visible: true,
        dismissedUntilNextStart: false,
        context: 'Script started...',
        currentLine: detail.script ? detail.script.substring(0, 40) + '...' : 'Running script',
        log: detail.script ? [...prev.log, `Start: ${detail.script.substring(0, 120)}`].slice(-200) : prev.log
      }));
    }

    function onScriptEnd(event) {
      const detail = event.detail;
      setTimeout(() => {
        setHudData(prev => ({ 
          ...prev, 
          visible: false,
          context: detail.status === 'error' ? `Error: ${detail.error}` : 'Script completed',
          log: [...prev.log, detail.status === 'error' ? `Error: ${detail.error}` : 'Script completed'].slice(-200)
        }));
      }, 500);
    }

    if (typeof globalThis === 'undefined') return undefined;

    globalThis.addEventListener('gol:script:debug', onScriptDebug);
    globalThis.addEventListener('gol:script:start', onScriptStart);
    globalThis.addEventListener('gol:script:end', onScriptEnd);

    return () => {
      globalThis.removeEventListener('gol:script:debug', onScriptDebug);
      globalThis.removeEventListener('gol:script:start', onScriptStart);
      globalThis.removeEventListener('gol:script:end', onScriptEnd);
    };
  }, []);

  if (!hudData.visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        left: 16,
        backgroundColor: 'var(--surface-2)',
        color: 'var(--text-primary)',
        padding: '12px 16px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        width: '480px',
        border: '1px solid var(--border-strong)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'var(--shadow-elevated)',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
    >
      {/* Close Button */}
      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        <button
          onClick={handleClose}
          style={{
            background: 'var(--surface-3)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            zIndex: 1100
          }}
          title="Stop Script and Close"
        >
          ×
        </button>
      </Box>
      {/* Current Command */}
      {hudData.currentLine && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: 'var(--accent-info)', mb: 0.5 }}>
            Executing:
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '12px',
              color: 'var(--accent-success)',
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
          <Typography variant="body2" sx={{ fontSize: '11px', color: 'var(--accent-warning)' }}>
            {hudData.context}
          </Typography>
        </Box>
      )}

      {/* Progress Bar */}
      {hudData.progress && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: 'var(--accent-secondary)', mb: 0.5 }}>
            {hudData.progress.label || 'Progress'}
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: '4px',
              backgroundColor: 'var(--progress-track)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(hudData.progress.current / hudData.progress.total) * 100}%`,
                backgroundColor: 'var(--progress-fill)',
                transition: 'width 0.1s ease-out'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ fontSize: '10px', color: 'var(--text-secondary)', mt: 0.5 }}>
            {hudData.progress.current} / {hudData.progress.total}
          </Typography>
        </Box>
      )}

      {/* Variables */}
      {Object.keys(hudData.variables).length > 0 && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid var(--border-subtle)' }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: 'var(--accent-info)', mb: 0.5 }}>
            Variables:
          </Typography>
          {Object.entries(hudData.variables).map(([key, value]) => (
            <Typography
              key={key}
              variant="body2"
              sx={{ fontSize: '11px', color: 'var(--text-secondary)' }}
            >
              {key} = <span style={{ color: 'var(--accent-warning)' }}>{String(value)}</span>
            </Typography>
          ))}
        </Box>
      )}

      {/* Command Log */}
      {hudData.log.length > 0 && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid var(--border-subtle)' }}>
          <Typography variant="body2" sx={{ fontSize: '11px', color: 'var(--accent-info)', mb: 0.5 }}>
            Command Log:
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              height: 260,
              overflowY: 'auto',
              backgroundColor: 'var(--surface-3)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap'
            }}
          >
            {hudData.log.map((line, idx) => `${idx + 1}: ${line}`).join('\n')}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default ScriptExecutionHUD;
