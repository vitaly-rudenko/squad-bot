module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
        ALTER COLUMN amount TYPE int USING (COALESCE(amount, 0)),
        ALTER COLUMN amount SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE receipts
        ALTER COLUMN amount DROP NOT NULL;
    `)
  },
}
