/* Worker factories: prefer module workers (bundler-friendly) and provide a faux-worker
   fallback for environments without Worker support (tests/node).
*/
import { fetchShapeNames, fetchShapeById, getBackendApiBase } from './backendApi.js';
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

async function runNamesLoop(msg, faux) {
  let offset = Math.max(0, Number(msg.offsetStart) || 0);
  const stopAfterFirstPage = !!msg.stopAfterFirstPage;
  const qVal = msg.q || '';
  const limitVal = Number(msg.limit) || 50;
  for (;;) {
    if (faux._aborted) break;
    const page = await fetchNamesPage(msg.base, qVal, limitVal, offset);
    if (!page.ok) { postError(faux, page.error); return; }
    if (page.items.length > 0) postPage(faux, page.items, page.total, offset);
    offset += page.items.length;
    if (stopAfterFirstPage) break;
    if (!page.items.length || (page.total && offset >= page.total)) break;
    await new Promise(r => setTimeout(r, 30));
  }
  // Add a small delay to ensure 'page' is delivered before 'done'
  setTimeout(() => { if (faux.onmessage) faux.onmessage({ data: { type: 'done' } }); }, 10);
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
  const supportsWorker = typeof Worker === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  if (!supportsWorker || isTest) return createFauxNamesWorker();
  try {
    // First try serving worker from public/ path which dev servers
    // will serve with a correct JS MIME type. This is the most
    // reliable option in development when the worker file is placed
    // under `public/workers`.
    return new Worker('/workers/namesWorker.js', { type: 'module' });
  } catch (errPublic) {
    // If that fails, fall back to other strategies below.
  }
  try {
    // Attempt a bundler-aware resolution using `import.meta.url` without
    // embedding the token directly (which breaks Jest/CommonJS parsing).
    // We dynamically retrieve import.meta.url via the Function constructor
    // so the literal `import.meta` does not appear in this module's source.
    try {
      const getImportMetaUrl = new Function('try { return import.meta.url; } catch (e) { return undefined; }');
      const metaUrl = getImportMetaUrl();
      if (metaUrl) {
        return new Worker(new URL('../workers/namesWorker.js', metaUrl), { type: 'module' });
      }
    } catch (inner) {
      // ignore and fall back to relative worker path below
    }
    // Fallback: try creating a module worker from a relative path. Dev
    // servers that can't resolve this will cause the catch below to run.
    return new Worker('../workers/namesWorker.js', { type: 'module' });
  } catch (err) {
    // Fall back to faux if worker creation fails
    console.warn('createNamesWorker: Worker creation failed, using faux worker:', err);
    return createFauxNamesWorker();
  }
}

function createFauxHoverWorker() {
  const faux = {
    onmessage: null,
    onerror: null,
    postMessage: (msg) => fauxHoverPostMessage(msg, faux),
    terminate() { /* noop */ }
  };
  return faux;
}

export { createFauxHoverWorker };

function fauxHoverPostMessage(msg, faux) {
  if (!msg) return;
  if (msg.type === 'start') runHoverFetch(msg, faux);
}

async function runHoverFetch(msg, faux) {
  try {
    const id = msg.id;
    const r = await fetchShapeById(id, msg.base);
    if (!r || !r.ok) { postError(faux, 'Network'); return; }
    const preview = buildPreviewFromShape(r.data || {});
    setTimeout(() => { if (faux.onmessage) faux.onmessage({ data: { type: 'preview', data: preview } }); }, 0);
  } catch (err) { postError(faux, String(err)); }
}

function buildPreviewFromShape(s) {
  const desc = s.description || s.meta?.description || s.meta?.desc || '';
  const cells = Array.isArray(s.cells) ? s.cells : (Array.isArray(s.pattern) ? s.pattern : (Array.isArray(s.liveCells) ? s.liveCells : []));
  return { id: s.id, name: s.name || s.meta?.name || '(unnamed)', description: desc, cells };
}

export function createHoverWorker() {
  const isTest = isTestEnvironment();
  const supportsWorker = typeof Worker === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  if (!supportsWorker || isTest) return createFauxHoverWorker();
  try {
    // Try public path first
    return new Worker('/workers/hoverWorker.js', { type: 'module' });
  } catch (errPublic) {
    // ignore and try bundler-aware resolution
  }
  try {
    try {
      const getImportMetaUrl = new Function('try { return import.meta.url; } catch (e) { return undefined; }');
      const metaUrl = getImportMetaUrl();
      if (metaUrl) {
        return new Worker(new URL('../workers/hoverWorker.js', metaUrl), { type: 'module' });
      }
    } catch (inner) {
      // ignore and fall back
    }
    return new Worker('../workers/hoverWorker.js', { type: 'module' });
  } catch (err) {
    console.warn('createHoverWorker: Worker creation failed, using faux worker:', err);
    return createFauxHoverWorker();
  }
}
