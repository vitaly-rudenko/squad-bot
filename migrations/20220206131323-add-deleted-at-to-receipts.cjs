module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
      ADD COLUMN deleted_at TIMESTAMPTZ;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
      DROP COLUMN deleted_at;
    `)
  },
}
