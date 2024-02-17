module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    try {
      await db.query(`
        BEGIN;

        CREATE INDEX receipts_payer_id_idx
          ON receipts (payer_id, deleted_at);

        CREATE INDEX receipts_created_at_idx
          ON receipts (created_at DESC, deleted_at);

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

        DROP INDEX receipts_payer_id_idx;
        DROP INDEX receipts_created_at_idx;

        COMMIT;
      `)
    } catch (err) {
      await db.query('ROLLBACK;')
      throw err
    }
  },
}
