import { AlreadyExistsError } from '../common/errors.js'

export class CardsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types').Card, 'id'>} input
   * @return {Promise<import('./types').Card>}
   */
  async create(input) {
    try {
      const response = await this._client.query(`
        INSERT INTO cards (user_id, bank, number)
        VALUES ($1, $2, $3)
        RETURNING id;
      `, [input.userId, input.bank, input.number])

      return {
        id: response.rows[0].id,
        ...input,
      }
    } catch (err) {
      if (err.code === '23505') {
        throw new AlreadyExistsError()
      }

      throw err
    }
  }

  /**
   * @param {string} userId
   * @param {string} cardId
   */
  async delete(userId, cardId) {
    await this._client.query(`
      DELETE FROM cards
      WHERE user_id = $1 AND id = $2;
    `, [userId, cardId])
  }

  /**
   * @param {{
   *   userIds?: string[],
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async find({ userIds, limit = 100, offset = 0 } = {}) {
    const conditions = []
    const variables = []

    if (Array.isArray(userIds)) {
      if (userIds.length === 0) {
        throw new Error('"userIds" cannot be empty')
      }

      conditions.push(`c.user_id = ANY($${variables.length + 1})`)
      variables.push(userIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(`
      SELECT c.id, c.user_id, c.number, c.bank
      FROM cards c ${whereClause}
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    const { rows: [{ total }] } = await this._client.query(`
      SELECT COUNT(*)::int as total
      FROM cards c ${whereClause};
    `, variables)

    return {
      total,
      items: response.rows.map(row => deserializeCard(row)),
    }
  }
}

/**
 * @param {any} row
 * @returns {import('./types').Card}
 */
function deserializeCard(row) {
  return {
    id: row['id'],
    userId: row['user_id'],
    bank: row['bank'],
    number: row['number'],
  }
}
