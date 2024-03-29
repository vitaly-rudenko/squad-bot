module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    try {
      await db.query(`
        BEGIN;

        -- unique index
        CREATE UNIQUE INDEX cards_unique_idx
          ON cards (user_id, number);

        -- search by user
        CREATE INDEX cards_user_id_idx
          ON cards (user_id);

        COMMIT;
      `)
    } catch (err) {
      await db.query('ROLLBACK;')
      throw err
    }
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    try {
      await db.query(`
        BEGIN;

        DROP INDEX cards_unique_idx;
        DROP INDEX cards_user_id_idx;

        COMMIT;
      `)
    } catch (err) {
      await db.query('ROLLBACK;')
      throw err
    }
  },
}
