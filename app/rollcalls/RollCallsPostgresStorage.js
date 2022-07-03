import { RollCall } from './RollCall.js'

export class RollCallsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {RollCall} rollCall */
  async create(rollCall) {
    const response = await this._client.query(`
      INSERT INTO roll_calls (chat_id, message_pattern, users_pattern, exclude_sender, poll_options)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `, [rollCall.chatId, rollCall.messagePattern, rollCall.usersPattern, rollCall.excludeSender, rollCall.pollOptions])

    return this.findById(response.rows[0]['id'])
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
    const debts = await this._find({ ids: [id], limit: 1 })
    return debts.length > 0 ? debts[0] : null
  }

  /** @param {string} chatId */
  async findByChatId(chatId) {
    return this._find({ chatIds: [chatId] })
  }

  /**
   * @param {{
   *   ids?: string[],
   *   chatIds?: string[],
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async _find({ ids, chatIds, limit, offset } = {}) {
    const conditions = ['rc.deleted_at IS NULL']
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`rc.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
    }

    if (chatIds && Array.isArray(chatIds)) {
      if (chatIds.length === 0) {
        throw new Error('"chatIds" cannot be empty')
      }

      conditions.push(`rc.chat_id IN (${chatIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...chatIds)
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
      SELECT rc.id, rc.chat_id, rc.message_pattern, rc.users_pattern, rc.exclude_sender, rc.poll_options
      FROM roll_calls rc ${whereClause} ${paginationClause};
    `, variables)

    return response.rows.map(row => this.deserializeRollCall(row))
  }

  deserializeRollCall(row) {
    return new RollCall({
      id: row['id'],
      chatId: row['chat_id'],
      messagePattern: row['message_pattern'],
      usersPattern: row['users_pattern'],
      excludeSender: row['exclude_sender'],
      pollOptions: row['poll_options'],
    })
  }
}
