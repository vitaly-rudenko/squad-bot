import { AlreadyExistsError } from '../../errors/AlreadyExistsError.js'

export class RollCallsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types').RollCall, 'id'>} rollCall
   * @returns {Promise<import('./types').RollCall>}
   */
  async create(rollCall) {
    try {
      const response = await this._client.query(`
        INSERT INTO roll_calls (group_id, message_pattern, users_pattern, exclude_sender, poll_options, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `, [rollCall.groupId, rollCall.messagePattern, rollCall.usersPattern, rollCall.excludeSender, rollCall.pollOptions, rollCall.sortOrder])

      return {
        id: response.rows[0].id,
        ...rollCall,
      }
    } catch (error) {
      if (String(error.code) === '23505') {
        throw new AlreadyExistsError()
      } else {
        throw error
      }
    }
  }

  /** @param {Pick<import('./types').RollCall, 'id'> & Partial<import('./types').RollCall>} input */
  async update(input) {
    const fields = [
      ['message_pattern', input.messagePattern],
      ['users_pattern', input.usersPattern],
      ['exclude_sender', input.excludeSender],
      ['poll_options', input.pollOptions],
      ['sort_order', input.sortOrder],
    ].filter(([_, value]) => value !== undefined)

    if (fields.length > 0) {
      await this._client.query(`
        UPDATE roll_calls
        SET ${fields.map(([key], i) => `${key} = $${i + 2}`).join(', ')}
        WHERE id = $1;
      `, [input.id, ...fields.map(field => field[1])])
    }
  }

  /** @param {string} id */
  async deleteById(id) {
    await this._client.query(`
      DELETE FROM roll_calls
      WHERE id = $1;
    `, [id])
  }

  /** @param {string} id */
  async findById(id) {
    const results = await this._find({ ids: [id], limit: 1 })
    return results.at(0)
  }

  /** @param {string} groupId */
  async findByGroupId(groupId) {
    return this._find({ groupIds: [groupId] })
  }

  /**
   * @param {{
   *   ids?: string[],
   *   groupIds?: string[],
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async _find({ ids, groupIds, limit, offset } = {}) {
    const conditions = ['rc.deleted_at IS NULL']
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`rc.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
    }

    if (groupIds && Array.isArray(groupIds)) {
      if (groupIds.length === 0) {
        throw new Error('"groupIds" cannot be empty')
      }

      conditions.push(`rc.group_id IN (${groupIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...groupIds)
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
      SELECT rc.id, rc.group_id, rc.message_pattern, rc.users_pattern, rc.exclude_sender, rc.poll_options, rc.sort_order
      FROM roll_calls rc ${whereClause}
      ORDER BY sort_order DESC ${paginationClause};
    `, variables)

    return response.rows.map(row => this.deserializeRollCall(row))
  }

  /**
   * @param {any} row
   * @returns {import('./types').RollCall}
   */
  deserializeRollCall(row) {
    return {
      id: row['id'],
      groupId: row['group_id'],
      messagePattern: row['message_pattern'],
      usersPattern: row['users_pattern'],
      excludeSender: row['exclude_sender'],
      pollOptions: row['poll_options'],
      sortOrder: row['sort_order'],
    }
  }
}
