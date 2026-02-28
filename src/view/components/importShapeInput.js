const LIFEWIKI_PATTERN_BASES = [
  'https://unpkg.com/cellular-automata-patterns@1.0.24/patterns/conwaylife',
  'https://cdn.jsdelivr.net/npm/cellular-automata-patterns@1.0.24/patterns/conwaylife'
];

const RLE_HEADER_RE = /^\s*x\s*=\s*-?\d+\s*,\s*y\s*=\s*-?\d+/i;
const BARE_RLE_RE = /^[0-9ob$!\s]+$/i;

export function parseHttpUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function normalizeLifeWikiTitle(title) {
  const cleaned = String(title || '')
    .trim()
    .replace(/^rle:/i, '')
    .replace(/^pattern:/i, '')
    .replace(/\.rle$/i, '');
  const slug = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug || null;
}

function extractLifeWikiTitle(parsedUrl) {
  const path = parsedUrl.pathname || '';
  if (path.startsWith('/wiki/')) {
    return decodeURIComponent(path.slice('/wiki/'.length));
  }
  if (path.toLowerCase() === '/wiki/index.php') {
    return decodeURIComponent(parsedUrl.searchParams.get('title') || '');
  }
  if (path.startsWith('/patterns/') && path.toLowerCase().endsWith('.rle')) {
    const fileName = path.split('/').pop() || '';
    return fileName.replace(/\.rle$/i, '');
  }
  return null;
}

function toRawGitHubUrl(parsedUrl) {
  if (!/github\.com$/i.test(parsedUrl.hostname || '')) return null;
  const parts = parsedUrl.pathname.split('/').filter(Boolean);
  if (parts.length < 5 || parts[2] !== 'blob') return null;
  const [owner, repo] = parts;
  const ref = parts[3];
  const filePath = parts.slice(4).join('/');
  if (!owner || !repo || !ref || !filePath) return null;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
}

export function buildImportUrlCandidates(rawInput) {
  const parsedUrl = parseHttpUrl(rawInput);
  if (!parsedUrl) return [];

  const candidates = [];
  const seen = new Set();
  const addCandidate = (candidate) => {
    const normalized = String(candidate || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  const host = (parsedUrl.hostname || '').toLowerCase();
  const isLifeWiki = host === 'conwaylife.com' || host === 'www.conwaylife.com';

  if (isLifeWiki) {
    const title = extractLifeWikiTitle(parsedUrl);
    const slug = normalizeLifeWikiTitle(title);
    if (slug) {
      for (const base of LIFEWIKI_PATTERN_BASES) {
        addCandidate(`${base}/${slug}.rle`);
      }
    }
  }

  const rawGitHub = toRawGitHubUrl(parsedUrl);
  if (rawGitHub) addCandidate(rawGitHub);

  addCandidate(parsedUrl.toString());
  return candidates;
}

export function extractRleFromText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return null;
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const headerIndex = lines.findIndex((line) => RLE_HEADER_RE.test(line));

  if (headerIndex === -1) {
    const trimmed = normalized.trim();
    return BARE_RLE_RE.test(trimmed) && trimmed.includes('!') ? trimmed : null;
  }

  let startIndex = headerIndex;
  while (startIndex > 0 && /^\s*#/.test(lines[startIndex - 1])) {
    startIndex -= 1;
  }

  const extracted = [];
  let hasTerminator = false;

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i].replace(/\s+$/g, '');

    if (i < headerIndex) {
      if (/^\s*#/.test(line)) extracted.push(line);
      continue;
    }

    if (line.includes('!')) {
      extracted.push(line.slice(0, line.indexOf('!') + 1));
      hasTerminator = true;
      break;
    }

    if (line.trim().length === 0) continue;
    extracted.push(line);
  }

  if (!hasTerminator) return null;
  const candidate = extracted.join('\n').trim();
  const hasHeader = candidate.split('\n').some((line) => RLE_HEADER_RE.test(line));
  return hasHeader ? candidate : null;
}

function buildUrlImportError(parsedUrl, lastError) {
  const host = (parsedUrl.hostname || '').toLowerCase();
  if (host === 'conwaylife.com' || host === 'www.conwaylife.com') {
    return new Error('Could not resolve that LifeWiki URL to a valid RLE file. Try pasting the RLE text directly.');
  }
  const suffix = lastError?.message ? ` (${lastError.message})` : '';
  return new Error(`Unable to fetch valid RLE from URL${suffix}`);
}

export async function resolveImportInput(input, fetchImpl = globalThis.fetch) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('Please enter a URL or RLE');
  }

  const parsedUrl = parseHttpUrl(trimmed);
  if (!parsedUrl) {
    return { rle: trimmed, resolvedFromUrl: false, sourceUrl: null };
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('URL imports are unavailable because fetch is not supported in this environment.');
  }

  const candidates = buildImportUrlCandidates(trimmed);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchImpl(candidate, {
        method: 'GET',
        headers: { Accept: 'text/plain, text/*;q=0.9, */*;q=0.8' }
      });
      if (!response?.ok) {
        lastError = new Error(`HTTP ${response?.status || 'error'}`);
        continue;
      }
      const text = await response.text();
      const rle = extractRleFromText(text);
      if (!rle) {
        lastError = new Error('No valid RLE block found');
        continue;
      }
      return {
        rle,
        resolvedFromUrl: true,
        sourceUrl: candidate
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw buildUrlImportError(parsedUrl, lastError);
}
