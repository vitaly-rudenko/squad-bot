module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE payments
      ADD COLUMN deleted_at TIMESTAMPTZ;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE payments
      DROP COLUMN deleted_at;
    `)
  },
}
