export class DebtsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {Omit<import('./types').Debt, 'id'>} input */
  async store(input) {
    await this._client.query(`
      INSERT INTO debts (debtor_id, receipt_id, amount)
      VALUES ($1, $2, $3);
    `, [input.debtorId, input.receiptId, input.amount])
  }

  /** @param {string} receiptId */
  async deleteByReceiptId(receiptId) {
    await this._client.query(`
      UPDATE debts
      SET deleted_at = NOW()
      WHERE receipt_id = $1;
    `, [receiptId])
  }

  /** @param {string} receiptId */
  async findByReceiptId(receiptId) {
    return this._find({ receiptIds: [receiptId] })
  }

  /** @param {string[]} receiptIds */
  async findByReceiptIds(receiptIds) {
    if (receiptIds.length === 0) return []
    return this._find({ receiptIds })
  }

  /**
   * @param {{
   *   receiptIds?: string[],
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async _find({ receiptIds, limit = 100, offset = 0 } = {}) {
    const conditions = [
      'd.deleted_at IS NULL',
      'r.deleted_at IS NULL',
    ]
    const variables = []

    if (receiptIds && Array.isArray(receiptIds)) {
      if (receiptIds.length === 0) {
        throw new Error('"receiptIds" cannot be empty')
      }

      conditions.push(`d.receipt_id IN (${receiptIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...receiptIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(`
      SELECT d.debtor_id, d.receipt_id, d.amount
      FROM debts d
      JOIN receipts r ON r.id = d.receipt_id ${whereClause}
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    return response.rows.map(row => deserializeDebt(row))
  }

  /** @param {string} userId */
  async aggregateIngoingDebts(userId) {
    return this._aggregateDebts({ toUserId: userId })
  }

  /** @param {string} userId */
  async aggregateOutgoingDebts(userId) {
    return this._aggregateDebts({ fromUserId: userId })
  }

  /** @param {{ fromUserId?: string; toUserId?: string }} input */
  async _aggregateDebts({ fromUserId, toUserId }) {
    const variables = []
    const conditions = [
      'd.debtor_id != r.payer_id',
      'r.deleted_at IS NULL',
      'd.deleted_at IS NULL'
    ]

    if (fromUserId) {
      variables.push(fromUserId)
      conditions.push(`d.debtor_id = $${variables.length}`)
    }

    if (toUserId) {
      variables.push(toUserId)
      conditions.push(`r.payer_id = $${variables.length}`)
    }

    const response = await this._client.query(`
      SELECT SUM(d.amount)::int AS amount
        , d.debtor_id as from_user_id
        , r.payer_id as to_user_id
      FROM debts d
      LEFT JOIN receipts r ON d.receipt_id = r.id
      WHERE (${conditions.join(') AND (')})
      GROUP BY d.debtor_id, r.payer_id;
    `, variables)

    return response.rows.map(row => deserializeAggregatedDebt(row))
  }
}

/**
 * @param {any} row
 * @returns {import('./types').Debt}
 */
export function deserializeDebt(row) {
  return {
    id: row['id'],
    debtorId: row['debtor_id'],
    receiptId: row['receipt_id'],
    amount: row['amount'],
  }
}

/**
 * @param {any} row
 * @returns {import('./types').AggregatedDebt}
 */
export function deserializeAggregatedDebt(row) {
  return {
    fromUserId: row['from_user_id'],
    toUserId: row['to_user_id'],
    amount: row['amount'],
  }
}
