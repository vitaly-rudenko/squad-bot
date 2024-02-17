module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE cards
        ALTER COLUMN user_id SET NOT NULL,
        ALTER COLUMN number SET NOT NULL,
        ALTER COLUMN bank SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE cards
        ALTER COLUMN user_id DROP NOT NULL,
        ALTER COLUMN number DROP NOT NULL,
        ALTER COLUMN bank DROP NOT NULL;
    `)
  },
}
