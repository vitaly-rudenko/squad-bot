module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE users
      DROP COLUMN is_complete;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE users
      ADD COLUMN is_complete BOOLEAN NOT NULL DEFAULT TRUE;
    `)
  },
}
