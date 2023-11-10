import { v4 as uuid } from 'uuid'
import { toNullableAmount } from '../utils/toNullableAmount.js'
import { Receipt } from './Receipt.js'
import { ReceiptPhoto } from './ReceiptPhoto.js'

export class ReceiptsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Receipt} receipt 
   * @param {ReceiptPhoto} [receiptPhoto] 
   */
  async create(receipt, receiptPhoto = null) {
    const { payerId, amount, description } = receipt
    const { binary = null, mime = null } = receiptPhoto || {}

    const response = await this._client.query(`
      INSERT INTO receipts (id, created_at, payer_id, amount, description, photo, mime, is_photo_optimized)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING id;
    `, [uuid(), new Date().toISOString(), payerId, amount, description, binary, mime])

    return this.findById(response.rows[0]['id'])
  }

  /**
   * @param {Receipt} receipt 
   * @param {ReceiptPhoto} [receiptPhoto] 
   */
  async update(receipt, receiptPhoto = null) {
    const { id, payerId, amount, description } = receipt
    const { binary = null, mime = null } = receiptPhoto || {}

    await this._client.query(`
      UPDATE receipts
      SET payer_id = $2, amount = $3, description = $4, photo = $5, mime = $6
      WHERE id = $1;
    `, [id, payerId, amount, description, binary, mime])

    return this.findById(id)
  }

  /** @param {string} id */
  async deleteById(id) {
    await this._client.query(`
      UPDATE receipts
      SET deleted_at = NOW()
      WHERE id = $1;
    `, [id])
  }

  /** @param {string} receiptId */
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

    return this.deserializeReceiptPhoto(response.rows[0])
  }

  async findByParticipantUserId(userId) {
    return this._find({ participantUserIds: [userId] })
  }

  /** @param {string} id */
  async findById(id) {
    const receipts = await this._find({ ids: [id] })
    return receipts.length > 0 ? receipts[0] : null
  }

  /** @param {string[]} ids */
  async findByIds(ids) {
    if (ids.length === 0) return []
    return this._find({ ids })
  }

  /**
   * @param {{
   *   ids?: string[],
   *   participantUserIds?: string[],
   *   limit?: number,
   *   offset?: number,
   * }} options 
   */
  async _find({ ids, participantUserIds, limit, offset } = {}) {
    const conditions = ['r.deleted_at IS NULL']
    const variables = []
    const joins = []

    let isDistinct = false

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`r.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
    }

    if (participantUserIds && Array.isArray(participantUserIds)) {
      if (participantUserIds.length === 0) {
        throw new Error('"participantUserIds" cannot be empty')
      }

      const userIdsSql = `(${participantUserIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`
      conditions.push(`r.payer_id IN ${userIdsSql} OR d.debtor_id IN ${userIdsSql}`)
      variables.push(...participantUserIds)

      isDistinct = true
      joins.push('LEFT JOIN debts d ON d.receipt_id = r.id')
      conditions.push('d.deleted_at IS NULL')
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const joinClause = joins.join(' ')
    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''
    const paginationClause = [
      Number.isInteger(limit) && `LIMIT ${limit}`,
      Number.isInteger(offset) && `OFFSET ${offset}`
    ].filter(Boolean).join(' ')

    const response = await this._client.query(`
      SELECT${isDistinct ? ' DISTINCT' : ''} r.id
        , r.created_at
        , r.payer_id
        , r.amount
        , r.description
        , (CASE WHEN r.photo IS NULL THEN FALSE ELSE TRUE END) as has_photo
      FROM receipts r ${joinClause} ${whereClause} ${paginationClause}
      ORDER BY created_at DESC;
    `, variables)

    return response.rows.map(row => this.deserializeReceipt(row))
  }

  deserializeReceipt(row) {
    return new Receipt({
      id: row['id'],
      createdAt: new Date(row['created_at']),
      payerId: row['payer_id'],
      amount: toNullableAmount(row['amount']),
      description: row['description'],
      hasPhoto: row['has_photo']
    })
  }

  deserializeReceiptPhoto(row) {
    return new ReceiptPhoto({
      binary: row['photo'],
      mime: row['mime'],
    })
  }
}
