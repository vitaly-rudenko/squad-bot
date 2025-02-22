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
    const response = await this._client.query(`
      INSERT INTO roll_calls (group_id, message_pattern, users_pattern, exclude_sender, poll_options, is_multiselect_poll, is_anonymous_poll, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `, [
      input.groupId,
      input.messagePattern,
      input.usersPattern === '*' ? undefined : input.usersPattern,
      input.excludeSender,
      input.pollOptions.length > 0 ? input.pollOptions : undefined,
      input.isMultiselectPoll,
      input.isAnonymousPoll,
      input.sortOrder,
    ])

    return {
      id: response.rows[0].id,
      ...input,
    }
  }

  /** @param {Pick<import('./types.js').RollCall, 'id'> & Partial<import('./types.js').RollCall>} input */
  async update(input) {
    const fields = [
      input.messagePattern !== undefined ? ['message_pattern', input.messagePattern] : undefined,
      input.usersPattern !== undefined ? ['users_pattern', input.usersPattern === '*' ? undefined : input.usersPattern] : undefined,
      input.excludeSender !== undefined ? ['exclude_sender', input.excludeSender] : undefined,
      input.pollOptions !== undefined ? ['poll_options', input.pollOptions.length > 0 ? input.pollOptions : undefined] : undefined,
      input.isMultiselectPoll !== undefined ? ['is_multiselect_poll', input.isMultiselectPoll] : undefined,
      input.isAnonymousPoll !== undefined ? ['is_anonymous_poll', input.isAnonymousPoll] : undefined,
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
    const { items } = await this.find({ ids: [id], limit: 1 })
    return items.at(0)
  }

  /**
   * @param {{
   *   ids?: string[],
   *   groupIds?: string[],
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async find({ ids, groupIds, limit = 100, offset = 0 } = {}) {
    const conditions = []
    const variables = []

    if (Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`rc.id = ANY($${variables.length + 1})`)
      variables.push(ids)
    }

    if (Array.isArray(groupIds)) {
      if (groupIds.length === 0) {
        throw new Error('"groupIds" cannot be empty')
      }

      conditions.push(`rc.group_id = ANY($${variables.length + 1})`)
      variables.push(groupIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(`
      SELECT rc.id,
        rc.group_id,
        rc.message_pattern,
        rc.users_pattern,
        rc.exclude_sender,
        rc.poll_options,
        rc.is_multiselect_poll,
        rc.is_anonymous_poll,
        rc.sort_order
      FROM roll_calls rc ${whereClause}
      ORDER BY sort_order DESC
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    const { rows: [{ total }]} = await this._client.query(`
      SELECT COUNT(*)::int AS total
      FROM roll_calls rc ${whereClause};
    `, variables)

    return {
      total,
      items: response.rows.map(row => deserializeRollCall(row)),
    }
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
    isMultiselectPoll: row['is_multiselect_poll'],
    isAnonymousPoll: row['is_anonymous_poll'],
    sortOrder: row['sort_order'],
  }
}
