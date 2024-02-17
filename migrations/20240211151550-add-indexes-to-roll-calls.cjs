module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE INDEX roll_calls_group_id_idx
        ON roll_calls (group_id, sort_order DESC);
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      DROP INDEX roll_calls_group_id_idx;
    `)
  },
}
