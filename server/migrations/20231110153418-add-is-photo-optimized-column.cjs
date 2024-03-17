module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
      ADD COLUMN is_photo_optimized BOOLEAN NOT NULL DEFAULT FALSE;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
      DROP COLUMN is_photo_optimized;
    `)
  },
}
