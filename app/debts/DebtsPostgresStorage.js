import { toNullableAmount } from '../utils/toNullableAmount.js'
import { AggregatedDebt } from './AggregatedDebt.js'
import { Debt } from './Debt.js'

export class DebtsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {Debt} debt */
  async create(debt) {
    const response = await this._client.query(`
      INSERT INTO debts (debtor_id, receipt_id, amount)
      VALUES ($1, $2, $3)
      RETURNING id;
    `, [debt.debtorId, debt.receiptId, debt.amount])

    return this.findById(response.rows[0]['id'])
  }

  async deleteByReceiptId(receiptId) {
    await this._client.query(`
      UPDATE debts
      SET deleted_at = NOW()
      WHERE receipt_id = $1;
    `, [receiptId])
  }

  async findById(id) {
    const debts = await this._find({ ids: [id], limit: 1 })
    return debts.length > 0 ? debts[0] : null
  }
  
  async findByReceiptId(receiptId) {
    return this._find({ receiptIds: [receiptId] })
  }

  /**
   * @param {{
   *   ids?: string[],
   *   receiptIds?: string[],
   *   limit?: number,
   *   offset?: number,
   *   allowDeprecatedNoConditions?: boolean
   * }} options 
   */
  async _find({ ids, receiptIds, limit, offset, allowDeprecatedNoConditions = false } = {}) {
    const conditions = [
      'd.deleted_at IS NULL',
      'r.deleted_at IS NULL',
    ]
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`d.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
    }

    if (receiptIds && Array.isArray(receiptIds)) {
      if (receiptIds.length === 0) {
        throw new Error('"receiptIds" cannot be empty')
      }

      conditions.push(`d.receipt_id IN (${receiptIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...receiptIds)
    }

    if (conditions.length === 0 && !allowDeprecatedNoConditions) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''
    const paginationClause = [
      Number.isInteger(limit) && `LIMIT ${limit}`,
      Number.isInteger(offset) && `OFFSET ${offset}`
    ].filter(Boolean).join(' ')

    const response = await this._client.query(`
      SELECT d.id, d.debtor_id, d.receipt_id, d.amount
      FROM debts d
      JOIN receipts r ON r.id = d.receipt_id ${whereClause} ${paginationClause};
    `, variables)

    return response.rows.map(row => this.deserializeDebt(row))
  }

  deserializeDebt(row) {
    return new Debt({
      id: row['id'],
      debtorId: row['debtor_id'],
      receiptId: row['receipt_id'],
      amount: toNullableAmount(row['amount']),
    })
  }

  async aggregateIngoingDebts(userId) {
    return this._aggregateDebts({ toUserId: userId })
  }

  async aggregateOutgoingDebts(userId) {
    return this._aggregateDebts({ fromUserId: userId })
  }

  async _aggregateDebts({ fromUserId = undefined, toUserId = undefined }) {
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
      SELECT SUM(d.amount) AS amount
        , d.debtor_id as from_user_id
        , r.payer_id as to_user_id
        , ARRAY_REMOVE(ARRAY_AGG(CASE WHEN d.amount IS NULL THEN d.receipt_id ELSE NULL END), null) AS incomplete_receipt_ids
      FROM debts d
      LEFT JOIN receipts r ON d.receipt_id = r.id
      WHERE (${conditions.join(') AND (')})
      GROUP BY d.debtor_id, r.payer_id;
    `, variables)

    return response.rows.map(row => this.deserializeAggregatedDebt(row))
  }

  deserializeAggregatedDebt(row) {
    return new AggregatedDebt({
      fromUserId: row['from_user_id'],
      toUserId: row['to_user_id'],
      amount: toNullableAmount(row['amount']),
      incompleteReceiptIds: row['incomplete_receipt_ids'],
    })
  }
}
