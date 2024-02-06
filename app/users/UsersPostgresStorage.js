import { AlreadyExistsError } from '../errors/AlreadyExistsError.js'
import { User } from './User.js'

export class UsersPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {User} user */
  async create(user) {
    try {
      await this._client.query(`
        INSERT INTO users (id, username, name, is_complete)
        VALUES ($1, $2, $3, $4);
      `, [user.id, user.username, user.name, user.isComplete])

      return this.findById(user.id)
    } catch (error) {
      if (String(error.code) === '23505') {
        throw new AlreadyExistsError()
      } else {
        throw error
      }
    }
  }

  /** @param {User} user */
  async update(user) {
    await this._client.query(`
      UPDATE users
      SET (name, username, is_complete) = ($2, $3, $4)
      WHERE id = $1;
    `, [user.id, user.name, user.username, user.isComplete])

    return this.findById(user.id)
  }

  /** @deprecated */
  async findAll() {
    return this._find({ allowDeprecatedNoConditions: true })
  }

  /** @param {string} id */
  async findById(id) {
    const users = await this._find({ ids: [id], limit: 1 })
    return users.at(0)
  }

  /** @param {string[]} ids */
  async findByIds(ids) {
    if (ids.length === 0) return []
    return this._find({ ids })
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<(User | undefined)[]>}
   */
  async findAndMapByIds(ids) {
    const users = await this.findByIds(ids)
    return ids.map(id => users.find(u => u.id === id))
  }

  /**
   * @param {{
   *   ids?: string[],
   *   limit?: number,
   *   offset?: number,
   *   allowDeprecatedNoConditions?: boolean
   * }} options
   */
  async _find({ ids, limit, offset, allowDeprecatedNoConditions = false } = {}) {
    const conditions = []
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`u.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
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
      SELECT u.id, u.name, u.username, u.is_complete
      FROM users u ${whereClause} ${paginationClause};
    `, variables)

    return response.rows.map(row => this.deserializeUser(row))
  }

  deserializeUser(row) {
    return new User({
      id: row['id'],
      name: row['name'],
      username: row['username'],
      isComplete: row['is_complete'],
    })
  }
}
