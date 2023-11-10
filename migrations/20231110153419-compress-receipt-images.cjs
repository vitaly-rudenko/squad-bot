module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    const { compressImage } = await import('../app/utils/compressImage.js')

    const { rows: receipts } = await db.query(`
      SELECT r.id
      FROM receipts r
      WHERE r.photo IS NOT NULL AND is_photo_optimized IS FALSE
      ORDER BY created_at ASC;
    `)

    for (const receipt of receipts) {
      const receiptId = receipt['id']
      console.log(`Compressing ${receiptId}...`)

      const { rows: [{ photo }] } = await db.query(`
        SELECT r.photo
        FROM receipts r
        WHERE r.id = $1;
      `, [receiptId])

      const compressedPhoto = await compressImage(photo)

      await db.query(`
        UPDATE receipts
        SET photo = $2, mime = $3, is_photo_optimized = TRUE
        WHERE id = $1;
      `, [receiptId, compressedPhoto, 'image/jpeg'])
    }
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    // not supported
  },
}
