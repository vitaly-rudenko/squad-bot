module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(
      `ALTER TABLE roll_calls
       ADD COLUMN is_multiselect_poll BOOLEAN NOT NULL DEFAULT FALSE,
       ADD COLUMN is_anonymous_poll BOOLEAN NOT NULL DEFAULT FALSE;`
    )
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(
      `ALTER TABLE roll_calls
       DROP COLUMN is_multiselect_poll,
       DROP COLUMN is_anonymous_poll;`
    )
  },
}
