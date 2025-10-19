// chunkedGameState.js
import { useState, useRef, useCallback } from 'react';
import { step as gameStep } from './gameLogic';
// frontend shapes module removed; shapes may be provided as objects via selectedShape

const CHUNK_SIZE = 64;
const DEFAULT_CELL_SIZE = 20;
const DEFAULT_RANDOMIZE_AREA_SIZE = 20;
const RANDOMIZATION_PROBABILITY = 0.5;
const DEFAULT_COORDINATE = 0;

function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

function getChunkCoords(x, y) {
  return [Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE)];
}

export function useChunkedGameState() {
  // Standard UI state
  const [isRunning, setIsRunning] = useState(false);
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);
  const [selectedShape, setSelectedShape] = useState(null);
  const [chunks, setChunks] = useState(new Map()); // reactive for tests
  const chunksRef = useRef(chunks);               // fast access for GameOfLife


  const offsetRef = useRef({ x: DEFAULT_COORDINATE, y: DEFAULT_COORDINATE });

  // Get all live cells as "x,y" => true
  const getLiveCells = useCallback(() => {
    const map = new Map();
    for (const [key, cellSet] of chunksRef.current.entries()) {
      const [cx, cy] = key.split(',').map(Number);
      for (const cellKey of cellSet) {
        const [lx, ly] = cellKey.split(',').map(Number);
        const x = cx * CHUNK_SIZE + lx;
        const y = cy * CHUNK_SIZE + ly;
        map.set(`${x},${y}`, true);
      }
    }
    return map;
  }, []);

  const setCellAlive = useCallback((x, y, alive) => {
    const [cx, cy] = getChunkCoords(x, y);
    const key = chunkKey(cx, cy);
    const lx = x - cx * CHUNK_SIZE;
    const ly = y - cy * CHUNK_SIZE;

    const newChunks = new Map(chunksRef.current);
    let cellSet = newChunks.get(key);

    if (!cellSet && alive) {
      cellSet = new Set();
      newChunks.set(key, cellSet);
    }

    if (alive) {
      cellSet.add(`${lx},${ly}`);
    } else if (cellSet) {
      cellSet.delete(`${lx},${ly}`);
      if (cellSet.size === 0) newChunks.delete(key);
    }

    chunksRef.current = newChunks;
    setChunks(newChunks)
  }, []);

  const toggleCell = useCallback((x, y) => {
    const liveMap = getLiveCells();
    const alive = liveMap.has(`${x},${y}`);
    setCellAlive(x, y, !alive);
  }, [getLiveCells, setCellAlive]);

  const clear = useCallback(() => {
    const newChunks = new Map();
    chunksRef.current = newChunks;
    setChunks(newChunks);
  }, [setChunks]);

  const randomize = useCallback(() => {
    const liveCells = getLiveCells();
    let maxX = DEFAULT_RANDOMIZE_AREA_SIZE, maxY = DEFAULT_RANDOMIZE_AREA_SIZE;
      for (const [key] of liveCells.entries()) {
        const [x, y] = key.split(',').map(Number);
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

    const newChunks = new Map();
    for (let x = 0; x <= maxX; x++) {
      for (let y = 0; y <= maxY; y++) {
        if (Math.random() < RANDOMIZATION_PROBABILITY) {
          const [cx, cy] = getChunkCoords(x, y);
          const key = chunkKey(cx, cy);
          let cellSet = newChunks.get(key);
          if (!cellSet) {
            cellSet = new Set();
            newChunks.set(key, cellSet);
          }
          cellSet.add(`${x - cx * CHUNK_SIZE},${y - cy * CHUNK_SIZE}`);
        }
      }
    }
    chunksRef.current = newChunks;
    setChunks(newChunks);
  }, [getLiveCells, setChunks]);

  // Step using gameLogic.js
  const step = useCallback(() => {
    const liveMap = getLiveCells();
    const newLiveMap = gameStep(liveMap);
    
    // Convert newLiveMap to chunked structure
    const newChunks = convertLiveMapToChunks(newLiveMap);
    chunksRef.current = newChunks;
    setChunks(newChunks); 
  }, [getLiveCells]);

  function convertLiveMapToChunks(map) {
    const out = new Map();
    for (const [key] of map.entries()) {
      const [x, y] = key.split(',').map(Number);
      const [cx, cy] = getChunkCoords(x, y);
      const chunkKeyStr = chunkKey(cx, cy);
      let cellSet = out.get(chunkKeyStr);
      if (!cellSet) {
        cellSet = new Set();
        out.set(chunkKeyStr, cellSet);
      }
      cellSet.add(`${x - cx * CHUNK_SIZE},${y - cy * CHUNK_SIZE}`);
    }
    return out;
  }

  const placeShape = useCallback((x, y) => {
    if (!selectedShape) return;
    // selectedShape can be an array of [dx,dy] pairs or an object with a
    // `cells` array (each cell may be [x,y] or {x,y}). Normalize to an
    // array of pairs and apply.
    let cells = [];
    if (Array.isArray(selectedShape)) {
      cells = selectedShape;
    } else if (selectedShape && Array.isArray(selectedShape.cells)) {
      cells = selectedShape.cells;
    } else {
      // unknown shape format — nothing to place
      return;
    }

    for (const c of cells) {
      let cx = DEFAULT_COORDINATE;
      let cy = DEFAULT_COORDINATE;
      
      if (c && (c.x !== undefined)) {
        cx = c.x;
      } else if (Array.isArray(c)) {
        cx = c[0];
      }
      
      if (c && (c.y !== undefined)) {
        cy = c.y;
      } else if (Array.isArray(c)) {
        cy = c[1];
      }
      
      setCellAlive(x + cx, y + cy, true);
    }
  }, [selectedShape, setCellAlive]);

  return {
    chunks: chunksRef.current,
    getLiveCells,
    setCellAlive,
    toggleCell,
    clear,
    randomize,
    placeShape,
    step,
    cellSize,
    setCellSize,
    selectedShape,
    setSelectedShape,
    isRunning,
    setIsRunning,
    offsetRef
  };
}
