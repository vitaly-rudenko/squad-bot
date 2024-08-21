module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE groups
      ADD COLUMN social_link_fix_enabled_at TIMESTAMP;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE groups
      DROP COLUMN social_link_fix_enabled_at;
    `);
  },
}
