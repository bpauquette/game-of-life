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

// Legacy command handler (for all non-block/assignment/label lines)
async function legacyCommand(line, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'legacy', line } }));
  }
  // eslint-disable-next-line no-console
  console.debug('[Script Debug] Legacy command:', line);
  
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
        emitStepEvent(state.cells);
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
        await new Promise(res => setTimeout(res, 180 + Math.min(200, 1000 / (i + 1))));
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
    emitStepEvent(state.cells);
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
  
  // ...other legacy commands...
}

// Main interpreter loop (with block stack)
function execBlock(blocks, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid) {
  let i = 0;
  
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
  
  while (i < blocks.length) {
    let { line } = blocks[i];
    // PRINT command
    let printMatch = line.match(/^print\s+(.+)$/i);
    if (printMatch) {
      const val = evalExpr(printMatch[1], state);
      if (!state.output) state.output = [];
      state.output.push(String(val));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gol:script:print', { detail: { value: String(val) } }));
      }
      i++;
      continue;
    }
    // CLEAR command
    if (/^clear$/i.test(line)) {
      pauseForDrawing();
      state.cells = new Set();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gol:script:debug', { detail: { type: 'state', msg: 'Grid cleared', idx: i } }));
      }
      // Update the grid immediately after clearing
      if (onLoadGrid) {
        onLoadGrid([]);
      }
      if (onStep) onStep(new Set(state.cells));
      emitStepEvent(state.cells);
      i++;
      continue;
    }
    // COUNT varName
    let countMatch = line.match(/^count\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i);
    if (countMatch) {
      const vname = countMatch[1];
      state.vars[vname] = state.cells.size;
      i++;
      continue;
    }
    // Assignment: x = expr or name = "str"
    let assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (assignMatch) {
      let vname = assignMatch[1];
      let expr = assignMatch[2];
      state.vars[vname] = evalExpr(expr, state);
      i++;
      continue;
    }
    // while loop
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
        execBlock(blocks.slice(blockStart, blockEnd), state, onStep, emitStepEvent, step, ticks);
      }
      i = blockEnd + 1;
      continue;
    }
    // if block (with optional else)
    let ifMatch = line.match(/^if\s+(.+)$/i);
    if (ifMatch) {
      let cond = ifMatch[1];
      let blockStart = i + 1;
      let blockEnd = blockStart;
      let nest = 1;
      
      // Find the matching END for this IF
      while (blockEnd < blocks.length && nest > 0) {
        let l = blocks[blockEnd].line.toLowerCase();
        if (l.startsWith('if ')) nest++;
        if (l === 'end') nest--;
        blockEnd++;
      }
      blockEnd--; // Now points to END token
      
      // Look for ELSE at the same nesting level as IF
      // Search backwards from END to find ELSE at IF's indent level
      let elseIdx = -1;
      for (let searchIdx = blockEnd - 1; searchIdx > i; searchIdx--) {
        let l = blocks[searchIdx].line.toLowerCase();
        if (l === 'else' && blocks[searchIdx].indent === blocks[i].indent) {
          elseIdx = searchIdx;
          break;
        }
      }
      
      // Execute appropriate block
      if (evalCondCompound(cond, state)) {
        // Execute IF block (from blockStart to elseIdx if else exists, else to blockEnd)
        let ifBlockEnd = elseIdx >= 0 ? elseIdx : blockEnd;
        execBlock(blocks.slice(blockStart, ifBlockEnd), state, onStep, emitStepEvent, step, ticks);
      } else if (elseIdx >= 0) {
        // Execute ELSE block (from elseIdx + 1 to blockEnd)
        execBlock(blocks.slice(elseIdx + 1, blockEnd), state, onStep, emitStepEvent, step, ticks);
      }
      
      i = blockEnd + 1;
      continue;
    }
    // LINE command
    let lineMatch = line.match(/^line\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/i);
    if (lineMatch) {
      pauseForDrawing();
      const x1 = Math.floor(parseValue(lineMatch[1], state));
      const y1 = Math.floor(parseValue(lineMatch[2], state));
      const x2 = Math.floor(parseValue(lineMatch[3], state));
      const y2 = Math.floor(parseValue(lineMatch[4], state));
      const points = computeLine(x1, y1, x2, y2);
      for (const [x, y] of points) {
        state.cells.add(`${x},${y}`);
      }
      i++;
      continue;
    }
    // OVAL command
    let ovalMatch = line.match(/^oval\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/i);
    if (ovalMatch) {
      pauseForDrawing();
      const x1 = Math.floor(parseValue(ovalMatch[1], state));
      const y1 = Math.floor(parseValue(ovalMatch[2], state));
      const x2 = Math.floor(parseValue(ovalMatch[3], state));
      const y2 = Math.floor(parseValue(ovalMatch[4], state));
      const points = computeEllipsePerimeter(x1, y1, x2, y2);
      for (const [x, y] of points) {
        state.cells.add(`${x},${y}`);
      }
      i++;
      continue;
    }
    // RECTPERIMETER command
    let rectPerimMatch = line.match(/^rectperimeter\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/i);
    if (rectPerimMatch) {
      const x1 = Math.floor(parseValue(rectPerimMatch[1], state));
      const y1 = Math.floor(parseValue(rectPerimMatch[2], state));
      const x2 = Math.floor(parseValue(rectPerimMatch[3], state));
      const y2 = Math.floor(parseValue(rectPerimMatch[4], state));
      const points = computeRectPerimeter(x1, y1, x2, y2);
      for (const [x, y] of points) {
        state.cells.add(`${x},${y}`);
      }
      i++;
      continue;
    }
    // SQUARE command (perimeter only)
    let squareMatch = line.match(/^square\s+(\S+)$/i);
    if (squareMatch) {
      const size = Math.floor(parseValue(squareMatch[1], state));
      const x1 = state.x || 0;
      const y1 = state.y || 0;
      const x2 = x1 + size;
      const y2 = y1 + size;
      const points = computeRectPerimeter(x1, y1, x2, y2);
      for (const [x, y] of points) {
        state.cells.add(`${x},${y}`);
      }
      i++;
      continue;
    }
    // CIRCLE command (with radius only - uses current position)
    let circleMatch1 = line.match(/^circle\s+(\S+)$/i);
    if (circleMatch1) {
      pauseForDrawing();
      const radius = Math.floor(parseValue(circleMatch1[1], state));
      const cx = state.x || 0;
      const cy = state.y || 0;
      const points = computeCircle(cx, cy, radius);
      for (const [x, y] of points) {
        state.cells.add(`${x},${y}`);
      }
      i++;
      continue;
    }
    // CIRCLE command (with x, y, radius)
    let circleMatch2 = line.match(/^circle\s+(\S+)\s+(\S+)\s+(\S+)$/i);
    if (circleMatch2) {
      pauseForDrawing();
      const cx = Math.floor(parseValue(circleMatch2[1], state));
      const cy = Math.floor(parseValue(circleMatch2[2], state));
      const radius = Math.floor(parseValue(circleMatch2[3], state));
      const points = computeCircle(cx, cy, radius);
      for (const [x, y] of points) {
        state.cells.add(`${x},${y}`);
      }
      i++;
      continue;
    }
    // RANDRECT command
    let randRectMatch = line.match(/^randrect\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/i);
    if (randRectMatch) {
      const minW = Math.floor(parseValue(randRectMatch[1], state));
      const maxW = Math.floor(parseValue(randRectMatch[2], state));
      const minH = Math.floor(parseValue(randRectMatch[3], state));
      const maxH = Math.floor(parseValue(randRectMatch[4], state));
      const count = randRectMatch[5] ? Math.floor(parseValue(randRectMatch[5], state)) : 1;
      const baseX = state.x || 0;
      const baseY = state.y || 0;
      for (let i = 0; i < count; i++) {
        const w = minW + Math.floor(Math.random() * (maxW - minW + 1));
        const h = minH + Math.floor(Math.random() * (maxH - minH + 1));
        const offsetX = Math.floor(Math.random() * 20) - 10;
        const offsetY = Math.floor(Math.random() * 20) - 10;
        for (let dx = 0; dx < w; dx++) {
          for (let dy = 0; dy < h; dy++) {
            if (Math.random() < 0.5) {
              state.cells.add(`${baseX + offsetX + dx},${baseY + offsetY + dy}`);
            }
          }
        }
      }
      i++;
      continue;
    }
    // LABEL command
    let labelMatch = line.match(/^label\s+(.+)$/i);
    if (labelMatch) {
      let labelVal = evalExpr(labelMatch[1], state);
      state.outputLabels.push({ x: state.x, y: state.y, text: String(labelVal) });
      i++;
      continue;
    }
    // All other commands: fall through to legacy parser
    legacyCommand(line, state, onStep, emitStepEvent, step, ticks, setIsRunning, onLoadGrid);
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

export { parseBlocks, execBlock, splitCond, legacyCommand };
