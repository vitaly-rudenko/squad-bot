module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE users
      ADD COLUMN locale LOCALE NOT NULL DEFAULT 'uk';
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE users
      DROP COLUMN locale;
    `)
  },
}
