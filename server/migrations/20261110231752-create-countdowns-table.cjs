module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE countdowns (
        id SERIAL PRIMARY KEY,
        chat_id VARCHAR,
        title VARCHAR,
        ends_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        next_reminder_at TIMESTAMPTZ
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE countdowns;
    `)
  },
}
