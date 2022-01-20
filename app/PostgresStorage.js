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

  async deleteCardById(cardId) {
    await this._client.query(`
      DELETE FROM cards
      WHERE id = $1;
    `, [cardId])
  }

  async createDebt({ debtorId, receiptId, amount }) {
    await this._client.query(`
      INSERT INTO debts (debtor_id, receipt_id, amount)
      VALUES ($1, $2, $3);
    `, [debtorId, receiptId, amount])
  }

  async createCard({ userId, bank, number }) {
    await this._client.query(`
      INSERT INTO cards (user_id, bank, number)
      VALUES ($1, $2, $3);
    `, [userId, bank, number])
  }

  async createUser({ id, username, name }) {
    await this._client.query(`
      INSERT INTO users (id, username, name)
      VALUES ($1, $2, $3);
    `, [id, username, name])
  }

  async createPayment({ fromUserId, toUserId, amount }) {
    const response = await this._client.query(`
      INSERT INTO payments (created_at, from_user_id, to_user_id, amount)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [new Date().toISOString(), fromUserId, toUserId, amount])

    return response.rows[0]['id']
  }

  async findReceipts() {
    const response = await this._client.query(`
      SELECT *
      FROM receipts
      ORDER BY created_at DESC;
    `, [])

    const receipts = []

    for (const row of response.rows) {
      receipts.push({
        id: row['id'],
        createdAt: new Date(row['created_at']),
        payerId: row['payer_id'],
        amount: row['amount'],
        description: row['description'],
        debts: await this.findDebtsByReceiptId(row['id'])
      })
    }

    return receipts
  }

  async findDebtsByReceiptId(receiptId) {
    const response = await this._client.query(`
      SELECT debts.*
      FROM debts
      JOIN receipts ON receipts.id = debts.receipt_id
      WHERE debts.receipt_id = $1;
    `, [receiptId])

    return response.rows.map(row => ({
      debtorId: row['debtor_id'],
      amount: row['amount'],
    }))
  }

  async getCardById(cardId) {
    const response = await this._client.query(`
      SELECT *
      FROM cards
      WHERE id = $1;
    `, [cardId])

    if (response.rowCount === 0) {
      return null
    }

    return this.deserializeCard(response.rows[0])
  }

  async findCardsByUserId(userId) {
    const response = await this._client.query(`
      SELECT *
      FROM cards
      WHERE user_id = $1;
    `, [userId])

    return response.rows.map(this.deserializeCard)
  }

  deserializeCard(row) {
    return {
      id: row['id'],
      bank: row['bank'],
      number: row['number'],
    }
  }

  async findPayments({ fromUserId = undefined, toUserId = undefined } = {}) {
    const conditions = []
    const variables = []

    if (fromUserId) {
      variables.push(fromUserId)
      conditions.push(`from_user_id = $${variables.length}`)
    }

    if (toUserId) {
      variables.push(toUserId)
      conditions.push(`to_user_id = $${variables.length}`)
    }

    const response = await this._client.query(`
      SELECT *
      FROM payments
      ${conditions.length === 0 ? '' : ('WHERE ' + conditions.join(' AND '))}
      ORDER BY created_at DESC;
    `, variables)

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

    return response.rows.map(this.deserializeUser)
  }

  async findUserByUsername(username) {
    const response = await this._client.query(`
      SELECT *
      FROM users
      WHERE username = $1;
    `, [username])

    if (response.rowCount === 0) {
      return null
    }

    return this.deserializeUser(response.rows[0])
  }

  async findUserById(userId) {
    const response = await this._client.query(`
      SELECT *
      FROM users
      WHERE id = $1;
    `, [userId])

    if (response.rowCount === 0) {
      return null
    }

    return this.deserializeUser(response.rows[0])
  }

  deserializeUser(row) {
    return {
      id: row['id'],
      name: row['name'],
      username: row['username'],
    }
  }

  async aggregateIngoingDebts(payerId) {
    const response = await this._client.query(`
      SELECT SUM(debts.amount) - SUM(COALESCE(payments.amount, 0)) as amount, debtor_id
      FROM debts
      LEFT JOIN receipts ON debts.receipt_id = receipts.id
      LEFT join payments on debts.debtor_id = payments.from_user_id and receipts.payer_id = payments.to_user_id 
      WHERE payer_id = $1 AND debtor_id != payer_id
      GROUP BY debtor_id, payments.from_user_id
      having SUM(debts.amount) - SUM(COALESCE(payments.amount, 0)) > 0;
    `, [payerId])

    return response.rows.map(row => ({
      userId: row['debtor_id'],
      amount: row['amount'],
    }))
  }

  async aggregateOutgoingDebts(debtorId) {
    const response = await this._client.query(`
      SELECT SUM(debts.amount) - SUM(COALESCE(payments.amount, 0)) as amount, payer_id
      FROM debts
      LEFT JOIN receipts ON debts.receipt_id = receipts.id
      LEFT join payments on debts.debtor_id = payments.from_user_id and receipts.payer_id = payments.to_user_id 
      WHERE debtor_id = $1 AND debtor_id != payer_id
      GROUP BY payer_id, payments.to_user_id
      having SUM(debts.amount) - SUM(COALESCE(payments.amount, 0)) > 0;
    `, [debtorId])

    return response.rows.map(row => ({
      userId: row['payer_id'],
      amount: row['amount'],
    }))
  }
}