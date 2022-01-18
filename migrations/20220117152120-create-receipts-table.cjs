module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE receipts (
        id VARCHAR PRIMARY KEY,
        created_at TIMESTAMPTZ,
        payer_id VARCHAR,
        amount INTEGER,
        description TEXT
      );
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE receipts;
    `)
  },
}
