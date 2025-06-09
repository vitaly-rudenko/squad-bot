import { customAlphabet } from 'nanoid'
import { alphanumeric } from 'nanoid-dictionary'

const generateId = customAlphabet(alphanumeric, 16)

export class ReceiptsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types').Receipt, 'id' | 'createdAt' | 'updatedAt' | 'updatedByUserId'>} receipt
   * @returns {Promise<import('./types').Receipt>}
   */
  async create(receipt) {
    const { rows } = await this._client.query(`
      INSERT INTO receipts (id, payer_id, amount, description, photo_filename, created_by_user_id, updated_by_user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
    `, [
      generateId(),
      receipt.payerId,
      receipt.amount,
      receipt.description,
      receipt.photoFilename,
      receipt.createdByUserId,
      receipt.createdByUserId,
    ])

    return deserializeReceipt(rows[0])
  }

  /** @param {Omit<import('./types').Receipt, 'createdByUserId' | 'createdAt' | 'updatedAt'>} receipt */
  async update(receipt) {
    const { rows } = await this._client.query(`
      UPDATE receipts
      SET payer_id = $2, amount = $3, description = $4, photo_filename = $5, updated_by_user_id = $6, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [receipt.id, receipt.payerId, receipt.amount, receipt.description, receipt.photoFilename, receipt.updatedByUserId])

    return deserializeReceipt(rows[0])
  }

  /** @param {string} id */
  async deleteById(id) {
    await this._client.query(`
      UPDATE receipts
      SET deleted_at = NOW()
      WHERE id = $1;
    `, [id])
  }

  /** @param {string} id */
  async findById(id) {
    const { items } = await this.find({ ids: [id], limit: 1 })
    return items.at(0)
  }

  /**
   * @param {{
   *   ids?: string[]
   *   participantUserIds?: string[]
   *   limit?: number
   *   offset?: number
   *   ascending?: boolean
   * }} options
   */
  async find({ ids, participantUserIds, limit = 100, offset = 0, ascending = false } = {}) {
    const conditions = ['r.deleted_at IS NULL']
    const variables = []
    const joins = []

    let isDistinct = false

    if (Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`r.id = ANY($${variables.length + 1})`)
      variables.push(ids)
    }

    if (Array.isArray(participantUserIds)) {
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
    const distinctClause = isDistinct ? 'DISTINCT ' : ''

    const response = await this._client.query(`
      SELECT ${distinctClause}r.id
        , r.payer_id, r.amount, r.description, r.photo_filename
        , r.created_by_user_id, r.updated_by_user_id
        , r.created_at, r.updated_at
      FROM receipts r ${joinClause} ${whereClause}
      ORDER BY created_at ${ascending ? 'ASC' : 'DESC'}
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    const { rows: [{ total }] } = await this._client.query(`
      SELECT COUNT(${distinctClause}r.id)::int AS total
      FROM receipts r ${joinClause} ${whereClause};
    `, variables)

    return {
      total,
      items: response.rows.map(row => deserializeReceipt(row)),
    }
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
    updatedAt: new Date(row['updated_at']),
    payerId: row['payer_id'],
    amount: row['amount'],
    description: row['description'] ?? undefined,
    photoFilename: row['photo_filename'] ?? undefined,
    createdByUserId: row['created_by_user_id'],
    updatedByUserId: row['updated_by_user_id'],
  }
}
