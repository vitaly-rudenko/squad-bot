module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      UPDATE cards
      SET number = replace(number, ' ', '');
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    // stub
  },
}
