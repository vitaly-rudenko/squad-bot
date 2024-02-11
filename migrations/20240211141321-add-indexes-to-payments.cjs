module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    try {
      await db.query(`
        BEGIN;

        CREATE INDEX payments_from_user_id_idx
          ON payments (from_user_id, deleted_at)
          INCLUDE (amount);

        CREATE INDEX payments_to_user_id_idx
          ON payments (to_user_id, deleted_at)
          INCLUDE (amount);

        CREATE INDEX payments_created_at_idx
          ON payments (created_at DESC, deleted_at);

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

        DROP INDEX payments_created_at_idx;
        DROP INDEX payments_to_user_id_idx;
        DROP INDEX payments_from_user_id_idx;

        COMMIT;
      `)
    } catch (err) {
      await db.query('ROLLBACK;')
      throw err
    }
  },
}
