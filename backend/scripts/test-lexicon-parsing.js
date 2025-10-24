#!/usr/bin/env node

/**
 * Quick test script to validate lexicon parsing before full import
 */

import { parseLexicon } from './import-lexicon.js';

async function testParsing() {
  console.log('Testing lexicon parsing...\n');
  
  try {
    const patterns = await parseLexicon();
    
    console.log(`\n=== Test Results ===`);
    console.log(`Total patterns found: ${patterns.length}`);
    
    // Show first few patterns as examples
    console.log(`\n=== Sample Patterns ===`);
    patterns.slice(0, 5).forEach((pattern, i) => {
      console.log(`${i + 1}. ${pattern.name}`);
      console.log(`   Description: ${pattern.description}`);
      console.log(`   Metadata: ${pattern.metadata || 'none'}`);
      console.log(`   Size: ${pattern.width}x${pattern.height} (${pattern.cellCount} cells)`);
      console.log(`   Cells: ${JSON.stringify(pattern.cells.slice(0, 3))}${pattern.cells.length > 3 ? '...' : ''}`);
      console.log('');
    });
    
    // Show patterns by size
    const sizes = patterns.map(p => p.cellCount).sort((a, b) => a - b);
    console.log(`\n=== Size Distribution ===`);
    console.log(`Smallest: ${sizes[0]} cells`);
    console.log(`Largest: ${sizes[sizes.length - 1]} cells`);
    console.log(`Median: ${sizes[Math.floor(sizes.length / 2)]} cells`);
    
    // Show some specific interesting patterns
    console.log(`\n=== Notable Patterns ===`);
    const notable = ['glider', 'block', 'blinker', 'toad', 'beacon', 'glider gun', 'acorn', 'R-pentomino'];
    for (const name of notable) {
      const pattern = patterns.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
      if (pattern) {
        console.log(`${pattern.name}: ${pattern.cellCount} cells, ${pattern.width}x${pattern.height}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
  }
}

testParsing();