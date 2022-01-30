import pg from 'pg'
import { v4 as uuid } from 'uuid'

export class PostgresStorage {
  constructor(connectionString) {
    this._client = new pg.Client(connectionString)
  }

  async connect() {
    await this._client.connect()
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
      DELETE FROM receipts
      WHERE id = $1;
    `, [receiptId])
  }

  async deleteDebtsByReceiptId(receiptId) {
    await this._client.query(`
      DELETE FROM debts
      WHERE receipt_id = $1;
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

  async makeUserComplete(userId) {
    await this._client.query(`
      UPDATE users
      SET is_complete = TRUE
      where id = $1
    `, [userId])
  }

  async createPayment({ fromUserId, toUserId, amount }) {
    const response = await this._client.query(`
      INSERT INTO payments (created_at, from_user_id, to_user_id, amount)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [new Date().toISOString(), fromUserId, toUserId, amount])

    return response.rows[0]['id']
  }

  async findReceiptById(receiptId) {
    const response = await this._client.query(`
      SELECT r.id, r.created_at, r.payer_id, r.amount, r.description, (CASE WHEN r.photo IS NULL THEN FALSE ELSE TRUE END) as has_photo
      FROM receipts r
      WHERE r.id = $1;
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
      WHERE r.id = $1;
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
      SELECT DISTINCT r.id, r.created_at, r.payer_id, r.amount, r.description, (CASE WHEN r.photo IS NULL THEN FALSE ELSE TRUE END) as has_photo
      FROM receipts r
      LEFT JOIN debts d ON d.receipt_id = r.id
      WHERE payer_id = $1 OR debtor_id = $1
      ORDER BY created_at DESC;
    `, [userId])

    const receipts = []

    for (const row of response.rows) {
      receipts.push(await this.deserializeReceipt(row))
    }

    return receipts
  }

  // @deprecated
  async findReceipts() {
    const response = await this._client.query(`
      SELECT r.id, r.created_at, r.payer_id, r.amount, r.description, (CASE WHEN r.photo IS NULL THEN FALSE ELSE TRUE END) as has_photo
      FROM receipts r
      ORDER BY created_at DESC;
    `, [])

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
      amount: row['amount'],
      description: row['description'],
      hasPhoto: row['has_photo'],
      debts: await this.findDebtsByReceiptId(row['id'])
    }
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
      WHERE username ilike $1;
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

  async getIngoingDebts(payerId) {
    const response = await this._client.query(`
      SELECT SUM(d.amount) AS amount, d.debtor_id
      FROM debts d
      LEFT JOIN receipts r ON d.receipt_id = r.id
      WHERE r.payer_id = $1 AND d.debtor_id != r.payer_id
      GROUP BY d.debtor_id, r.payer_id;
    `, [payerId])

    return response.rows.map(row => ({
      userId: row['debtor_id'],
      amount: Number(row['amount']),
    }))
  }

  async getOutgoingDebts(debtorId) {
    const response = await this._client.query(`
      SELECT SUM(d.amount) AS amount, r.payer_id
      FROM debts d
      LEFT JOIN receipts r ON d.receipt_id = r.id
      WHERE d.debtor_id = $1 AND d.debtor_id != r.payer_id
      GROUP BY d.debtor_id, r.payer_id;
    `, [debtorId])

    return response.rows.map(row => ({
      userId: row['payer_id'],
      amount: Number(row['amount']),
    }))
  }

  async getIngoingPayments(toUserId) {
    const response = await this._client.query(`
      SELECT SUM(p.amount) AS amount, p.from_user_id
      FROM payments p
      WHERE p.to_user_id = $1
      GROUP BY p.from_user_id;
    `, [toUserId])

    return response.rows.map(row => ({
      userId: row['from_user_id'],
      amount: Number(row['amount']),
    }))
  }

  async getOutgoingPayments(fromUserId) {
    const response = await this._client.query(`
      SELECT SUM(p.amount) AS amount, p.to_user_id
      FROM payments p
      WHERE p.from_user_id = $1
      GROUP BY p.to_user_id;
    `, [fromUserId])

    return response.rows.map(row => ({
      userId: row['to_user_id'],
      amount: Number(row['amount']),
    }))
  }
}