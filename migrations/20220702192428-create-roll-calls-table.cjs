module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE roll_calls (
        id SERIAL PRIMARY KEY,
        chat_id VARCHAR,
        message_pattern VARCHAR,
        users_pattern VARCHAR,
        exclude_sender BOOLEAN,
        poll_options VARCHAR ARRAY,
        deleted_at TIMESTAMPTZ
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE roll_calls;
    `)
  },
}
