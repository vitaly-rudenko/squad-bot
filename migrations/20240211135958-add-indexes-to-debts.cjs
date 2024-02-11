module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    try {
      await db.query(`
        BEGIN;

        -- use composite primary key instead of id
        ALTER TABLE debts DROP CONSTRAINT debts_pkey;
        ALTER TABLE debts DROP COLUMN id;

        CREATE UNIQUE INDEX debts_unique_idx
          ON debts (receipt_id, debtor_id, deleted_at)
          WHERE deleted_at IS NULL;

        -- search by receipt
        CREATE INDEX debts_receipt_id_idx
          ON debts (receipt_id, deleted_at);

        -- aggregate debts
        CREATE INDEX debts_debtor_id_idx
          ON debts (debtor_id, deleted_at)
          INCLUDE (amount);

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

        DROP INDEX debts_debtor_id_idx;
        DROP INDEX debts_receipt_id_idx;
        DROP INDEX debts_unique_idx;

        ALTER TABLE debts ADD COLUMN id SERIAL PRIMARY KEY;

        COMMIT;
      `)
    } catch (err) {
      await db.query('ROLLBACK;')
      throw err
    }
  },
}
