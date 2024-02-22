import { customAlphabet } from 'nanoid'
import { alphanumeric } from 'nanoid-dictionary'

const generateId = customAlphabet(alphanumeric, 16)

export class ReceiptsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types').Receipt, 'id'>} receipt
   * @returns {Promise<import('./types').Receipt>}
   */
  async create(receipt) {
    const response = await this._client.query(`
      INSERT INTO receipts (id, payer_id, amount, description, photo_filename, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `, [
      generateId(),
      receipt.payerId,
      receipt.amount,
      receipt.description,
      receipt.photoFilename,
      receipt.createdAt,
    ])

    return {
      id: response.rows[0]['id'],
      ...receipt,
    }
  }

  /** @param {Omit<import('./types').Receipt, 'createdAt'>} receipt */
  async update(receipt) {
    const response = await this._client.query(`
      UPDATE receipts
      SET payer_id = $2, amount = $3, description = $4, photo_filename = $5
      WHERE id = $1
      RETURNING created_at;
    `, [receipt.id, receipt.payerId, receipt.amount, receipt.description, receipt.photoFilename])

    return {
      ...receipt,
      createdAt: new Date(response.rows[0]['created_at']),
    }
  }

  /** @param {string} id */
  async deleteById(id) {
    await this._client.query(`
      UPDATE receipts
      SET deleted_at = NOW()
      WHERE id = $1;
    `, [id])
  }

  /** @param {string} userId */
  async findByParticipantUserId(userId) {
    return this._find({ participantUserIds: [userId] })
  }

  /** @param {string} id */
  async findById(id) {
    const receipts = await this._find({ ids: [id] })
    return receipts.at(0)
  }

  /**
   * @param {{
   *   ids?: string[],
   *   participantUserIds?: string[],
   *   limit?: number,
   *   offset?: number,
   * }} options
   */
  async _find({ ids, participantUserIds, limit = 100, offset = 0 } = {}) {
    const conditions = ['r.deleted_at IS NULL']
    const variables = []
    const joins = []

    let isDistinct = false

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`r.id = ANY($${variables.length + 1})`)
      variables.push(ids)
    }

    if (participantUserIds && Array.isArray(participantUserIds)) {
      if (participantUserIds.length === 0) {
        throw new Error('"participantUserIds" cannot be empty')
      }

      conditions.push(`r.payer_id = ANY($${variables.length + 1}) OR d.debtor_id = ANY($${variables.length + 1})`)
      variables.push(participantUserIds)

      isDistinct = true
      joins.push('LEFT JOIN debts d ON d.receipt_id = r.id')
      conditions.push('d.deleted_at IS NULL')
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const joinClause = joins.join(' ')
    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(`
      SELECT${isDistinct ? ' DISTINCT' : ''} r.id
        , r.created_at, r.payer_id, r.amount, r.description, r.photo_filename
      FROM receipts r ${joinClause} ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    return response.rows.map(row => deserializeReceipt(row))
  }
}

/**
 * @param {any} row
 * @returns {import('./types').Receipt}
 */
function deserializeReceipt(row) {
  return {
    id: row['id'],
    createdAt: new Date(row['created_at']),
    payerId: row['payer_id'],
    amount: row['amount'],
    description: row['description'] ?? undefined,
    photoFilename: row['photo_filename'] ?? undefined,
  }
}
