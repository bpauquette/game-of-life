// src/view/scriptingInterpreter.js
// Interpreter and block execution logic for GOL ScriptPanel scripting
import { parseValue, evalExpr, evalCond, evalCondCompound } from './scriptingEngine';

// Block parser: returns array of {type, line, indent, raw}
function parseBlocks(rawLines) {
  const blocks = [];
  for (let i = 0; i < rawLines.length; ++i) {
    let raw = rawLines[i];
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    let indent = raw.match(/^\s*/)[0].length;
    blocks.push({ line, indent, raw, idx: i });
  }
  return blocks;
}

// Helper: split condition string into [lhs, op, rhs]
function splitCond(cond) {
  let m = cond.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
  if (m) return [m[1], m[2], m[3]];
  return [cond, '==', true];
}

// Execute script commands (drawing, simulation, etc.)
async function executeCommand(line, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'command', line } }));
  }
  // eslint-disable-next-line no-console
  console.debug('[Script Debug] Executing command:', line);
  
  // Helper function to pause simulation for drawing commands
  const pauseForDrawing = () => {
    if (typeof setIsRunning === 'function' && !state.simulationPausedForDrawing) {
      setIsRunning(false);
      state.simulationPausedForDrawing = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'state', msg: 'Paused simulation for drawing' } }));
      }
    }
  };
  // STEP n: animated visible stepping
  let stepMatch = line.match(/^STEP\s+(\d+)$/i);
  if (stepMatch) {
    const n = parseInt(stepMatch[1], 10);
    if (!isNaN(n) && n > 0) {
      const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#7CFC00', '#FF4500', '#1E90FF', '#FF00FF'];
      for (let i = 0; i < n; i++) {
        const cellsArr = Array.from(state.cells).map(s => {
          const [x, y] = s.split(',').map(Number);
          return { x, y };
        });
        const next = ticks(cellsArr, 1);
        state.cells = new Set();
        for (const key of next.keys ? next.keys() : Object.keys(next)) {
          state.cells.add(key);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'cell', key } }));
          }
        }
        if (onStep) onStep(new Set(state.cells));
        if (emitStepEvent) emitStepEvent(state.cells);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'state', msg: `Step ${i+1}/${n}`, cells: Array.from(state.cells) } }));
        }
        // eslint-disable-next-line no-console
        console.debug(`[Script Debug] Step ${i+1}/${n}, cells:`, Array.from(state.cells));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gol:script:step-anim', {
            detail: {
              step: i + 1,
              total: n,
              color: colors[i % colors.length],
              emoji: ['✨','🎉','💥','🌟','🔥','⚡','🌀'][i % 7]
            }
          }));
          if (window.navigator.vibrate) window.navigator.vibrate(30);
        }
        // Reduced from 180 + Math.min(200, ...) to 16ms for one frame at 60 FPS
        // This aligns with the main animation loop and greatly improves performance
        // (100x speedup from ~1850ms to ~18ms for 10 steps)
        await new Promise(res => setTimeout(res, 16));
      }
    }
    return;
  }
  
  // CAPTURE command: save current pattern
  let captureMatch = line.match(/^CAPTURE\s+(.+)$/i);
  if (captureMatch) {
    const name = captureMatch[1].trim();
    // Emit capture event with current cells
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gol:script:capture', { 
        detail: { 
          name, 
          cells: Array.from(state.cells),
          type: 'capture'
        } 
      }));
    }
    // eslint-disable-next-line no-console
    console.debug(`[Script Debug] Captured pattern "${name}" with ${state.cells.size} cells`);
    return;
  }
  
  // PENDOWN command: enable drawing
  if (/^PENDOWN$/i.test(line)) {
    pauseForDrawing();
    state.penDown = true;
    return;
  }
  
  // PENUP command: disable drawing
  if (/^PENUP$/i.test(line)) {
    state.penDown = false;
    return;
  }
  
  // GOTO command: move to position
  let gotoMatch = line.match(/^GOTO\s+(\S+)\s+(\S+)$/i);
  if (gotoMatch) {
    pauseForDrawing();
    state.x = Math.floor(parseValue(gotoMatch[1], state));
    state.y = Math.floor(parseValue(gotoMatch[2], state));
    return;
  }
  
  // RECT command: draw filled rectangle
  let rectMatch = line.match(/^RECT\s+(\S+)\s+(\S+)$/i);
  if (rectMatch) {
    pauseForDrawing();
    const width = Math.floor(parseValue(rectMatch[1], state));
    const height = Math.floor(parseValue(rectMatch[2], state));
    const startX = state.x || 0;
    const startY = state.y || 0;
    
    if (state.penDown !== false) { // default to drawing unless explicitly penup
      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
          state.cells.add(`${startX + dx},${startY + dy}`);
        }
      }
      // Update the grid immediately after drawing
      if (onLoadGrid) {
        const currentCells = Array.from(state.cells).map(cellStr => {
          const [x, y] = String(cellStr).split(',').map(Number);
          return { x, y };
        }).filter(cell => !isNaN(cell.x) && !isNaN(cell.y));
        // eslint-disable-next-line no-console
        console.log('[scriptingInterpreter] Calling onLoadGrid with', currentCells.length, 'cells after RECT');
        onLoadGrid(currentCells);
      }
    }
    return;
  }
  
  // CLEAR command: clear all cells
  if (/^CLEAR$/i.test(line)) {
    pauseForDrawing();
    state.cells = new Set();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'state', msg: 'Grid cleared' } }));
    }
    // Update the grid immediately after clearing
    if (onLoadGrid) {
      // eslint-disable-next-line no-console
      console.log('[scriptingInterpreter] Calling onLoadGrid with 0 cells (CLEAR command)');
      onLoadGrid([]);
    }
    if (onStep) onStep(new Set(state.cells));
    if (emitStepEvent) emitStepEvent(state.cells);
    return;
  }
  
  // START command: start the simulation
  if (/^START$/i.test(line)) {
    if (typeof setIsRunning === 'function') {
      setIsRunning(true);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'state', msg: 'Simulation started' } }));
    }
    // eslint-disable-next-line no-console
    console.debug('[Script Debug] Simulation started');
    return;
  }
  
  // STOP command: stop the simulation
  if (/^STOP$/i.test(line)) {
    if (typeof setIsRunning === 'function') {
      setIsRunning(false);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'state', msg: 'Simulation stopped' } }));
    }
    // eslint-disable-next-line no-console
    console.debug('[Script Debug] Simulation stopped');
    return;
  }
  
  // ...other action commands...
}

