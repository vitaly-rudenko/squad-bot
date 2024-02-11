module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE INDEX memberships_updated_at_idx
        ON memberships (updated_at ASC);
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP INDEX memberships_updated_at_idx;
    `)
  },
}
