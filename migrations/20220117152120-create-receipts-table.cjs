module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE receipts (
        id serial PRIMARY KEY,
        date datetime,
        payer integer,
        amount integer,
        description text
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
