import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "..", "data", "shapes.json");
const GRIDS_DB_FILE = path.join(__dirname, "..", "data", "grids.json");

const ensureDbFile = async (dbFile = DB_FILE) => {
  const dir = path.dirname(dbFile);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // File may not exist yet, this is expected on first run
  }
  try {
    await fs.access(dbFile);
  } catch {
    // create empty array file
    await fs.writeFile(dbFile, "[]", "utf8");
  }
};

const readDb = async (dbFile = DB_FILE) => {
  await ensureDbFile(dbFile);
  const txt = await fs.readFile(dbFile, "utf8");
  try {
    return JSON.parse(txt || "[]");
  } catch {
    // if file corrupted, reset to empty
    await fs.writeFile(dbFile, "[]", "utf8");
    return [];
  }
};

const writeDb = async (data, dbFile = DB_FILE) => {
  await ensureDbFile(dbFile);
  await fs.writeFile(dbFile, JSON.stringify(data, null, 2), "utf8");
};

const listShapes = async () => {
  return await readDb();
};

const getShape = async (id) => {
  const data = await readDb();
  return data.find((s) => s.id === id) || null;
};

const addShape = async (shape) => {
  const data = await readDb();
  data.push(shape);
  await writeDb(data);
  return shape;
};

const deleteShape = async (id) => {
  const data = await readDb();
  const idx = data.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  data.splice(idx, 1);
  await writeDb(data);
  return true;
};

// Grid state management functions
const listGrids = async () => {
  return await readDb(GRIDS_DB_FILE);
};

const getGrid = async (id) => {
  const data = await readDb(GRIDS_DB_FILE);
  return data.find((g) => g.id === id) || null;
};

const saveGrid = async (grid) => {
  const data = await readDb(GRIDS_DB_FILE);
  // Remove existing grid with same ID if it exists (update)
  const existingIndex = data.findIndex((g) => g.id === grid.id);
  if (existingIndex >= 0) {
    data[existingIndex] = grid;
  } else {
    data.push(grid);
  }
  await writeDb(data, GRIDS_DB_FILE);
  return grid;
};

const deleteGrid = async (id) => {
  const data = await readDb(GRIDS_DB_FILE);
  const idx = data.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  data.splice(idx, 1);
  await writeDb(data, GRIDS_DB_FILE);
  return true;
};

export default {
  listShapes,
  getShape,
  addShape,
  deleteShape,
  listGrids,
  getGrid,
  saveGrid,
  deleteGrid,
};
