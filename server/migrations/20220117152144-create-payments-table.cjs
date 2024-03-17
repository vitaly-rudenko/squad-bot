module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ,
        from_user_id VARCHAR,
        to_user_id VARCHAR,
        amount INTEGER
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE payments;
    `)
  },
}
