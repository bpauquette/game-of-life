import fs from 'node:fs';
import path from 'node:path';
import logger from './logger.js';

function computeBounds(cells = []) {
  if (!cells || cells.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 1, height: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) {
    const x = (typeof c.x !== 'undefined') ? c.x : (Array.isArray(c) ? c[0] : 0);
    const y = (typeof c.y !== 'undefined') ? c.y : (Array.isArray(c) ? c[1] : 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
  const width = (maxX - minX + 1) || 1;
  const height = (maxY - minY + 1) || 1;
  return { minX, minY, maxX, maxY, width, height };
}

function makeSvg(cellsArr, bounds, targetPx = 128, color = '#1976d2') {
  const padding = 4;
  const { minX, minY, width, height } = bounds;
  const maxDim = Math.max(width, height);
  const cellPx = Math.max(1, Math.floor((targetPx - padding * 2) / maxDim));
  const svgW = width * cellPx + padding * 2;
  const svgH = height * cellPx + padding * 2;
  const rects = [];
  for (const c of cellsArr) {
    const x = (typeof c.x !== 'undefined') ? c.x : (Array.isArray(c) ? c[0] : 0);
    const y = (typeof c.y !== 'undefined') ? c.y : (Array.isArray(c) ? c[1] : 0);
    const px = (x - minX) * cellPx + padding;
    const py = (y - minY) * cellPx + padding;
    rects.push(`<rect x="${px}" y="${py}" width="${cellPx}" height="${cellPx}" fill="${color}" />`);
  }
  return `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">\n<rect width="100%" height="100%" fill="transparent" />\n${rects.join('\n')}\n</svg>`;
}

export async function generateThumbnailsForShape(shape, options = {}) {
  try {
    const thumbsBase = path.join(process.cwd(), 'backend', 'data', 'thumbnails');
    if (!fs.existsSync(thumbsBase)) {
      fs.mkdirSync(thumbsBase, { recursive: true });
    }

    const cells = Array.isArray(shape.cells) ? shape.cells : [];
    const bounds = computeBounds(cells);

    // Attempt to import color schemes from the frontend model. If that
    // fails, fall back to a single default scheme named 'default'.
    let colorSchemes = { default: { name: 'default', background: '#000', getCellColor: () => '#1976d2' } };
    try {
      const csPath = path.join(process.cwd(), 'src', 'model', 'colorSchemes.js');
      const mod = await import(`file://${csPath}`);
      colorSchemes = mod.colorSchemes || colorSchemes;
    } catch (e) {
      logger.warn('Could not import colorSchemes for thumbnail generation; using default color', e?.message || e);
    }

    // Try to load sharp once for PNG conversion.
    let sharpAvailable = null;
    try {
      sharpAvailable = (await import('sharp')).default || (await import('sharp'));
    } catch (e) {
      sharpAvailable = null;
    }

    const defaultColor = options.defaultColor || '#1976d2';

    // Helper to make a simple slug from the shape name (for filename use)
    const slugify = (s) => {
      if (!s) return '';
      return String(s).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 200) || '';
    };
    const nameSlug = shape && shape.name ? slugify(shape.name) : '';

    // Top-level name-based svg/png for compatibility. If no name, skip top-level writes.
    if (nameSlug) {
      const topLevelSvg = makeSvg(cells, bounds, 128, defaultColor);
      await fs.promises.writeFile(path.join(thumbsBase, `${nameSlug}.svg`), topLevelSvg, 'utf8');
      if (sharpAvailable) {
        try {
          await sharpAvailable(Buffer.from(topLevelSvg)).png().resize(128, 128, { fit: 'contain' }).toFile(path.join(thumbsBase, `${nameSlug}.png`));
        } catch (e) {
          logger.warn('Failed to write top-level PNG thumbnail for name:', nameSlug, e?.message || e);
        }
      }
    }

    // Write thumbnails per scheme
    for (const schemeKey of Object.keys(colorSchemes)) {
      try {
        const scheme = colorSchemes[schemeKey] || {};
        let color = defaultColor;
        if (typeof scheme.getCellColor === 'function') {
          try { color = scheme.getCellColor(0,0) || color; } catch (_) { /* ignore */ }
        } else if (scheme.cellColor) {
          color = scheme.cellColor;
        }

        const schemeDir = path.join(thumbsBase, schemeKey.toString());
        if (!fs.existsSync(schemeDir)) fs.mkdirSync(schemeDir, { recursive: true });

        const svgStr = makeSvg(cells, bounds, 128, color);
        // write name-based files only; skip if no nameSlug
        if (nameSlug) {
          await fs.promises.writeFile(path.join(schemeDir, `${nameSlug}.svg`), svgStr, 'utf8');
        }

        if (sharpAvailable && nameSlug) {
          try {
            await sharpAvailable(Buffer.from(svgStr)).png().resize(128, 128, { fit: 'contain' }).toFile(path.join(schemeDir, `${nameSlug}.png`));
          } catch (e) {
            logger.warn(`sharp failed for scheme ${schemeKey} name=${nameSlug}:`, e?.message || e);
          }
        }
      } catch (e) {
        logger.error(`Failed to write thumbnails for scheme ${schemeKey}:`, e?.message || e);
      }
    }
  } catch (e) {
    logger.error('Failed to generate thumbnails for shape:', e?.message || e);
    throw e;
  }
}

// Render thumbnail buffer for given cells and color. Returns { mime, buffer }
export async function renderThumbnailBuffer(cellsArr = [], color = '#1976d2', targetPx = 128) {
  try {
    const bounds = computeBounds(cellsArr);
    const svgStr = makeSvg(cellsArr, bounds, targetPx, color);

    // Try to load sharp for PNG conversion
    let sharp = null;
    try {
      sharp = (await import('sharp')).default || (await import('sharp'));
    } catch (e) {
      sharp = null;
    }

    if (sharp) {
      try {
        const buf = await sharp(Buffer.from(svgStr)).png().resize(targetPx, targetPx, { fit: 'contain' }).toBuffer();
        return { mime: 'image/png', buffer: buf };
      } catch (e) {
        // fallthrough to returning svg
        // eslint-disable-next-line no-console
        console.warn('sharp render failed, falling back to svg:', e?.message || e);
      }
    }

    return { mime: 'image/svg+xml', buffer: Buffer.from(svgStr, 'utf8') };
  } catch (e) {
    logger.error('renderThumbnailBuffer failed:', e?.message || e);
    throw e;
  }
}