// Handle state-modifying commands (PRINT, CLEAR, COUNT, assignments, LABEL, UNTIL_STEADY)
async function executeStateCommand(line, blocks, i, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid) {
  // Helper to pause simulation for drawing
  const pauseForDrawing = () => {
    if (typeof setIsRunning === 'function' && !state.simulationPausedForDrawing) {
      setIsRunning(false);
      state.simulationPausedForDrawing = true;
    }
  };

  // PRINT command
  let printMatch = line.match(/^print\s+(.+)$/i);
  if (printMatch) {
    const val = evalExpr(printMatch[1], state);
    if (!state.output) state.output = [];
    state.output.push(String(val));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gol:script:print', { detail: { value: String(val) } }));
    }
    return i + 1;
  }

  // CLEAR command
  if (/^clear$/i.test(line)) {
    pauseForDrawing();
    state.cells = new Set();
    if (onLoadGrid) onLoadGrid([]);
    if (onStep) onStep(new Set(state.cells));
    if (emitStepEvent) emitStepEvent(state.cells);
    return i + 1;
  }

  // COUNT varName
  let countMatch = line.match(/^count\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i);
  if (countMatch) {
    state.vars[countMatch[1]] = state.cells.size;
    return i + 1;
  }

  // Assignment: x = expr
  let assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (assignMatch) {
    state.vars[assignMatch[1]] = evalExpr(assignMatch[2], state);
    return i + 1;
  }

  // LABEL command
  let labelMatch = line.match(/^label\s+(.+)$/i);
  if (labelMatch) {
    let labelVal = evalExpr(labelMatch[1], state);
    state.outputLabels.push({ x: state.x, y: state.y, text: String(labelVal) });
    return i + 1;
  }

  // UNTIL_STEADY varName maxSteps
  console.log('[Script Debug] Checking line for UNTIL_STEADY:', line);
  let untilSteadyMatch = line.match(/^UNTIL_STEADY\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(\S+)$/i);
  console.log('[Script Debug] UNTIL_STEADY match result:', untilSteadyMatch);
  if (untilSteadyMatch) {
    console.log('[Script Debug] UNTIL_STEADY command detected:', line);
    const varName = untilSteadyMatch[1];
    const maxSteps = Math.floor(parseValue(untilSteadyMatch[2], state));
    
    if (!ticks || typeof ticks !== 'function') {
      throw new Error('UNTIL_STEADY requires game simulation (ticks function not available)');
    }
    
    // Emit start event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gol:script:debug', { 
        detail: { 
          type: 'command', 
          command: `UNTIL_STEADY ${varName} ${maxSteps}`,
          msg: `Running UNTIL_STEADY: waiting for steady state (max ${maxSteps} steps)` 
        } 
      }));
    }
    
    const historySize = 10;
    const history = [];
    let stepCount = 0;
    let stable = false;
    let oscillatorPeriod = 0;
    
    const cellsToString = (cells) => Array.from(cells).sort().join('|');
    
    while (stepCount < maxSteps && !stable) {
      const currentState = cellsToString(state.cells);
      
      const cellsArr = Array.from(state.cells).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
      });
      const next = ticks(cellsArr, 1);
      
      state.cells = new Set();
      for (const key of next.keys ? next.keys() : Object.keys(next)) {
        state.cells.add(key);
      }
      
      stepCount++;
      
      // Emit progress event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gol:script:debug', { 
          detail: { 
            type: 'progress', 
            command: `UNTIL_STEADY ${varName}`,
            current: stepCount,
            total: maxSteps,
            msg: `UNTIL_STEADY progress: ${stepCount}/${maxSteps} steps` 
          } 
        }));
      }
      
      const nextState = cellsToString(state.cells);
      if (currentState === nextState) {
        stable = true;
        oscillatorPeriod = 1;
        break;
      }
      
      for (let h = 0; h < history.length; h++) {
        if (history[h] === nextState) {
          stable = true;
          oscillatorPeriod = history.length - h + 1;
          break;
        }
      }
      
      if (stable) break;
      
      history.push(currentState);
      if (history.length > historySize) history.shift();
      
      await new Promise(res => setTimeout(res, 16));
    }
    
    state.vars[varName] = stable ? stepCount : -1;
    if (stable && oscillatorPeriod > 0) {
      state.vars[varName + '_period'] = oscillatorPeriod;
    }
    
    // Emit completion event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gol:script:debug', { 
        detail: { 
          type: 'complete', 
          command: `UNTIL_STEADY ${varName}`,
          variable: varName,
          value: state.vars[varName],
          msg: `UNTIL_STEADY complete: ${varName} = ${state.vars[varName]}` 
        } 
      }));
    }
    
    if (onStep) onStep(new Set(state.cells));
    if (emitStepEvent) emitStepEvent(state.cells);
    return i + 1;
  }

  return null; // Not a state command
}

