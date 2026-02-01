const hasProcessEnv = typeof process !== 'undefined' && process != null && process.env != null;
let importMetaAccessor = null;

function readImportMetaEnv(key) {
  if (!key) return undefined;
  if (!importMetaAccessor) {
    try {
      importMetaAccessor = new Function('k', 'try { return import.meta && import.meta.env ? import.meta.env[k] : undefined; } catch (e) { return undefined; }');
    } catch (e) {
      importMetaAccessor = () => undefined;
    }
  }
  try {
    return importMetaAccessor(key);
  } catch (e) {
    return undefined;
  }
}

function readGlobalEnv(key) {
  if (!key) return undefined;
  if (typeof globalThis === 'undefined') return undefined;
  const sources = [globalThis.env, globalThis.__env__, globalThis.__APP_ENV__];
  for (const src of sources) {
    if (src && Object.prototype.hasOwnProperty.call(src, key)) {
      return src[key];
    }
  }
  return undefined;
}

export function getEnvValue(key) {
  if (!key) return undefined;
  if (hasProcessEnv && Object.prototype.hasOwnProperty.call(process.env, key)) {
    return process.env[key];
  }
  const fromImportMeta = readImportMetaEnv(key);
  if (typeof fromImportMeta !== 'undefined') {
    return fromImportMeta;
  }
  return readGlobalEnv(key);
}

export function isTestEnvironment() {
  if (typeof globalThis !== 'undefined') {
    if (globalThis.__GOL_TEST_MODE__ || globalThis.__TEST__ || globalThis.__JEST__ || globalThis.JEST_WORKER_ID) {
      return true;
    }
  }
  if (typeof jest !== 'undefined') {
    return true;
  }
  if (hasProcessEnv) {
    const env = process.env;
    if (env.JEST_WORKER_ID || env.NODE_ENV === 'test' || env.BABEL_ENV === 'test') {
      return true;
    }
  }
  const mode = getEnvValue('MODE');
  if (typeof mode === 'string' && mode.toLowerCase() === 'test') {
    return true;
  }
  return false;
}

export function getBooleanEnv(key, defaultValue = false) {
  const value = getEnvValue(key);
  if (typeof value === 'undefined' || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return defaultValue;
}
