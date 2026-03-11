module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE groups
      ADD COLUMN voice_transcription_enabled_at TIMESTAMP;
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE groups
      DROP COLUMN voice_transcription_enabled_at;
    `)
  },
}
