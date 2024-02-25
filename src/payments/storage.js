export class PaymentsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types').Payment, 'id'>} input
   * @returns {Promise<import('./types').Payment>}
   */
  async create(input) {
    const response = await this._client.query(`
      INSERT INTO payments (from_user_id, to_user_id, amount, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [input.fromUserId, input.toUserId, input.amount, input.createdAt])

    return {
      id: response.rows[0].id,
      ...input
    }
  }

  /** @param {string} id */
  async deleteById(id) {
    await this._client.query(`
      UPDATE payments
      SET deleted_at = NOW()
      WHERE id = $1;
    `, [id])
  }

  /** @param {{ fromUserId?: string; toUserId?: string }} input */
  async aggregatePayments({ fromUserId, toUserId }) {
    const variables = []
    const conditions = ['p.deleted_at IS NULL']

    if (fromUserId) {
      conditions.push(`p.from_user_id = $${variables.length + 1}`)
      variables.push(fromUserId)
    }

    if (toUserId) {
      conditions.push(`p.to_user_id = $${variables.length + 1}`)
      variables.push(toUserId)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const response = await this._client.query(`
      SELECT SUM(p.amount)::int AS amount
        , p.from_user_id
        , p.to_user_id
      FROM payments p
      WHERE (${conditions.join(') AND (')})
      GROUP BY p.from_user_id, p.to_user_id;
    `, variables)

    return response.rows.map(row => deserializeAggregatedPayment(row))
  }

  /** @param {string} id */
  async findById(id) {
    const { items } = await this.find({ ids: [id], limit: 1 })
    return items.at(0)
  }

  /**
   * @param {{
   *   ids?: string[],
   *   participantUserIds?: string[],
   *   limit?: number,
   *   offset?: number,
   * }} options
   */
  async find({ ids, participantUserIds, limit = 100, offset = 0 } = {}) {
    const conditions = ['p.deleted_at IS NULL']
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`p.id = ANY($${variables.length + 1})`)
      variables.push(ids)
    }

    if (participantUserIds && Array.isArray(participantUserIds)) {
      if (participantUserIds.length === 0) {
        throw new Error('"participantUserIds" cannot be empty')
      }

      conditions.push(`p.from_user_id = ANY($${variables.length + 1}) OR p.to_user_id = ANY($${variables.length + 1})`)
      variables.push(participantUserIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(`
      SELECT p.id, p.from_user_id, p.to_user_id, p.amount, p.created_at
      FROM payments p ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    const { rows: [{ total }] } = await this._client.query(`
      SELECT COUNT(*)::int AS total
      FROM payments p ${whereClause};
    `, variables)

    return {
      total,
      items: response.rows.map(row => deserializePayment(row)),
    }
  }
}

/**
 * @param {any} row
 * @returns {import('./types').Payment}
 */
function deserializePayment(row) {
  return {
    id: row['id'],
    fromUserId: row['from_user_id'],
    toUserId: row['to_user_id'],
    amount: row['amount'],
    createdAt: new Date(row['created_at']),
  }
}

/**
 * @param {any} row
 * @returns {import('./types').AggregatedPayment}
 */
function deserializeAggregatedPayment(row) {
  return {
    fromUserId: row['from_user_id'],
    toUserId: row['to_user_id'],
    amount: row['amount'],
  }
}
