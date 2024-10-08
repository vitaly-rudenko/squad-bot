export class GroupsPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /** @param {Omit<import('./types').Group, 'socialLinkFixEnabledAt'> & { socialLinkFixEnabledAt: Date | null | undefined }} group */
  async store(group) {
    const { id, title, socialLinkFixEnabledAt } = group

    await this._client.query(`
      INSERT INTO groups (id, title, updated_at, social_link_fix_enabled_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE
      SET title = $2
        , updated_at = $3
        , social_link_fix_enabled_at = ${socialLinkFixEnabledAt === undefined ? 'groups.social_link_fix_enabled_at' : '$4'}
      ;
    `, [id, title, new Date(), socialLinkFixEnabledAt]);
  }

  /** @param {string} id */
  async findById(id) {
    const { items } = await this.find({ ids: [id], limit: 1 })
    return items.at(0)
  }

  /**
   * @param {{
   *   ids?: string[],
   *   memberUserIds?: string[],
   *   limit?: number,
   *   offset?: number,
   * }} options
   */
  async find({ ids, memberUserIds, limit = 100, offset = 0 } = {}) {
    const conditions = []
    const variables = []

    if (Array.isArray(ids)) {
      if (ids.length === 0) {
        throw new Error('"ids" cannot be empty')
      }

      conditions.push(`g.id = ANY($${variables.length + 1})`)
      variables.push(ids)
    }

    if (Array.isArray(memberUserIds)) {
      if (memberUserIds.length === 0) {
        throw new Error('"memberUserIds" cannot be empty')
      }

      // TODO: inefficient subquery can be replaced with join?
      conditions.push(`id = ANY(SELECT m.group_id FROM memberships m WHERE m.user_id = ANY($${variables.length + 1}))`)
      variables.push(memberUserIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(`
      SELECT g.id, g.title, g.updated_at, g.social_link_fix_enabled_at
      FROM groups g ${whereClause}
      LIMIT ${limit} OFFSET ${offset};;
    `, variables)

    const { rows: [{ total }]} = await this._client.query(`
      SELECT COUNT(*)::int AS total
      FROM groups g ${whereClause};
    `, variables)

    return {
      total,
      items: response.rows.map(row => deserializeGroup(row)),
    }
  }
}

/**
 * @param {any} row
 * @returns {import('./types').Group}
 */
function deserializeGroup(row) {
  return {
    id: row['id'],
    title: row['title'],
    socialLinkFixEnabledAt: row['social_link_fix_enabled_at'] ? new Date(row['social_link_fix_enabled_at']) : null,
  }
}
