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
   * @param {{
   *   allowNoConditions?: boolean,
   *   groupIds?: string[],
   *   userIds?: string[],
   *   limit?: number,
   *   offset?: number
   * }} options
   */
  async find({ allowNoConditions, groupIds, userIds, limit = 100, offset = 0 }) {
    const conditions = []
    const variables = []

    if (Array.isArray(groupIds)) {
      if (groupIds.length === 0) {
        throw new Error('"groupIds" cannot be empty')
      }

      conditions.push(`m.group_id = ANY($${variables.length + 1})`)
      variables.push(groupIds)
    }

    if (Array.isArray(userIds)) {
      if (userIds.length === 0) {
        throw new Error('"userIds" cannot be empty')
      }

      conditions.push(`m.user_id = ANY($${variables.length + 1})`)
      variables.push(userIds)
    }

    if (!allowNoConditions && conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0
      ? `WHERE (${conditions.join(') AND (')})`
      : ''

    const response = await this._client.query(`
      SELECT m.user_id
      FROM memberships m ${whereClause}
      ORDER BY m.updated_at ASC
      LIMIT ${limit} OFFSET ${offset};
    `, [groupIds])

    return response.rows.map(deserializeMembership)
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
