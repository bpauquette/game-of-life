import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { parseRLE } from "./rleParser.js";
import db from "./db.js";
import logger from "./logger.js";

const makeId = () => {
  return uuidv4();
};

// Helper function to ensure unique names
const ensureUniqueName = async (baseName, userId = null) => {
  const shapes = await db.listShapes();
  const existingNames = new Set(shapes.map((s) => s.name?.toLowerCase()));

  let uniqueName = baseName;
  let counter = 1;

  while (existingNames.has(uniqueName.toLowerCase())) {
    uniqueName = `${baseName} (${counter})`;
    counter++;
  }

  return uniqueName;
};

const start = async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(
    express.text({
      type: ["text/*", "application/octet-stream"],
      limit: "1mb",
    }),
  );

  app.get("/v1/health", (req, res) => res.json({ ok: true }));

  app.get("/v1/shapes", async (req, res) => {
    try {
      const q = (req.query.q || "").toLowerCase();
      const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const shapes = await db.listShapes();
      // filter by query if present
      const filtered = q
        ? shapes.filter((s) => (s.name || "").toLowerCase().includes(q))
        : shapes;
      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);
      // return full shape objects (including cells) for each page
      const items = page; // full objects
      res.json({ items, total });
    } catch (err) {
      logger.error("shapes list error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/v1/shapes/:id", async (req, res) => {
    const s = await db.getShape(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });
    res.json(s);
  });

  app.delete("/v1/shapes/:id", async (req, res) => {
    try {
      const ok = await db.deleteShape(req.params.id);
      if (!ok) return res.status(404).json({ error: "not found" });
      res.status(204).end();
    } catch (err) {
      logger.error("delete error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Allow adding a full shape object (used by UI and capture tool)
  app.post("/v1/shapes", async (req, res) => {
    try {
      const shape = req.body;
      if (!shape || typeof shape !== "object")
        return res.status(400).json({ error: "shape object required" });

      // Generate UUID if no ID provided
      if (!shape.id) {
        shape.id = makeId();
      }

      // Ensure unique name if provided
      if (shape.name) {
        shape.name = await ensureUniqueName(shape.name);
      }

      // Add metadata
      shape.meta = shape.meta || {};
      shape.meta.createdAt = shape.meta.createdAt || new Date().toISOString();
      shape.meta.source = shape.meta.source || "user-created";

      // Add to DB
      await db.addShape(shape);
      res.status(201).json(shape);
    } catch (err) {
      logger.error("add shape error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/v1/import-rle", async (req, res) => {
    try {
      let rleText = null;
      if (req.is("application/json") && req.body?.rle) rleText = req.body.rle;
      else if (typeof req.body === "string" && req.body.trim().length > 0)
        rleText = req.body;
      if (!rleText)
        return res.status(400).json({
          error:
            'No RLE found in request body; send JSON {rle: "..."} or text/plain body',
        });

      const shape = parseRLE(rleText);
      shape.id = makeId();

      // Ensure unique name if provided
      if (shape.name) {
        shape.name = await ensureUniqueName(shape.name);
      }

      shape.meta = shape.meta || {};
      shape.meta.importedAt = new Date().toISOString();
      shape.meta.source = "rle-import";

      await db.addShape(shape);
      res.status(201).json(shape);
    } catch (err) {
      logger.error("import error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Grid state management endpoints
  app.get("/v1/grids", async (req, res) => {
    try {
      const grids = await db.listGrids();
      // Return metadata only (exclude cells for list view)
      const gridList = grids.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        generation: g.generation,
        liveCells: g.liveCells ? g.liveCells.length : 0,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }));
      res.json(gridList);
    } catch (err) {
      logger.error("grids list error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/v1/grids/:id", async (req, res) => {
    try {
      const grid = await db.getGrid(req.params.id);
      if (!grid) return res.status(404).json({ error: "Grid not found" });
      res.json(grid);
    } catch (err) {
      logger.error("get grid error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/v1/grids", async (req, res) => {
    try {
      const { name, description, liveCells, generation } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Grid name is required" });
      }

      if (!Array.isArray(liveCells)) {
        return res.status(400).json({ error: "liveCells array is required" });
      }

      const grid = {
        id: makeId(),
        name: name.trim(),
        description: description || "",
        liveCells,
        generation: generation || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.saveGrid(grid);
      res.status(201).json(grid);
    } catch (err) {
      logger.error("save grid error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/v1/grids/:id", async (req, res) => {
    try {
      const existingGrid = await db.getGrid(req.params.id);
      if (!existingGrid)
        return res.status(404).json({ error: "Grid not found" });

      const { name, description, liveCells, generation } = req.body;

      const updatedGrid = {
        ...existingGrid,
        name: name || existingGrid.name,
        description: description ?? existingGrid.description,
        liveCells: liveCells || existingGrid.liveCells,
        generation: generation ?? existingGrid.generation,
        updatedAt: new Date().toISOString(),
      };

      await db.saveGrid(updatedGrid);
      res.json(updatedGrid);
    } catch (err) {
      logger.error("update grid error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/v1/grids/:id", async (req, res) => {
    try {
      const ok = await db.deleteGrid(req.params.id);
      if (!ok) return res.status(404).json({ error: "Grid not found" });
      res.status(204).end();
    } catch (err) {
      logger.error("delete grid error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // demo route to create a glider pattern quickly
  app.post("/v1/demo/load-glider", async (req, res) => {
    const gliderRLE = `#N Glider\nx = 3, y = 3\nbo$2bo$3o!`;
    const shape = parseRLE(gliderRLE);
    shape.id = makeId();
    shape.meta = shape.meta || {};
    shape.meta.importedAt = new Date().toISOString();
    await db.addShape(shape);
    res.status(201).json(shape);
  });

  // Port selection priority:
  // 1) GOL_BACKEND_PORT env var
  // 2) PORT env var (common)
  // 3) default 55000
  const port = process.env.GOL_BACKEND_PORT || process.env.PORT || 55000;
  app.listen(port, () =>
    logger.info(`Shapes catalog backend listening on ${port}`),
  );
};

// Use top-level await instead of async IIFE
try {
  await start();
} catch (err) {
  console.error("Failed to start server:", err);
  process.exit(1);
}
