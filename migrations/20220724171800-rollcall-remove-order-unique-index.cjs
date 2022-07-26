module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls
      DROP CONSTRAINT unique_order;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls
      ADD CONSTRAINT unique_order UNIQUE (group_id, sort_order);
    `)
  },
}
