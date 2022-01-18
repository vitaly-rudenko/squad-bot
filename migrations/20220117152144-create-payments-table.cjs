module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE payments (
        id serial PRIMARY KEY,
        date TIMESTAMPTZ,
        from_user_id INTEGER,
        to_user_id INTEGER,
        amount INTEGER
      );
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE payments;
    `)
  },
}
