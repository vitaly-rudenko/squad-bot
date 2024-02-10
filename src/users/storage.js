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
   * @returns {Promise<(import('./types').User | undefined)[]>}
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
      SELECT u.id, u.name, u.username, u.locale
      FROM users u ${whereClause} ${paginationClause};
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
    username: row['username'],
    locale: row['locale'],
  }
}
