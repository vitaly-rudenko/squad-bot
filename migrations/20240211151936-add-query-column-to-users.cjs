module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE users
        ADD COLUMN query VARCHAR GENERATED ALWAYS AS (
          CASE
            WHEN username IS NOT NULL THEN name || ' ' || username
            ELSE name
          END
        ) STORED NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE users DROP COLUMN query;
    `)
  },
}
