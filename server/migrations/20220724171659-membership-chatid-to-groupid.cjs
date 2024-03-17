module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE memberships
      RENAME COLUMN chat_id TO group_id;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE memberships
      RENAME COLUMN group_id TO chat_id;
    `)
  },
}
