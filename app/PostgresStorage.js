import pg from 'pg'
import { v4 as uuid } from 'uuid'

export class PostgresStorage {
  constructor(connectionString) {
    this._client = new pg.Client(connectionString)
  }

  async connect() {
    await this._client.connect()
  }

  async createReceipt({ id = uuid(), payerId, amount, description }) {
    const response = await this._client.query(`
      INSERT INTO receipts (id, created_at, payer_id, amount, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `, [id, new Date().toISOString(), payerId, amount, description])

    return response.rows[0]['id']
  }

  async deleteReceiptById(receiptId) {
    await this._client.query(`
      DELETE FROM debts
      WHERE receipt_id = $1;
    `, [receiptId])

    await this._client.query(`
      DELETE FROM receipts
      WHERE id = $1;
    `, [receiptId])
  }

  async deletePaymentById(paymentId) {
    await this._client.query(`
      DELETE FROM payments
      WHERE id = $1;
    `, [paymentId])
  }

  async createDebt({ debtorId, receiptId, amount }) {
    await this._client.query(`
      INSERT INTO debts (debtor_id, receipt_id, amount)
      VALUES ($1, $2, $3);
    `, [debtorId, receiptId, amount])
  }

  async createPayment({ fromUserId, toUserId, amount }) {
    const response = await this._client.query(`
      INSERT INTO payments (created_at, from_user_id, to_user_id, amount)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [new Date().toISOString(), fromUserId, toUserId, amount])

    return response.rows[0]['id']
  }

  async findPayments() {
    const response = await this._client.query(`
      SELECT *
      FROM payments;
    `, [])

    return response.rows.map(row => ({
      id: row['id'],
      fromUserId: row['from_user_id'],
      toUserId: row['to_user_id'],
      amount: row['amount'],
      createdAt: new Date(row['created_at']),
    }))
  }

  async findUsers() {
    const response = await this._client.query(`
      SELECT *
      FROM users;
    `, [])

    return response.rows.map(row => ({
      id: row['id'],
      name: row['name'],
      username: row['username'],
    }))
  }

  async aggregateIngoingDebts(payerId) {
    const response = await this._client.query(`
      SELECT SUM(debts.amount) as amount, debtor_id
      FROM debts
      JOIN receipts ON debts.receipt_id = receipts.id
      WHERE payer_id = $1
      GROUP BY debtor_id;
    `, [payerId])

    return response.rows.map(row => ({
      userId: row['debtor_id'],
      amount: row['amount'],
    }))
  }

  async aggregateOutgoingDebts(debtorId) {
    const response = await this._client.query(`
      SELECT SUM(debts.amount) as amount, payer_id
      FROM debts
      JOIN receipts ON debts.receipt_id = receipts.id
      WHERE debtor_id = $1
      GROUP BY payer_id;
    `, [debtorId])

    return response.rows.map(row => ({
      userId: row['payer_id'],
      amount: row['amount'],
    }))
  }
}