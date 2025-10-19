const path = require('node:path');
const fs = require('node:fs').promises;

const DB_FILE = path.join(__dirname, '..', 'data', 'shapes.json');

const ensureDbFile = async () => {
  const dir = path.dirname(DB_FILE);
  try{
    await fs.mkdir(dir, { recursive: true });
  } catch { 
    // File may not exist yet, this is expected on first run
  }
  try{
    await fs.access(DB_FILE);
  }catch{
    // create empty array file
    await fs.writeFile(DB_FILE, '[]', 'utf8');
  }
};

const readDb = async () => {
  await ensureDbFile();
  const txt = await fs.readFile(DB_FILE, 'utf8');
  try{
    return JSON.parse(txt || '[]');
  }catch{
    // if file corrupted, reset to empty
    await fs.writeFile(DB_FILE, '[]', 'utf8');
    return [];
  }
};

const writeDb = async (data) => {
  await ensureDbFile();
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const listShapes = async () => {
  return await readDb();
};

const getShape = async (id) => {
  const data = await readDb();
  return data.find(s => s.id === id) || null;
};

const addShape = async (shape) => {
  const data = await readDb();
  data.push(shape);
  await writeDb(data);
  return shape;
};

const deleteShape = async (id) => {
  const data = await readDb();
  const idx = data.findIndex(s => s.id === id);
  if(idx === -1) return false;
  data.splice(idx, 1);
  await writeDb(data);
  return true;
};

module.exports = { listShapes, getShape, addShape, deleteShape };
