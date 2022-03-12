module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE debts (
        id SERIAL PRIMARY KEY,
        receipt_id VARCHAR,
        debtor_id VARCHAR,
        amount INTEGER
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE debts;
    `)
  },
}
