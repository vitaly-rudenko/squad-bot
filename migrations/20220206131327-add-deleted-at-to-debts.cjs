module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE debts
      ADD COLUMN deleted_at TIMESTAMPTZ;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE debts
      DROP COLUMN deleted_at;
    `)
  },
}
