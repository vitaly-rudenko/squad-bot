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

  /** @param {string} userId */
  async aggregateIngoingPayments(userId) {
    return this._aggregatePayments({ toUserId: userId })
  }

  /** @param {string} userId */
  async aggregateOutgoingPayments(userId) {
    return this._aggregatePayments({ fromUserId: userId })
  }

  /** @param {{ fromUserId?: string; toUserId?: string }} input */
  async _aggregatePayments({ fromUserId, toUserId }) {
    const variables = []
    const conditions = [
      'p.deleted_at IS NULL'
    ]

    if (fromUserId) {
      variables.push(fromUserId)
      conditions.push(`p.from_user_id = $${variables.length}`)
    }

    if (toUserId) {
      variables.push(toUserId)
      conditions.push(`p.to_user_id = $${variables.length}`)
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
    const payments = await this._find({ ids: [id] })
    return payments.at(0)
  }

  /** @param {string} userId */
  async findByParticipantUserId(userId) {
    return this._find({ participantUserIds: [userId] })
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
    const conditions = ['p.deleted_at IS NULL']
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`p.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
    }

    if (participantUserIds && Array.isArray(participantUserIds)) {
      if (participantUserIds.length === 0) {
        throw new Error('"participantUserIds" cannot be empty')
      }

      const userIdsSql = `(${participantUserIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`
      conditions.push(`p.from_user_id IN ${userIdsSql} OR p.to_user_id IN ${userIdsSql}`)
      variables.push(...participantUserIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''
    const paginationClause = [
      Number.isInteger(limit) && `LIMIT ${limit}`,
      Number.isInteger(offset) && `OFFSET ${offset}`
    ].filter(Boolean).join(' ')

    const response = await this._client.query(`
      SELECT p.id, p.from_user_id, p.to_user_id, p.amount, p.created_at
      FROM payments p ${whereClause} ${paginationClause}
      ORDER BY created_at DESC;
    `, variables)

    return response.rows.map(row => deserializePayment(row))
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
