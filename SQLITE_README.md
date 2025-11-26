# SQLite Database Schema for Conway's Game of Life Patterns

This schema is optimized for storing and querying thousands of Game of Life patterns efficiently.

## Schema Overview

### Core Tables

#### `shapes` - Main pattern storage
- **Storage**: RLE text (compact) + compressed JSON cells (fast retrieval)
- **Indexing**: Name, user, population, dimensions, creation date
- **Features**: Full-text search, soft deletes, metadata support

#### `shape_metadata` - Flexible key-value metadata
- Extensible storage for author, comments, source URLs, etc.
- One-to-many relationship with shapes

#### `tags` & `shape_tags` - Pattern categorization
- Predefined tags: still-life, oscillator, spaceship, gun, etc.
- Many-to-many relationship for flexible tagging

#### `collections` & `collection_shapes` - User-created pattern collections
- Like playlists for organizing patterns
- Ordered storage with user notes

#### `user_favorites` - User favorites system
- Simple many-to-many for favoriting patterns

#### `shape_ratings` - Optional rating system
- 1-5 star ratings per user per pattern

## Performance Optimizations

### Storage Efficiency
- **RLE compression**: Patterns stored in standard RLE format (very compact)
- **Cells compression**: Parsed cell arrays compressed with pako/zlib
- **Binary thumbnails**: PNG thumbnails stored as BLOBs

### Query Performance
- **Indexes**: Optimized for common queries (name search, user filtering, size filtering)
- **FTS**: Full-text search virtual table for pattern names/descriptions
- **Pagination**: Efficient LIMIT/OFFSET support
- **WAL mode**: Better concurrency for multiple readers

### Data Statistics (Current Collection)
- **8,497 patterns** imported from LifeWiki
- **5.8 million total cells** across all patterns
- **Average 691 cells** per pattern (max: 362,214 cells)
- **Average dimensions**: 5,038 × 5,313 (some patterns are enormous!)

## Migration Process

### 1. Install Dependencies
```bash
npm install sqlite3 sqlite pako
```

### 2. Run Migration
```bash
cd backend
node scripts/migrate-to-sqlite.mjs
```

### 3. Switch Database Implementation
Update `backend/src/db.js` to use SQLite:
```javascript
// Replace the JSON-based implementation with:
export { default } from './sqlite-db.js';
```

## Query Examples

### Basic Operations
```javascript
import db from './src/sqlite-db.js';

// List all shapes
const shapes = await db.listShapes();

// Search by name
const results = await db.searchShapes('glider');

// Get user's shapes
const userShapes = await db.getShapesByUser('user123');

// Get patterns by tag
const oscillators = await db.getShapesByTag('oscillator');
```

### Advanced Queries
```sql
-- Find large patterns
SELECT name, population, width, height
FROM shapes
WHERE population > 1000
ORDER BY population DESC;

-- Find spaceships by speed
SELECT name, speed, population
FROM shapes
WHERE speed LIKE '%c/%'
ORDER BY CAST(SUBSTR(speed, 1, INSTR(speed, 'c/')-1) AS INTEGER) DESC;

-- Recent patterns by user
SELECT name, created_at
FROM shapes
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 10;
```

## API Compatibility

The SQLite implementation maintains the same API as the original JSON-based `db.js`:

- `listShapes()` - Get all shapes
- `getShape(id)` - Get single shape
- `getShapeByName(name)` - Find by name
- `addShape(shape)` - Insert/update shape
- `deleteShape(id)` - Soft delete
- Grid management functions (unchanged)

## Future Enhancements

### Potential Additions
- **Spatial indexing**: R-tree for cell coordinate queries
- **Pattern similarity**: Compare patterns using hashing
- **Evolution caching**: Store computed generations
- **User permissions**: Pattern sharing and collaboration
- **Analytics**: Pattern usage statistics

### Performance Monitoring
```sql
-- Query performance stats
SELECT
  COUNT(*) as total_shapes,
  AVG(population) as avg_population,
  MAX(population) as largest_pattern,
  COUNT(CASE WHEN period = 1 THEN 1 END) as still_lives,
  COUNT(CASE WHEN speed IS NOT NULL THEN 1 END) as spaceships
FROM shapes WHERE is_active = 1;
```

## File Structure
```
backend/
├── data/
│   ├── shapes.db          # SQLite database
│   └── shapes.json        # Legacy JSON (backup)
├── scripts/
│   └── migrate-to-sqlite.mjs  # Migration script
├── src/
│   ├── sqlite-db.js       # SQLite database wrapper
│   └── db.js              # Database interface (switchable)
└── schema.sql             # Database schema
```