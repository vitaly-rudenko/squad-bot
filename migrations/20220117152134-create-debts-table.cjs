module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE debts (
        id serial PRIMARY KEY,
        debtor_id INTEGER,
        receipt INTEGER,
        amount INTEGER
      );
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE debts;
    `)
  },
}
