// GridsDao.js
// Data Access Object for grid operations (frontend abstraction)
import { getBackendApiBase } from '../../utils/backendApi.js';

/**
 * GridsDao provides methods to fetch, save, delete, and list grids from the backend API.
 * All methods return Promises.
 */

const API_PATH = '/v1/grids';

function buildUrl(id) {
  const base = getBackendApiBase();
  const trimmed = typeof base === 'string' ? base.replace(/\/$/, '') : '';
  const suffix = id ? `/${encodeURIComponent(id)}` : '';
  return `${trimmed}${API_PATH}${suffix}`;
}

const GridsDao = {
  /**
   * Fetch all grids (returns array of grid objects)
   */
  async listGrids() {
    const res = await fetch(buildUrl());
    if (!res.ok) throw new Error(`Failed to fetch grids: ${res.status}`);
    const data = await res.json();
    // Unwrap .items if present (backend contract)
    return Array.isArray(data.items) ? data.items : data;
  },

  /**
   * Fetch a single grid by ID
   */
  async getGrid(id) {
    const res = await fetch(buildUrl(id));
    if (!res.ok) throw new Error(`Failed to fetch grid: ${res.status}`);
    return await res.json();
  },

  /**
   * Save a new grid (POST)
   */
  async saveGrid(grid) {
    const res = await fetch(buildUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grid)
    });
    if (!res.ok) throw new Error(`Failed to save grid: ${res.status}`);
    return await res.json();
  },

  /**
   * Delete a grid by ID
   */
  async deleteGrid(id) {
    const res = await fetch(buildUrl(id), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete grid: ${res.status}`);
    return true;
  }
};

export default GridsDao;
