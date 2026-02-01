// setupToolDao.js
// Injects controller toolMap into useToolDao for tool/overlay access
import { useToolDao } from '../model/dao/toolDao.js';

/**
 * Injects the controller's toolMap into useToolDao for global access.
 * Call this after GameMVC is constructed and tools are registered.
 * @param {GameMVC} mvc - The GameMVC instance
 */
export function setupToolDaoFromMVC(mvc) {
  if (!mvc || !mvc.controller || !mvc.controller.toolMap) {
    console.error('[setupToolDaoFromMVC] Invalid GameMVC instance or missing controller.toolMap');
    return;
  }
  useToolDao.getState().setToolMap({ ...mvc.controller.toolMap });
  console.log('[setupToolDaoFromMVC] setToolMap called with:', Object.keys(mvc.controller.toolMap));
}
