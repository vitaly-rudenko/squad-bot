module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      DROP TABLE chat_users;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    // noop
  },
}
