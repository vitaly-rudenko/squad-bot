import { Card } from './Card.js'

export class CardsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {Card} card */
  async create(card) {
    const response = await this._client.query(`
      INSERT INTO cards (user_id, bank, number)
      VALUES ($1, $2, $3)
      RETURNING id;
    `, [card.userId, card.bank, card.number])

    return this.findById(response.rows[0]['id'])
  }

  /**
   * @param {string} userId
   * @param {number} cardId
   */
  async delete(userId, cardId) {
    await this._client.query(`
      DELETE FROM cards
      WHERE user_id = $1 AND id = $2;
    `, [userId, cardId])
  }

  /** @param {string} id */
  async findById(id) {
    const cards = await this._find({ ids: [id], limit: 1 })
    return cards.at(0)
  }

  /** @param {string} userId */
  async findByUserId(userId) {
    return this._find({ userIds: [userId] })
  }

  /** @param {string[]} userIds */
  async findByUserIds(userIds) {
    return this._find({ userIds })
  }

  /**
   * @param {{
   *   ids?: string[],
   *   userIds?: string[],
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async _find({ ids, userIds, limit, offset } = {}) {
    const conditions = []
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`c.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
    }

    if (userIds && Array.isArray(userIds)) {
      if (userIds.length === 0) {
        throw new Error('"userIds" cannot be empty')
      }

      conditions.push(`c.user_id IN (${userIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...userIds)
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
      SELECT c.id, c.user_id, c.number, c.bank
      FROM cards c ${whereClause} ${paginationClause};
    `, variables)

    return response.rows.map(row => this.deserializeCard(row))
  }

  deserializeCard(row) {
    return new Card({
      id: row['id'],
      userId: row['user_id'],
      bank: row['bank'],
      number: row['number'],
    })
  }
}
