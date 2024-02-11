import { AlreadyExistsError } from '../common/errors.js'
import { isDefined } from '../common/utils.js'

export class RollCallsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types.js').RollCall, 'id'>} input
   * @returns {Promise<import('./types.js').RollCall>}
   */
  async create(input) {
    try {
      const response = await this._client.query(`
        INSERT INTO roll_calls (group_id, message_pattern, users_pattern, exclude_sender, poll_options, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `, [
        input.groupId,
        input.messagePattern,
        input.usersPattern === '*' ? undefined : input.usersPattern,
        input.excludeSender,
        input.pollOptions.length > 0 ? input.pollOptions : undefined,
        input.sortOrder,
      ])

      return {
        id: response.rows[0].id,
        ...input,
      }
    } catch (err) {
      if (String(err.code) === '23505') {
        throw new AlreadyExistsError()
      } else {
        throw err
      }
    }
  }

  /** @param {Pick<import('./types.js').RollCall, 'id'> & Partial<import('./types.js').RollCall>} input */
  async update(input) {
    const fields = [
      input.messagePattern !== undefined ? ['message_pattern', input.messagePattern] : undefined,
      input.usersPattern !== undefined ? ['users_pattern', input.usersPattern === '*' ? undefined : input.usersPattern] : undefined,
      input.excludeSender !== undefined ? ['exclude_sender', input.excludeSender] : undefined,
      input.pollOptions !== undefined ? ['poll_options', input.pollOptions.length > 0 ? input.pollOptions : undefined] : undefined,
      input.sortOrder !== undefined ? ['sort_order', input.sortOrder] : undefined,
    ].filter(isDefined)

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
    const conditions = []
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

    return response.rows.map(row => deserializeRollCall(row))
  }
}

/**
 * @param {any} row
 * @returns {import('./types.js').RollCall}
 */
export function deserializeRollCall(row) {
  return {
    id: row['id'],
    groupId: row['group_id'],
    messagePattern: row['message_pattern'],
    usersPattern: row['users_pattern'] ?? '*',
    excludeSender: row['exclude_sender'],
    pollOptions: row['poll_options'] ?? [],
    sortOrder: row['sort_order'],
  }
}
