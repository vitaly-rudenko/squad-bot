module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE payments (
        id serial PRIMARY KEY,
        date datetime,
        from_user integer,
        to_user integer,
        amount integer
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
