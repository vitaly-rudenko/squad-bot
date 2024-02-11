module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE groups
        ALTER COLUMN title SET NOT NULL,
        ALTER COLUMN updated_at SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE groups
        ALTER COLUMN title DROP NOT NULL,
        ALTER COLUMN updated_at DROP NOT NULL;
    `)
  },
}
