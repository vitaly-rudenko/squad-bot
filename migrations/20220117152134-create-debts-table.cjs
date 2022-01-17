module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE debts (
        id serial PRIMARY KEY,
        debtor integer,
        receipt integer,
        amount integer
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
