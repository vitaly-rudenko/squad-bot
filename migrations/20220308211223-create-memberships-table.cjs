module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE memberships (
        user_id VARCHAR,
        chat_id VARCHAR,
        updated_at TIMESTAMPTZ,
        PRIMARY KEY (user_id, chat_id)
      );
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP TABLE memberships;
    `)
  },
}
