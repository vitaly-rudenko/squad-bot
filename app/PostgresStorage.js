import { v4 as uuid } from 'uuid'
import { toNullableAmount } from './utils/toNullableAmount.js'

export class PostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client, debtsStorage) {
    this._client = client
    this._debtsStorage = debtsStorage
  }

  async createReceipt({ payerId, amount, description = null, photo = null, mime = null }) {
    const response = await this._client.query(`
      INSERT INTO receipts (id, created_at, payer_id, amount, description, photo, mime)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `, [uuid(), new Date().toISOString(), payerId, amount, description, photo, mime])

    return response.rows[0]['id']
  }

  async updateReceipt({ id, payerId, amount, description = null, photo = null, mime = null }) {
    await this._client.query(`
      UPDATE receipts
      SET payer_id = $2, amount = $3, description = $4, photo = $5, mime = $6
      WHERE id = $1
    `, [id, payerId, amount, description, photo, mime])
  }

  async deleteReceiptById(receiptId) {
    await this._client.query(`
      UPDATE receipts
      SET deleted_at = NOW()
      WHERE id = $1;
    `, [receiptId])
  }

  async findReceiptById(receiptId) {
    const response = await this._client.query(`
      SELECT r.id, r.created_at, r.payer_id, r.amount, r.description, (CASE WHEN r.photo IS NULL THEN FALSE ELSE TRUE END) as has_photo
      FROM receipts r
      WHERE r.id = $1
        AND r.deleted_at IS NULL;
    `, [receiptId])

    if (response.rowCount === 0) {
      return null
    }

    return await this.deserializeReceipt(response.rows[0])
  }

  async getReceiptPhoto(receiptId) {
    const response = await this._client.query(`
      SELECT r.photo, r.mime
      FROM receipts r
      WHERE r.id = $1
        AND r.deleted_at IS NULL;
    `, [receiptId])

    if (response.rowCount === 0 || !response.rows[0]['photo'] || !response.rows[0]['mime']) {
      return null
    }

    return {
      photo: response.rows[0]['photo'],
      mime: response.rows[0]['mime'],
    }
  }

  async findReceiptsByParticipantUserId(userId) {
    const response = await this._client.query(`
      SELECT DISTINCT r.id, r.created_at, r.payer_id, r.amount, r.description, (CASE WHEN r.photo IS NULL THEN FALSE ELSE TRUE END) as has_photo, r.deleted_at
      FROM receipts r
      LEFT JOIN debts d ON d.receipt_id = r.id
      WHERE (r.payer_id = $1 OR d.debtor_id = $1)
        AND r.deleted_at IS NULL
        AND d.deleted_at IS NULL
      ORDER BY created_at DESC;
    `, [userId])

    const receipts = []

    for (const row of response.rows) {
      receipts.push(await this.deserializeReceipt(row))
    }

    return receipts
  }

  async findReceiptsByIds(receiptIds) {
    if (receiptIds.length === 0) return []

    const response = await this._client.query(`
      SELECT DISTINCT r.id, r.created_at, r.payer_id, r.amount, r.description, (CASE WHEN r.photo IS NULL THEN FALSE ELSE TRUE END) as has_photo
      FROM receipts r
      WHERE id IN (${receiptIds.map((_, i) => `$${i + 1}`)})
        AND r.deleted_at IS NULL
      ORDER BY created_at DESC;
    `, [...receiptIds])

    const receipts = []

    for (const row of response.rows) {
      receipts.push(await this.deserializeReceipt(row))
    }

    return receipts
  }

  async deserializeReceipt(row) {
    return {
      id: row['id'],
      createdAt: new Date(row['created_at']),
      payerId: row['payer_id'],
      amount: toNullableAmount(row['amount']),
      description: row['description'],
      hasPhoto: row['has_photo'],
      debts: await this._debtsStorage.findByReceiptId(row['id'])
    }
  }
}