module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE payments
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN from_user_id SET NOT NULL,
        ALTER COLUMN to_user_id SET NOT NULL,
        ALTER COLUMN amount SET NOT NULL;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE payments
        ALTER COLUMN created_at DROP NOT NULL,
        ALTER COLUMN from_user_id DROP NOT NULL,
        ALTER COLUMN to_user_id DROP NOT NULL,
        ALTER COLUMN amount DROP NOT NULL;
    `)
  },
}
