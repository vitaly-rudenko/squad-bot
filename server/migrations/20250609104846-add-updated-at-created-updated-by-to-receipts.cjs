module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    try {
      await db.query(`
        BEGIN;

        ALTER TABLE receipts
          ADD COLUMN updated_at TIMESTAMPTZ,
          ADD COLUMN created_by_user_id VARCHAR,
          ADD COLUMN updated_by_user_id VARCHAR;

        UPDATE receipts
        SET updated_at = created_at
          , created_by_user_id = payer_id
          , updated_by_user_id = payer_id;

        ALTER TABLE receipts
          ALTER COLUMN updated_at SET NOT NULL,
          ALTER COLUMN created_by_user_id SET NOT NULL,
          ALTER COLUMN updated_by_user_id SET NOT NULL;

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

        ALTER TABLE receipts
          DROP COLUMN updated_at,
          DROP COLUMN created_by_user_id,
          DROP COLUMN updated_by_user_id;

        COMMIT;
      `)
    } catch (err) {
      await db.query('ROLLBACK;')
      throw err
    }
  },
}
