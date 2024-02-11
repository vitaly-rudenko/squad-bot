module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls DROP COLUMN deleted_at;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls ADD COLUMN deleted_at TIMESTAMPTZ;
    `)
  },
}
