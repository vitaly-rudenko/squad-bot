export class UsersPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {import('./types').User} user */
  async store(user) {
    await this._client.query(`
      INSERT INTO users (id, username, name, locale)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE
      SET (username, name, locale) = ($2, $3, $4);
    `, [user.id, user.username, user.name, user.locale])
  }

  /** @param {string} id */
  async findById(id) {
    const users = await this.find({ ids: [id], limit: 1 })
    return users.at(0)
  }

  /**
   * @param {{
   *   query?: string
   *   ids?: string[]
   *   groupIds?: string[]
   *   limit?: number
   *   offset?: number
   * }} options
   * @returns {Promise<import('./types').User[]>}
   */
  async find({ query, ids, groupIds, limit = 100, offset = 0 }) {
    const conditions = []
    const variables = []
    const joins = []

    if (query !== undefined) {
      if (query.length < 3) {
        throw new Error('"query" cannot be shorter than 3 characters')
      }

      conditions.push(`u.query ILIKE $${variables.length + 1}`)
      variables.push(`%${query}%`)
    }

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`u.id = ANY($${variables.length + 1})`)
      variables.push(ids)
      limit = Math.min(limit, ids.length)
    }

    if (groupIds && Array.isArray(groupIds)) {
      if (groupIds.length === 0) {
        throw new Error('"groupIds" cannot be empty')
      }

      joins.push('INNER JOIN memberships m ON m.user_id = u.id')
      conditions.push(`m.group_id = ANY($${variables.length + 1})`)
      variables.push(groupIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const joinClause = joins.join(' ')
    const whereClause = conditions.length > 0
      ? `WHERE (${conditions.join(') AND (')})`
      : ''

    const response = await this._client.query(`
      SELECT u.id, u.name, u.username, u.locale
      FROM users u ${joinClause} ${whereClause}
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    return response.rows.map(row => deserializeUser(row))
  }
}

/**
 * @param {any} row
 * @returns {import('./types').User}
 */
function deserializeUser(row) {
  return {
    id: row['id'],
    name: row['name'],
    username: row['username'] ?? undefined,
    locale: row['locale'],
  }
}
