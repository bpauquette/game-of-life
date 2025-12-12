// scripts/write-version.js
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const versionFile = path.join(__dirname, '../src/version.js');
const timestamp = new Date().toISOString();

let content = fs.readFileSync(versionFile, 'utf8');
content = content.replace('__BUILD_TIMESTAMP__', timestamp).replace("'0.1.0'", `'${pkg.version}'`);
fs.writeFileSync(versionFile, content, 'utf8');
console.log(`Wrote version: ${pkg.version}, timestamp: ${timestamp}`);
