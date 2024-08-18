module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE chat_users (
        chat_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        PRIMARY KEY (chat_id, user_id)
      )
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    // noop
  },
}