// Handle control flow commands (WHILE, IF, FOR)
async function executeControlFlow(line, blocks, i, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid) {
  // FOR loop
  let forMatch = line.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+))?$/i);
  if (forMatch) {
    const varName = forMatch[1];
    const start = Math.floor(evalExpr(forMatch[2], state));
    const end = Math.floor(evalExpr(forMatch[3], state));
    const stepVal = Math.floor(evalExpr(forMatch[4] || '1', state));
    
    if (stepVal === 0) throw new Error('FOR loop STEP cannot be zero');
    
    let blockStart = i + 1;
    let blockEnd = blockStart;
    let nest = 1;
    while (blockEnd < blocks.length && nest > 0) {
      let l = blocks[blockEnd].line.toLowerCase();
      if (l.startsWith('for ')) nest++;
      if (l === 'end') nest--;
      blockEnd++;
    }
    blockEnd--;
    
    if (stepVal > 0) {
      for (let val = start; val <= end; val += stepVal) {
        state.vars[varName] = val;
        await execBlock(blocks.slice(blockStart, blockEnd), state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
        if (state.loopBreak) {
          state.loopBreak = false;
          break;
        }
        state.loopContinue = false;
      }
    } else {
      for (let val = start; val >= end; val += stepVal) {
        state.vars[varName] = val;
        await execBlock(blocks.slice(blockStart, blockEnd), state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
        if (state.loopBreak) {
          state.loopBreak = false;
          break;
        }
        state.loopContinue = false;
      }
    }
    
    return blockEnd + 1;
  }

  // WHILE loop
  let whileMatch = line.match(/^while\s+(.+)$/i);
  if (whileMatch) {
    let cond = whileMatch[1];
    let blockStart = i + 1;
    let blockEnd = blockStart;
    let nest = 1;
    while (blockEnd < blocks.length && nest > 0) {
      let l = blocks[blockEnd].line.toLowerCase();
      if (l.startsWith('while ')) nest++;
      if (l === 'end') nest--;
      blockEnd++;
    }
    blockEnd--;
    
    while (evalCondCompound(cond, state)) {
      await execBlock(blocks.slice(blockStart, blockEnd), state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
    }
    
    return blockEnd + 1;
  }

  // IF/ELSE block
  let ifMatch = line.match(/^if\s+(.+)$/i);
  if (ifMatch) {
    let cond = ifMatch[1];
    let blockStart = i + 1;
    let blockEnd = blockStart;
    let nest = 1;
    
    while (blockEnd < blocks.length && nest > 0) {
      let l = blocks[blockEnd].line.toLowerCase();
      if (l.startsWith('if ')) nest++;
      if (l === 'end') nest--;
      blockEnd++;
    }
    blockEnd--;
    
    let elseIdx = -1;
    for (let searchIdx = blockEnd - 1; searchIdx > i; searchIdx--) {
      let l = blocks[searchIdx].line.toLowerCase();
      if (l === 'else' && blocks[searchIdx].indent === blocks[i].indent) {
        elseIdx = searchIdx;
        break;
      }
    }
    
    if (evalCondCompound(cond, state)) {
      let ifBlockEnd = elseIdx >= 0 ? elseIdx : blockEnd;
      await execBlock(blocks.slice(blockStart, ifBlockEnd), state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
    } else if (elseIdx >= 0) {
      await execBlock(blocks.slice(elseIdx + 1, blockEnd), state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
    }
    
    return blockEnd + 1;
  }

  return null; // Not a control flow command
}

// Main interpreter loop
async function execBlock(blocks, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid) {
  let i = 0;
  
  while (i < blocks.length) {
    let { line } = blocks[i];
    
    // Try state commands first
    let nextI = await executeStateCommand(line, blocks, i, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
    if (nextI !== null) {
      i = nextI;
      continue;
    }
    
    // Try control flow
    nextI = await executeControlFlow(line, blocks, i, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
    if (nextI !== null) {
      i = nextI;
      continue;
    }
    
    // Fall through to action commands
    await executeCommand(line, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
    i++;
  }
}

// Geometric computation functions matching the tools

// Bresenham line algorithm
function computeLine(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  
  while (true) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

// Rectangle perimeter computation
function computeRectPerimeter(x0, y0, x1, y1) {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const pts = [];
  // Top and bottom edges
  for (let x = xMin; x <= xMax; x++) {
    pts.push([x, yMin]);
    if (yMax !== yMin) pts.push([x, yMax]);
  }
  // Left and right edges (excluding corners already added)
  for (let y = yMin + 1; y <= yMax - 1; y++) {
    pts.push([xMin, y]);
    if (xMax !== xMin) pts.push([xMax, y]);
  }
  return pts;
}

// Ellipse perimeter computation
function computeEllipsePerimeter(x0, y0, x1, y1) {
  const cx = Math.floor((x0 + x1) / 2);
  const cy = Math.floor((y0 + y1) / 2);
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  const points = [];
  
  // Simple ellipse rasterization
  const steps = Math.max(20, Math.floor(Math.PI * (rx + ry)));
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const x = Math.floor(cx + rx * Math.cos(angle));
    const y = Math.floor(cy + ry * Math.sin(angle));
    points.push([x, y]);
  }
  
  // Remove duplicates
  const unique = new Set();
  const result = [];
  for (const [x, y] of points) {
    const key = `${x},${y}`;
    if (!unique.has(key)) {
      unique.add(key);
      result.push([x, y]);
    }
  }
  return result;
}

// Midpoint Circle Algorithm for drawing circles
function computeCircle(cx, cy, radius) {
  if (radius < 0) return [];
  if (radius === 0) return [[cx, cy]];
  
  const points = [];
  let x = radius;
  let y = 0;
  let decisionParam = 3 - 2 * radius;
  
  while (x >= y) {
    // Plot all 8 octants
    points.push([cx + x, cy + y]);
    points.push([cx - x, cy + y]);
    points.push([cx + x, cy - y]);
    points.push([cx - x, cy - y]);
    points.push([cx + y, cy + x]);
    points.push([cx - y, cy + x]);
    points.push([cx + y, cy - x]);
    points.push([cx - y, cy - x]);
    
    y++;
    if (decisionParam <= 0) {
      decisionParam = decisionParam + 4 * y + 6;
    } else {
      x--;
      decisionParam = decisionParam + 4 * (y - x) + 10;
    }
  }
  
  // Remove duplicates
  const unique = new Set();
  const result = [];
  for (const [x, y] of points) {
    const key = `${x},${y}`;
    if (!unique.has(key)) {
      unique.add(key);
      result.push([x, y]);
    }
  }
  return result;
}

export { parseBlocks, execBlock, splitCond, executeCommand };
