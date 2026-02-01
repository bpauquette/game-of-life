// setupGameDao.js
// Injects model/controller methods into useGameDao for model-first imperative actions
import { useGameDao } from '../model/dao/gameDao.js';

/**
 * Injects the real setCellAlive (and other imperative methods) from the controller into useGameDao.
 * Call this after GameMVC is constructed and fully initialized.
 * @param {GameMVC} mvc - The GameMVC instance
 */
export function setupGameDaoFromMVC(mvc) {
  if (!mvc || typeof mvc.setCellAlive !== 'function') {
    console.error('[setupGameDaoFromMVC] Invalid GameMVC instance or missing setCellAlive');
    return;
  }
  useGameDao.getState().setSetCellAlive((x, y, alive) => mvc.setCellAlive(x, y, alive));
  // Add more injections here if needed (e.g., setGetLiveCells, etc.)
}
