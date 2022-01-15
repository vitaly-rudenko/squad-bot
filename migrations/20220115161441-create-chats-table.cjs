module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      CREATE TABLE chats (
        id VARCHAR PRIMARY KEY,
        spreadsheet_id VARCHAR,
        members_sheet_id VARCHAR,
        receipts_sheet_id VARCHAR
      );
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down(db) {
    await db.query(`
      DROP TABLE chats;
    `)
  },
}
