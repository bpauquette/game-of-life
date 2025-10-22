import React, { useState, useEffect, useRef } from 'react';

const DebugConsole = ({ isVisible = true, maxLines = 100 }) => {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const textAreaRef = useRef(null);
  const originalConsole = useRef({});

  useEffect(() => {
    // Store original console methods
    originalConsole.current = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };

    // Create logging function
    const createLogger = (level, originalMethod) => {
      return (...args) => {
        // Call original console method
        originalMethod.apply(console, args);
        
        // Add to our log display
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        setLogs(prevLogs => {
          const newLogs = [...prevLogs, { 
            level, 
            message, 
            timestamp,
            id: Date.now() + Math.random()
          }];
          
          // Keep only the most recent maxLines
          if (newLogs.length > maxLines) {
            return newLogs.slice(-maxLines);
          }
          return newLogs;
        });
      };
    };

    // Override console methods
    console.log = createLogger('log', originalConsole.current.log);
    console.warn = createLogger('warn', originalConsole.current.warn);
    console.error = createLogger('error', originalConsole.current.error);
    console.info = createLogger('info', originalConsole.current.info);

    // Cleanup function
    return () => {
      // Restore original console methods
      console.log = originalConsole.current.log;
      console.warn = originalConsole.current.warn;
      console.error = originalConsole.current.error;
      console.info = originalConsole.current.info;
    };
  }, [maxLines]);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-of-life-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  const getLogColor = (level) => {
    switch (level) {
      case 'error': return '#ff6b6b';
      case 'warn': return '#ffd93d';
      case 'info': return '#74c0fc';
      default: return '#ffffff';
    }
  };

  const logText = logs.map(log => 
    `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
  ).join('\n');

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1a1a1a',
      border: '1px solid #444',
      borderBottom: 'none',
      zIndex: 1000,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #444',
        cursor: 'pointer'
      }} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ color: '#ffffff' }}>
          <span>🔧 Debug Console</span>
          <span style={{ marginLeft: '8px', color: '#888' }}>
            ({logs.length} logs)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              backgroundColor: '#444',
              color: '#fff',
              border: '1px solid #666',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              exportLogs();
            }}
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              backgroundColor: '#444',
              color: '#fff',
              border: '1px solid #666',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            Export
          </button>
          <span style={{ 
            color: '#888', 
            fontSize: '10px',
            alignSelf: 'center'
          }}>
            {isExpanded ? '▼' : '▲'}
          </span>
        </div>
      </div>

      {/* Console Content */}
      {isExpanded && (
        <div style={{ height: '200px' }}>
          <textarea
            ref={textAreaRef}
            value={logText}
            readOnly
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: 'none',
              padding: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              resize: 'none',
              outline: 'none',
              overflowY: 'scroll'
            }}
            placeholder="Console logs will appear here..."
          />
        </div>
      )}

      {/* Compact view when collapsed */}
      {!isExpanded && logs.length > 0 && (
        <div style={{
          padding: '4px 8px',
          maxHeight: '40px',
          overflow: 'hidden'
        }}>
          <div style={{
            color: getLogColor(logs[logs.length - 1]?.level),
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {logs[logs.length - 1]?.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugConsole;