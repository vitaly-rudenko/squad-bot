module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE debts
        ALTER COLUMN receipt_id SET NOT NULL,
        ALTER COLUMN debtor_id SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE debts
        ALTER COLUMN receipt_id DROP NOT NULL,
        ALTER COLUMN debtor_id DROP NOT NULL;
    `)
  },
}
