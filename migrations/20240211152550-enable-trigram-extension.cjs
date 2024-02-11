module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP EXTENSION IF EXISTS pg_trgm;
    `)
  },
}
