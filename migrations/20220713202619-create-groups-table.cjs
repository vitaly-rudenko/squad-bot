module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE groups (
        id VARCHAR PRIMARY KEY,
        title VARCHAR,
        updated_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE groups;
    `)
  },
}
