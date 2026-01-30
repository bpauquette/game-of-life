const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const version = pkg.version || '0.0.0';
const outPath = path.join(__dirname, '../public/version.txt');

fs.writeFileSync(outPath, version, 'utf8');
console.log(`Wrote version ${version} to public/version.txt`);
