module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE INDEX users_query_trgm_idx
        ON users USING GIN (query gin_trgm_ops);
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP INDEX users_query_trgm_idx;
    `)
  },
}
