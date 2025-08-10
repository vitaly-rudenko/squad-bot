import { isDefined } from '../common/utils.js'

export class LinksPostgresStorage {
  /** @param {import('pg').Client} client */
  constructor(client) {
    this._client = client
  }

  /**
   * @param {Omit<import('./types.js').Link, 'id'>} input
   * @returns {Promise<import('./types.js').Link>}
   */
  async create(input) {
    const response = await this._client.query(`
      INSERT INTO links (group_id, label, url)
      VALUES ($1, $2)
      RETURNING id;
    `, [
      input.groupId,
      input.label,
      input.url,
    ])

    return {
      id: response.rows[0].id,
      ...input,
    }
  }

  /** @param {Pick<import('./types.js').Link, 'id'> & Partial<import('./types.js').Link>} input */
  async update(input) {
    const fields = [
      input.label !== undefined ? ['label', input.label] : undefined,
      input.url !== undefined ? ['url', input.url] : undefined,
    ].filter(isDefined)

    if (fields.length > 0) {
      await this._client.query(`
        UPDATE links
        SET ${fields.map(([key], i) => `${key} = $${i + 2}`).join(', ')}
        WHERE id = $1;
      `, [input.id, ...fields.map(field => field[1])])
    }
  }

  /** @param {number} id */
  async deleteById(id) {
    await this._client.query(`
      DELETE FROM links
      WHERE id = $1;
    `, [id])
  }

  /** @param {number} id */
  async findById(id) {
    const { items } = await this.find({ ids: [id], limit: 1 })
    return items.at(0)
  }

  /**
   * @param {{
   *   ids?: number[],
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

      conditions.push(`l.id = ANY($${variables.length + 1})`)
      variables.push(ids)
    }

    if (Array.isArray(groupIds)) {
      if (groupIds.length === 0) {
        throw new Error('"groupIds" cannot be empty')
      }

      conditions.push(`l.group_id = ANY($${variables.length + 1})`)
      variables.push(groupIds)
    }

    if (conditions.length === 0) {
      throw new Error('No conditions were provided for the search')
    }

    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(') AND (')})` : ''

    const response = await this._client.query(`
      SELECT l.id,
        l.group_id,
        l.label,
        l.url
      FROM links l ${whereClause}
      LIMIT ${limit} OFFSET ${offset};
    `, variables)

    const { rows: [{ total }]} = await this._client.query(`
      SELECT COUNT(*)::int AS total
      FROM links l ${whereClause};
    `, variables)

    return {
      total,
      items: response.rows.map(row => deserializeLink(row)),
    }
  }
}

/**
 * @param {any} row
 * @returns {import('./types.js').Link}
 */
export function deserializeLink(row) {
  return {
    id: row['id'],
    groupId: row['group_id'],
    label: row['label'],
    url: row['url'],
  }
}
