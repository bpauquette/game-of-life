import { generateShapeSignature } from '../src/shapeSignature.js';

import { SQLiteDatabase } from '../src/sqlite-db.js';

async function updateSignatures() {
  const db = new SQLiteDatabase();
  const database = await db.connect();

  try {
    const shapes = await database.all('SELECT id, name, signature, rle_text FROM shapes');
    let updatedCount = 0;

    for (const shape of shapes) {
      try {
        if (!shape.rle_text) {
          console.log(`No RLE for ${shape.name}, skipping`);
          continue;
        }

        const signature = generateShapeSignature(shape.rle_text);

        await database.run('UPDATE shapes SET signature = ? WHERE id = ?', [signature, shape.id]);
        updatedCount++;
        console.log(`Updated ${shape.name}: ${signature}`);
      } catch (error) {
        console.error(`Failed to update ${shape.name}:`, error.message);
      }
    }

    console.log(`Updated signatures for ${updatedCount} shapes`);
  } finally {
    await db.close();
  }
}

updateSignatures().catch(console.error);