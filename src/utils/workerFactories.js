/* Worker factories: prefer module workers (bundler-friendly) and provide a faux-worker
   fallback for environments without Worker support (tests/node).
*/
import { fetchShapeNames, getBackendApiBase } from './backendApi.js';
import { isTestEnvironment } from './runtimeEnv.js';
function createFauxNamesWorker() {
  const faux = {
    _aborted: false,
    onmessage: null,
    onerror: null,
    postMessage: null,
    terminate() { faux._aborted = true; }
  };
  faux.postMessage = (msg) => fauxNamesPostMessage(msg, faux);
  return faux;
}

// Export faux constructors for callers that want to fall back explicitly
export { createFauxNamesWorker };

function fauxNamesPostMessage(msg, faux) {
  if (!msg) return;
  if (msg.type === 'start') {
    // run the loop asynchronously
    runNamesLoop(msg, faux);
    return;
  }
  if (msg.type === 'stop') faux._aborted = true;
}

function shouldStopAfterPage(page, offset, stopAfterFirstPage) {
  if (stopAfterFirstPage) return true;
  if (!page.items.length) return true;
  return Boolean(page.total && offset >= page.total);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function postDone(faux) {
  setTimeout(() => {
    if (faux.onmessage) faux.onmessage({ data: { type: 'done' } });
  }, 10);
}

async function runNamesLoop(msg, faux) {
  let offset = Math.max(0, Number(msg.offsetStart) || 0);
  const stopAfterFirstPage = !!msg.stopAfterFirstPage;
  const qVal = msg.q || '';
  const limitVal = Number(msg.limit) || 50;
  while (!faux._aborted) {
    const page = await fetchNamesPage(msg.base, qVal, limitVal, offset);
    if (!page.ok) {
      postError(faux, page.error);
      return;
    }
    if (page.items.length > 0) postPage(faux, page.items, page.total, offset);
    offset += page.items.length;
    if (shouldStopAfterPage(page, offset, stopAfterFirstPage)) break;
    await delay(30);
  }
  postDone(faux);
}

function postPage(faux, items, total, offset) {
  const offsetSnapshot = offset;
  setTimeout(() => { if (faux.onmessage) faux.onmessage({ data: { type: 'page', items, total, offset: offsetSnapshot } }); }, 0);
}

function postError(faux, message) {
  setTimeout(() => { if (faux.onmessage) faux.onmessage({ data: { type: 'error', message } }); }, 0);
}

async function fetchNamesPage(base, qVal, limitVal, offset) {
  try {
    // getBackendApiBase is statically imported
    const baseUrl = base || getBackendApiBase();
    const r = await fetchShapeNames(baseUrl, qVal, limitVal, offset);
    if (!r || !r.ok) return { ok: false, error: 'Backend error', items: [], total: 0 };
    return { ok: true, items: r.items || [], total: Number(r.total) || 0 };
  } catch (err) {
    return { ok: false, error: String(err), items: [], total: 0 };
  }
}

export function createNamesWorker() {
  const isTest = isTestEnvironment();
  const supportsWorker = typeof Worker === 'function';
  if (!supportsWorker || isTest) return createFauxNamesWorker();
  try {
    return new Worker('/workers/namesWorker.js', { type: 'module' });
  } catch (err) {
    console.warn('createNamesWorker: Worker creation failed, using faux worker:', err);
    return createFauxNamesWorker();
  }
}
