module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE receipts (
        id serial PRIMARY KEY,
        date TIMESTAMPTZ,
        payer_id INTEGER,
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
