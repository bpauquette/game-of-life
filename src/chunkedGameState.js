// chunkedGameState.js
import { useState, useRef, useCallback } from 'react';
import { step as gameStep } from './gameLogic';
import { shapes } from './shapes';

const CHUNK_SIZE = 64;

function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

function getChunkCoords(x, y) {
  return [Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE)];
}

export function useChunkedGameState() {
  // Standard UI state
  const [isRunning, setIsRunning] = useState(false);
  const [cellSize, setCellSize] = useState(20);
  const [selectedShape, setSelectedShape] = useState(null);
  const [chunks, setChunks] = useState(new Map()); // reactive for tests
  const chunksRef = useRef(chunks);               // fast access for GameOfLife


  const offsetRef = useRef({ x: 0, y: 0 });

  // Get all live cells as "x,y" => true
  const getLiveCells = useCallback(() => {
    const map = new Map();
    chunksRef.current.forEach((cellSet, key) => {
      const [cx, cy] = key.split(',').map(Number);
      cellSet.forEach((cellKey) => {
        const [lx, ly] = cellKey.split(',').map(Number);
        const x = cx * CHUNK_SIZE + lx;
        const y = cy * CHUNK_SIZE + ly;
        map.set(`${x},${y}`, true);
      });
    });
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
    let maxX = 20, maxY = 20;
    liveCells.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    const newChunks = new Map();
    for (let x = 0; x <= maxX; x++) {
      for (let y = 0; y <= maxY; y++) {
        if (Math.random() < 0.5) {
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
    const newChunks = new Map();
    newLiveMap.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      const [cx, cy] = getChunkCoords(x, y);
      const chunkKeyStr = chunkKey(cx, cy);
      let cellSet = newChunks.get(chunkKeyStr);
      if (!cellSet) {
        cellSet = new Set();
        newChunks.set(chunkKeyStr, cellSet);
      }
      cellSet.add(`${x - cx * CHUNK_SIZE},${y - cy * CHUNK_SIZE}`);
    });
    chunksRef.current = newChunks;
    setChunks(newChunks); 
  }, [getLiveCells]);

  const placeShape = useCallback((x, y) => {
    if (!selectedShape) return;
    // getLiveCells() is available if callers need current state; we don't need it here
    shapes[selectedShape].forEach(([dx, dy]) => {
      setCellAlive(x + dx, y + dy, true);
    });
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
