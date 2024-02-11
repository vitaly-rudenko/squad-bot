module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE INDEX receipts_payer_id_idx
        ON receipts (payer_id, deleted_at);
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP INDEX receipts_payer_id_idx;
    `)
  },
}
