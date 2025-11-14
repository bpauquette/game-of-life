// Minimal IndexedDB helper for shapes catalog with progress support.
// Falls back cleanly if IndexedDB is not available (caller should detect).

export const IDB_DB_NAME = 'gol-shapes-db';
export const IDB_STORE_NAME = 'shapes';
export const IDB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'));
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

export async function clearStore() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    const r = store.clear();
    r.onsuccess = () => { db.close(); resolve(); };
    r.onerror = () => { db.close(); reject(r.error); };
  });
}

// Put items into the store. Reports progress via progressCb({ done, total, batchSize })
export async function putItems(items, { batchSize = 100, progressCb } = {}) {
  const db = await openDB();
  const total = items.length;
  let done = 0;
  try {
    // We'll write in batches to avoid long transactions
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        for (let j = 0; j < batch.length; j++) {
          // Ensure every object has an 'id' key since the store uses keyPath 'id'.
          // If missing, generate a stable-ish id based on time and index to avoid
          // the "Evaluating the object store's key path did not yield a value" error.
          const original = batch[j];
          const obj = (original && typeof original === 'object') ? { ...original } : { value: original };
          if (obj.id === undefined || obj.id === null || obj.id === '') {
            // generated id: prefix + timestamp + batch offset + local index
            obj.id = `generated-${Date.now()}-${i + j}-${Math.random().toString(36).slice(2,8)}`;
          }
          store.put(obj);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IDB transaction failed'));
      });
      done += batch.length;
      if (typeof progressCb === 'function') progressCb({ done, total, batchSize: batch.length });
    }
  } finally {
    db.close();
  }
}

export async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const store = tx.objectStore(IDB_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => { db.close(); resolve(req.result || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
