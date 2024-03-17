module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    try {
      await db.query(`
        BEGIN;

        ALTER TABLE receipts
          ADD COLUMN has_photo BOOLEAN NOT NULL DEFAULT false;

        UPDATE receipts
          SET has_photo = true
          WHERE photo IS NOT NULL;

        COMMIT;
      `)
    } catch (err) {
      await db.query('ROLLBACK;')
      throw err
    }
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE receipts DROP COLUMN has_photo;
    `)
  },
}
