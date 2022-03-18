export class MembershipPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  async store(userId, chatId) {
    await this._client.query(`
      INSERT INTO memberships (user_id, chat_id, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, chat_id) DO UPDATE
      SET updated_at = $3;
    `, [userId, chatId, new Date()])
  }

  async delete(userId, chatId) {
    await this._client.query(`
      DELETE FROM memberships
      WHERE user_id = $1
        AND chat_id = $2;
    `, [userId, chatId])
  }

  async findUserIdsByChatId(chatId) {
    const response = await this._client.query(`
      SELECT m.user_id
      FROM memberships m
      WHERE m.chat_id = $1;
    `, [chatId])

    return response.rows.map(row => row['user_id'])
  }

  async findOldest({ limit }) {
    const response = await this._client.query(`
      SELECT m.user_id, m.chat_id
      FROM memberships m
      ORDER BY m.updated_at ASC
      LIMIT ${limit};
    `, [])

    return response.rows.map(row => ({
      userId: row['user_id'],
      chatId: row['chat_id'],
    }))
  }
}
