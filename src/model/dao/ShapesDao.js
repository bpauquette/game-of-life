// ShapesDao.js
// Data Access Object for shape operations (frontend abstraction)

/**
 * ShapesDao provides methods to fetch, save, delete, and list shapes from the backend API.
 * All methods return Promises.
 */

import { getBackendApiBase } from '../../utils/backendApi.js';

const getShapesApiBase = () => `${getBackendApiBase()}/v1/shapes`;

const ShapesDao = {
  /**
   * Fetch all shapes (returns array of shape objects)
   */
  async listShapes() {
    const params = new URLSearchParams();
    params.set('searchTerm', '');
    params.set('page', 1);
    params.set('pageSize', 200);
    const res = await fetch(`${getShapesApiBase()}?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch shapes: ${res.status}`);
    const data = await res.json();
    // Unwrap .items if present (backend contract)
    return Array.isArray(data.items) ? data.items : data;
  },

  /**
   * Fetch a single shape by ID
   */
  async getShape(id) {
    const res = await fetch(`${getShapesApiBase()}/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch shape: ${res.status}`);
    return await res.json();
  },

  /**
   * Save a new shape (POST)
   */
  async saveShape(shape) {
    const res = await fetch(getShapesApiBase(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shape)
    });
    if (!res.ok) throw new Error(`Failed to save shape: ${res.status}`);
    return await res.json();
  },

  /**
   * Delete a shape by ID
   */
  async deleteShape(id) {
    const res = await fetch(`${getShapesApiBase()}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete shape: ${res.status}`);
    return true;
  }
};

export default ShapesDao;
