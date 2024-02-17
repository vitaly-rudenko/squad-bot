module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE users ALTER COLUMN name SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE users ALTER COLUMN name DROP NOT NULL;
    `)
  },
}
