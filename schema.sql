-- SQLite schema for Conway's Game of Life patterns
-- Optimized for 10k+ patterns with efficient storage and querying

-- Main shapes table
CREATE TABLE shapes (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- Pattern name
    slug TEXT,                              -- URL-friendly name
    description TEXT,                       -- Pattern description
    rule TEXT DEFAULT 'B3/S23',             -- Game rule (usually B3/S23)
    width INTEGER,                          -- Pattern width
    height INTEGER,                         -- Pattern height
    population INTEGER,                     -- Number of live cells
    period INTEGER DEFAULT 1,               -- Oscillation period (1 = still life)
    speed TEXT,                             -- Speed (c/n for spaceships)
    user_id TEXT DEFAULT 'system',          -- Owner ('system' for imported)
    source_url TEXT,                        -- Original source URL
    rle_text TEXT,                          -- RLE encoded pattern (compact storage)
    cells_json TEXT,                        -- Parsed cells as compressed JSON blob
    thumbnail_svg TEXT,                     -- SVG thumbnail (small)
    thumbnail_png BLOB,                     -- PNG thumbnail (medium)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,            -- Soft delete flag
    search_vector TEXT                      -- FTS search data
);

-- User-saved grids (game states)
CREATE TABLE grids (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- Grid name
    data TEXT NOT NULL,                     -- JSON serialized grid data
    user_id TEXT NOT NULL,                  -- Owner user ID
    generation INTEGER DEFAULT 0,           -- Generation number when saved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_shapes_user_id ON shapes(user_id);
CREATE INDEX idx_shapes_name ON shapes(name);
CREATE INDEX idx_shapes_population ON shapes(population);
CREATE INDEX idx_shapes_period ON shapes(period);
CREATE INDEX idx_shapes_width_height ON shapes(width, height);
CREATE INDEX idx_shapes_created_at ON shapes(created_at DESC);

-- Indexes for grids
CREATE INDEX idx_grids_user_id ON grids(user_id);
CREATE INDEX idx_grids_created_at ON grids(created_at DESC);

-- Full-text search virtual table for pattern names and descriptions
CREATE VIRTUAL TABLE shapes_fts USING fts5(
    shape_id UNINDEXED,                    -- Reference to shapes.id
    name,                                  -- Pattern name
    description,                           -- Description
    content=shapes,                        -- Source table
    content_rowid=rowid                    -- Rowid from shapes table
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER shapes_fts_insert AFTER INSERT ON shapes
BEGIN
    INSERT INTO shapes_fts(rowid, shape_id, name, description)
    VALUES (new.rowid, new.id, new.name, new.description);
END;

CREATE TRIGGER shapes_fts_delete AFTER DELETE ON shapes
BEGIN
    DELETE FROM shapes_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER shapes_fts_update AFTER UPDATE ON shapes
BEGIN
    UPDATE shapes_fts SET
        name = new.name,
        description = new.description
    WHERE rowid = new.rowid;
END;

-- Metadata key-value storage (flexible extension)
CREATE TABLE shape_metadata (
    shape_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (shape_id, key),
    FOREIGN KEY (shape_id) REFERENCES shapes(id) ON DELETE CASCADE
);

-- Tags for categorization
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT,                            -- Hex color for UI
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shape_tags (
    shape_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (shape_id, tag_id),
    FOREIGN KEY (shape_id) REFERENCES shapes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Pattern collections/playlists
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT,
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collection_shapes (
    collection_id TEXT NOT NULL,
    shape_id TEXT NOT NULL,
    position INTEGER,                      -- Order in collection
    notes TEXT,                            -- User notes
    PRIMARY KEY (collection_id, shape_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (shape_id) REFERENCES shapes(id) ON DELETE CASCADE
);

-- User favorites
CREATE TABLE user_favorites (
    user_id TEXT NOT NULL,
    shape_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, shape_id),
    FOREIGN KEY (shape_id) REFERENCES shapes(id) ON DELETE CASCADE
);

-- Pattern ratings (optional)
CREATE TABLE shape_ratings (
    shape_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shape_id, user_id),
    FOREIGN KEY (shape_id) REFERENCES shapes(id) ON DELETE CASCADE
);

-- Migration tracking
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Views for common queries
CREATE VIEW shape_stats AS
SELECT
    COUNT(*) as total_shapes,
    AVG(population) as avg_population,
    MAX(population) as max_population,
    AVG(width) as avg_width,
    AVG(height) as avg_height,
    COUNT(CASE WHEN period = 1 THEN 1 END) as still_lives,
    COUNT(CASE WHEN period > 1 THEN 1 END) as oscillators,
    COUNT(CASE WHEN speed IS NOT NULL THEN 1 END) as spaceships
FROM shapes
WHERE is_active = 1;

-- Index for efficient pagination
CREATE INDEX idx_shapes_popular ON shapes(population DESC, created_at DESC);