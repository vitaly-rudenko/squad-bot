module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE groups DROP COLUMN deleted_at;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE groups ADD COLUMN deleted_at TIMESTAMPTZ;
    `)
  },
}
