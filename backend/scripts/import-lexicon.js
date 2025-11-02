#!/usr/bin/env node

/**
 * Lexicon Pattern Importer
 * 
 * Parses the Life Lexicon text file and imports all patterns into the shapes database.
 * Handles both dot-asterisk format and RLE format patterns.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/db.js';
import { parseLexiconFile } from '../src/lexiconParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEXICON_FILE = path.join(__dirname, '..', 'lexicon', 'lexicon.txt');

// Parse the entire lexicon file via centralized parser
async function parseLexicon() {
  console.log('Reading lexicon file...');
  const patterns = await parseLexiconFile(LEXICON_FILE);
  console.log(`\nFound ${patterns.length} patterns total`);
  return patterns;
}

// Import patterns into database
async function importPatterns(patterns) {
  console.log('\nImporting patterns into database...');
  
  let imported = 0;
  let skipped = 0;
  
  for (const pattern of patterns) {
    try {
      // Create shape object
      const shape = {
        id: uuidv4(),
        name: pattern.name,
        description: pattern.description || `Pattern from Life Lexicon${pattern.metadata ? ' (' + pattern.metadata + ')' : ''}`,
        width: pattern.width,
        height: pattern.height,
        cells: pattern.cells,
        cellCount: pattern.cellCount,
        type: 'lexicon',
        meta: {
          source: 'lexicon-import',
          metadata: pattern.metadata,
          description: pattern.description,
          importedAt: new Date().toISOString()
        }
      };
      
      // Check if pattern already exists
      const existing = await db.listShapes();
      const exists = existing.find(s => s.name === pattern.name);
      
      if (exists) {
        console.log(`Skipping ${pattern.name} (already exists)`);
        skipped++;
        continue;
      }
      
      await db.addShape(shape);
      imported++;
      
      if (imported % 10 === 0) {
        console.log(`Imported ${imported} patterns...`);
      }
      
    } catch (e) {
      console.error(`Failed to import ${pattern.name}:`, e.message);
      skipped++;
    }
  }
  
  console.log(`\nImport complete!`);
  console.log(`Imported: ${imported} patterns`);
  console.log(`Skipped: ${skipped} patterns`);
}

// Main execution
async function main() {
  try {
    console.log('=== Life Lexicon Pattern Importer ===\n');
    
    // Check if lexicon file exists
        try {
          await fs.access(LEXICON_FILE);
        } catch (e) {
          if (e?.code === 'ENOENT') {
          console.error(`Lexicon file not found: ${LEXICON_FILE}`, e);
          process.exit(1);
          }
          // Unexpected error: let the outer handler deal with it
          throw e;
        }
    
    // Parse patterns
  const patterns = await parseLexicon();
    
    if (patterns.length === 0) {
      console.log('No patterns found in lexicon file');
      return;
    }
    
  // Show statistics
    console.log('\n=== Pattern Statistics ===');
    console.log(`Total patterns: ${patterns.length}`);
    
    const bySize = patterns.reduce((acc, p) => {
      const size = p.cellCount;
      if (size <= 10) acc.small++;
      else if (size <= 50) acc.medium++;
      else if (size <= 200) acc.large++;
      else acc.huge++;
      return acc;
    }, { small: 0, medium: 0, large: 0, huge: 0 });
    
    console.log(`Small (≤10 cells): ${bySize.small}`);
    console.log(`Medium (11-50 cells): ${bySize.medium}`);
    console.log(`Large (51-200 cells): ${bySize.large}`);
    console.log(`Huge (>200 cells): ${bySize.huge}`);
    
    // Ask for confirmation
    console.log('\nReady to import patterns into database...');
    
    // Import patterns
    await importPatterns(patterns);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { parseLexicon, importPatterns };