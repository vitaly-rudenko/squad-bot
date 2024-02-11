export class MembershipPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {string} userId
   * @param {string} groupId
   */
  async store(userId, groupId) {
    await this._client.query(`
      INSERT INTO memberships (user_id, group_id, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, group_id) DO UPDATE
      SET updated_at = $3;
    `, [userId, groupId, new Date()])
  }

  /**
   * @param {string} userId
   * @param {string} groupId
   */
  async exists(userId, groupId) {
    // TODO: improve?
    const response = await this._client.query(`
      SELECT COUNT(*) as count
      FROM memberships
      WHERE user_id = $1
        AND group_id = $2
      LIMIT 1;
    `, [userId, groupId])

    return response.rows[0].count === '1'
  }

  /**
   * @param {string} userId
   * @param {string} groupId
   */
  async delete(userId, groupId) {
    await this._client.query(`
      DELETE FROM memberships
      WHERE user_id = $1
        AND group_id = $2;
    `, [userId, groupId])
  }

  /**
   * @param {string} groupId
   * @returns {Promise<string[]>}
   */
  async findUserIdsByGroupId(groupId) {
    const response = await this._client.query(`
      SELECT m.user_id
      FROM memberships m
      WHERE m.group_id = $1;
    `, [groupId])

    return response.rows.map(row => row['user_id'])
  }

  /** @param {{ limit: number }} input */
  async findOldest({ limit = 100 }) {
    if (limit <= 0 || limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }

    const response = await this._client.query(`
      SELECT m.user_id, m.group_id
      FROM memberships m
      ORDER BY m.updated_at ASC
      LIMIT ${limit};
    `, [])

    return response.rows.map(row => deserializeMembership(row))
  }
}

/**
 * @param {any} row
 * @returns {import('./types').Membership}
 */
function deserializeMembership(row) {
  return {
    userId: row['user_id'],
    groupId: row['group_id'],
  }
}
