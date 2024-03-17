const path = require('path')
const fs = require('fs/promises')

module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    const nanoid = await import('nanoid');
    const dictionary = await import('nanoid-dictionary');

    const generateId = nanoid.customAlphabet(dictionary.alphanumeric, 16);

    try {
      await db.query('BEGIN;');

      await db.query(`
        ALTER TABLE receipts ADD COLUMN photo_filename VARCHAR;
        CREATE UNIQUE INDEX receipts_photo_filename_idx
          ON receipts (photo_filename)
          WHERE photo_filename IS NOT NULL;
      `)

      await fs.mkdir('files/photos', { recursive: true })

      const { rows: [{ count }] } = await db.query(`
        SELECT COUNT(*) as count
        FROM receipts
        WHERE photo IS NOT NULL AND photo_filename IS NULL;
      `)

      let processed = 0
      while (true) {
        const { rows } = await db.query(`
          SELECT id, photo, mime
          FROM receipts
          WHERE photo IS NOT NULL AND photo_filename IS NULL
          LIMIT 10;
        `)

        processed += rows.length
        console.log(`Processed ${processed} of ${count} receipts`)

        if (rows.length === 0) break

        for (const row of rows) {
          const photoFilename = `${generateId()}.${row.mime === 'image/jpeg' ? 'jpg' : 'png'}`
          const photoPath = path.join('files', 'photos', photoFilename)

          await fs.writeFile(photoPath, row.photo, { flag: 'w' })

          await db.query(`
            UPDATE receipts
            SET photo_filename = $2
            WHERE id = $1;
          `, [row.id, photoFilename])
        }
      }

      await db.query(`
        ALTER TABLE receipts
          DROP COLUMN photo,
          DROP COLUMN mime,
          DROP COLUMN has_photo;
      `)

      await db.query('COMMIT;');
    } catch (err) {
      await db.query('ROLLBACK;');
      throw err;
    }
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP INDEX receipts_photo_filename_idx;
      ALTER TABLE receipts
        ADD COLUMN photo BYTEA,
        ADD COLUMN mime VARCHAR,
        ADD COLUMN has_photo BOOLEAN NOT NULL DEFAULT FALSE,
        DROP COLUMN photo_filename;
    `)
  },
}
