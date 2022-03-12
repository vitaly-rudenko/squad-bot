module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE cards (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR,
        number VARCHAR,
        bank BANK
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE cards;
    `)
  },
}
