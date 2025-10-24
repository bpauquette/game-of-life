#!/usr/bin/env node

/**
 * Lexicon Pattern Importer
 *
 * Parses the Life Lexicon text file and imports all patterns into the shapes database.
 * Handles both dot-asterisk format and RLE format patterns.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { parseRLE } from "../src/rleParser.js";
import db from "../src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEXICON_FILE = path.join(__dirname, "..", "lexicon", "lexicon.txt");

// Convert dot-asterisk format to cells array
function parseDotAsteriskPattern(lines) {
  const cells = [];

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      if (line[x] === "*") {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

// Calculate pattern dimensions
function calculateDimensions(cells) {
  if (cells.length === 0) {
    return { width: 1, height: 1 };
  }

  const minX = Math.min(...cells.map((c) => c.x));
  const maxX = Math.max(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const maxY = Math.max(...cells.map((c) => c.y));

  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

// Normalize cells to start from (0,0)
function normalizeCells(cells) {
  if (cells.length === 0) return cells;

  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));

  return cells.map((c) => ({
    x: c.x - minX,
    y: c.y - minY,
  }));
}

// Extract pattern name and metadata from definition line
function parseDefinitionLine(line) {
  // Pattern: ":name: (metadata) description"
  const match = line.match(/^:([^:]+):\s*(\([^)]+\))?\s*(.*)$/);

  if (!match) return null;

  const [, name, metadata, description] = match;

  return {
    name: name.trim(),
    metadata: metadata ? metadata.slice(1, -1) : "", // Remove parentheses
    description: description.trim(),
  };
}

// Parse the entire lexicon file
async function parseLexicon() {
  console.log("Reading lexicon file...");
  const content = await fs.readFile(LEXICON_FILE, "utf8");
  const lines = content.split("\n");

  const patterns = [];
  let currentPattern = null;
  let patternLines = [];
  let inPattern = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for pattern definition
    if (line.startsWith(":") && line.includes(":")) {
      // Save previous pattern if exists
      if (currentPattern && patternLines.length > 0) {
        try {
          let cells = [];

          // Check if it's RLE format
          const hasRLE = patternLines.some(
            (l) => l.includes("x = ") && l.includes("y = "),
          );

          if (hasRLE) {
            // Find RLE data
            const rleStart = patternLines.findIndex((l) => l.includes("x = "));
            if (rleStart >= 0) {
              const rleLines = patternLines.slice(rleStart);
              const rleText = rleLines.join("\n");
              try {
                const parsed = parseRLE(rleText);
                cells = parsed.cells || [];
              } catch (e) {
                console.warn(
                  `Failed to parse RLE for ${currentPattern.name}:`,
                  e.message,
                );
              }
            }
          } else {
            // Dot-asterisk format - look for lines with dots and asterisks
            const dotLines = patternLines
              .filter(
                (l) => l.includes(".") && l.includes("*") && l.startsWith("\t"), // Patterns are indented
              )
              .map((l) => l.substring(1)); // Remove tab

            if (dotLines.length > 0) {
              cells = parseDotAsteriskPattern(dotLines);
            }
          }

          if (cells.length > 0) {
            cells = normalizeCells(cells);
            const dimensions = calculateDimensions(cells);

            patterns.push({
              ...currentPattern,
              cells,
              width: dimensions.width,
              height: dimensions.height,
              cellCount: cells.length,
            });

            console.log(
              `Found pattern: ${currentPattern.name} (${cells.length} cells)`,
            );
          }
        } catch (e) {
          console.warn(
            `Error processing pattern ${currentPattern?.name}:`,
            e.message,
          );
        }
      }

      // Start new pattern
      const parsed = parseDefinitionLine(line);
      if (parsed) {
        currentPattern = parsed;
        patternLines = [];
        inPattern = true;
      }
    } else if (currentPattern && inPattern) {
      // Collect pattern data lines
      if (
        line.startsWith("\t") ||
        line.includes("x = ") ||
        line.includes("$") ||
        line.includes("!")
      ) {
        patternLines.push(line);
      } else if (trimmed === "" || line.startsWith(":")) {
        // End of current pattern section
        inPattern = false;
      } else {
        patternLines.push(line);
      }
    }
  }

  // Handle last pattern
  if (currentPattern && patternLines.length > 0) {
    try {
      let cells = [];

      const hasRLE = patternLines.some(
        (l) => l.includes("x = ") && l.includes("y = "),
      );

      if (hasRLE) {
        const rleStart = patternLines.findIndex((l) => l.includes("x = "));
        if (rleStart >= 0) {
          const rleLines = patternLines.slice(rleStart);
          const rleText = rleLines.join("\n");
          try {
            const parsed = parseRLE(rleText);
            cells = parsed.cells || [];
          } catch (e) {
            console.warn(
              `Failed to parse RLE for ${currentPattern.name}:`,
              e.message,
            );
          }
        }
      } else {
        const dotLines = patternLines
          .filter(
            (l) => l.includes(".") && l.includes("*") && l.startsWith("\t"),
          )
          .map((l) => l.substring(1));

        if (dotLines.length > 0) {
          cells = parseDotAsteriskPattern(dotLines);
        }
      }

      if (cells.length > 0) {
        cells = normalizeCells(cells);
        const dimensions = calculateDimensions(cells);

        patterns.push({
          ...currentPattern,
          cells,
          width: dimensions.width,
          height: dimensions.height,
          cellCount: cells.length,
        });

        console.log(
          `Found pattern: ${currentPattern.name} (${cells.length} cells)`,
        );
      }
    } catch (e) {
      console.warn(
        `Error processing final pattern ${currentPattern?.name}:`,
        e.message,
      );
    }
  }

  console.log(`\nFound ${patterns.length} patterns total`);
  return patterns;
}

// Import patterns into database
async function importPatterns(patterns) {
  console.log("\nImporting patterns into database...");

  let imported = 0;
  let skipped = 0;

  for (const pattern of patterns) {
    try {
      // Create shape object
      const shape = {
        id: uuidv4(),
        name: pattern.name,
        description:
          pattern.description ||
          `Pattern from Life Lexicon${pattern.metadata ? ` (${pattern.metadata})` : ""}`,
        width: pattern.width,
        height: pattern.height,
        cells: pattern.cells,
        cellCount: pattern.cellCount,
        type: "lexicon",
        meta: {
          source: "lexicon-import",
          metadata: pattern.metadata,
          description: pattern.description,
          importedAt: new Date().toISOString(),
        },
      };

      // Check if pattern already exists
      const existing = await db.listShapes();
      const exists = existing.find((s) => s.name === pattern.name);

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
    console.log("=== Life Lexicon Pattern Importer ===\n");

    // Check if lexicon file exists
    try {
      await fs.access(LEXICON_FILE);
    } catch (e) {
      console.error(`Lexicon file not found: ${LEXICON_FILE}`);
      process.exit(1);
    }

    // Parse patterns
    const patterns = await parseLexicon();

    if (patterns.length === 0) {
      console.log("No patterns found in lexicon file");
      return;
    }

    // Show statistics
    console.log("\n=== Pattern Statistics ===");
    console.log(`Total patterns: ${patterns.length}`);

    const bySize = patterns.reduce(
      (acc, p) => {
        const size = p.cellCount;
        if (size <= 10) acc.small++;
        else if (size <= 50) acc.medium++;
        else if (size <= 200) acc.large++;
        else acc.huge++;
        return acc;
      },
      { small: 0, medium: 0, large: 0, huge: 0 },
    );

    console.log(`Small (≤10 cells): ${bySize.small}`);
    console.log(`Medium (11-50 cells): ${bySize.medium}`);
    console.log(`Large (51-200 cells): ${bySize.large}`);
    console.log(`Huge (>200 cells): ${bySize.huge}`);

    // Ask for confirmation
    console.log("\nReady to import patterns into database...");

    // Import patterns
    await importPatterns(patterns);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { parseLexicon, importPatterns };
