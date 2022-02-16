module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE debts 
      RENAME COLUMN debtor_id TO user_id;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE debts 
      RENAME COLUMN user_id TO debtor_id;
    `)
  },
}
