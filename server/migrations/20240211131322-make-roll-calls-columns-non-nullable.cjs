module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls
        ALTER COLUMN group_id SET NOT NULL,
        ALTER COLUMN message_pattern SET NOT NULL,
        ALTER COLUMN exclude_sender SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls
        ALTER COLUMN group_id DROP NOT NULL,
        ALTER COLUMN message_pattern DROP NOT NULL,
        ALTER COLUMN exclude_sender DROP NOT NULL;
    `)
  },
}
