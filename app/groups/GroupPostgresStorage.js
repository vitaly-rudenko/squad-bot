import { Group } from './Group.js'

export class GroupsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {Group} group */
  async store(group) {
    const { id, title } = group

    await this._client.query(`
      INSERT INTO groups (id, title, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET (title, updated_at) = ($2, $3);
    `, [id, title, new Date()])
  }

  async findByMemberUserId(userId) {
    return this._find({ memberUserIds: [userId] })
  }

  /**
   * @param {{
   *   ids?: string[],
   *   memberUserIds?: string[],
   *   limit?: number,
   *   offset?: number,
   * }} options
   */
  async _find({ ids, memberUserIds, limit, offset } = {}) {
    const conditions = ['g.deleted_at IS NULL']
    const variables = []

    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`g.id IN (${ids.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`)
      variables.push(...ids)
    }

    if (memberUserIds && Array.isArray(memberUserIds)) {
      if (memberUserIds.length === 0) {
        throw new Error('"memberUserIds" cannot be empty')
      }

      const userIdsSql = `(${memberUserIds.map((_, i) => `$${variables.length + i + 1}`).join(', ')})`
      conditions.push(`chat_id = (SELECT m.chat_id FROM memberships m WHERE m.user_id IN ${userIdsSql})`)
      variables.push(...memberUserIds)
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
      SELECT g.id, g.title, g.updated_at
      FROM groups p ${whereClause} ${paginationClause};
    `, variables)

    return response.rows.map(row => this.deserializeGroup(row))
  }

  deserializeGroup(row) {
    return new Group({
      id: row['id'],
      title: row['title'],
      updatedAt: new Date(row['updated_at']),
    })
  }
}
