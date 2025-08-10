module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE links (
        id SERIAL PRIMARY KEY,
        group_id VARCHAR,
        label VARCHAR,
        url VARCHAR
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE links;
    `)
  },
}
