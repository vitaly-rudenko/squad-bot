module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN payer_id SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
        ALTER COLUMN created_at DROP NOT NULL,
        ALTER COLUMN payer_id DROP NOT NULL;
    `)
  },
}
