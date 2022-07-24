export class MembershipPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  async store(userId, groupId) {
    await this._client.query(`
      INSERT INTO memberships (user_id, group_id, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, group_id) DO UPDATE
      SET updated_at = $3;
    `, [userId, groupId, new Date()])
  }

  async exists(userId, groupId) {
    const response = await this._client.query(`
      SELECT COUNT(*) as count
      FROM memberships
      WHERE user_id = $1
        AND group_id = $2
      LIMIT 1;
    `, [userId, groupId])

    return response.rows[0].count === '1'
  }

  async delete(userId, groupId) {
    await this._client.query(`
      DELETE FROM memberships
      WHERE user_id = $1
        AND group_id = $2;
    `, [userId, groupId])
  }

  async findUserIdsByGroupId(groupId) {
    const response = await this._client.query(`
      SELECT m.user_id
      FROM memberships m
      WHERE m.group_id = $1;
    `, [groupId])

    return response.rows.map(row => row['user_id'])
  }

  async findOldest({ limit }) {
    const response = await this._client.query(`
      SELECT m.user_id, m.group_id
      FROM memberships m
      ORDER BY m.updated_at ASC
      LIMIT ${limit};
    `, [])

    return response.rows.map(row => ({
      userId: row['user_id'],
      groupId: row['group_id'],
    }))
  }
}
