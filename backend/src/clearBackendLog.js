// At startup, clear backend.log
import fs from 'node:fs';
const logPath = new URL('../backend.log', import.meta.url);
try {
  fs.writeFileSync(logPath, '', 'utf8');
} catch (e) {
  console.error('Failed to clear backend.log:', e);
}
