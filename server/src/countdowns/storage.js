import { AlreadyExistsError } from '../common/errors.js'

export class CountdownsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types').Countdown, 'id' | 'endedAt' | 'nextReminderAt'>} input
   * @return {Promise<import('./types').Countdown>}
   */
  async create(input) {
    try {
      const response = await this._client.query(
        `
        INSERT INTO countdowns (chat_id, title, ends_at)
        VALUES ($1, $2, $3)
        RETURNING id;
      `,
        [input.chatId, input.title, input.endsAt],
      )

      return {
        id: response.rows[0].id,
        endedAt: null,
        nextReminderAt: null,
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
   * @param {string} chatId
   * @param {string} countdownId
   */
  async delete(chatId, countdownId) {
    await this._client.query(
      `
      DELETE FROM countdowns
      WHERE chat_id = $1 AND countdown_id = $2;
    `,
      [chatId, countdownId],
    )
  }

  /**
   * @param {{
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async findPending({ limit = 100, offset = 0 }) {
    const conditions = []

    conditions.push(`c.ended_at IS NULL`)
    conditions.push(`c.next_reminder_at IS NULL OR c.next_reminder_at <= NOW()`)

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(
      `SELECT c.id, c.chat_id, c.title, c.ends_at, c.ended_at, c.next_reminder_at
       FROM countdowns c ${whereClause}
       LIMIT ${limit} OFFSET ${offset};`,
    )

    return {
      items: response.rows.map(row => deserializeCountdown(row)),
    }
  }
}

/**
 * @param {any} row
 * @returns {import('./types').Countdown}
 */
function deserializeCountdown(row) {
  return {
    id: row['id'],
    chatId: row['chat_id'],
    title: row['title'],
    endsAt: new Date(row['ends_at']),
    endedAt: row['ended_at'] ? new Date(row['ended_at']) : null,
    nextReminderAt: row['next_reminder_at'] ? new Date(row['next_reminder_at']) : null,
  }
}
