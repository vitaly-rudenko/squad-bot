module.exports = {
  /** @param {{ context: import('pg').Pool }} context */
  async up({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls
      ADD COLUMN sort_order INTEGER;
    `)

    const { rows: rollCalls } = await db.query(`SELECT * FROM roll_calls;`)
    const perGroupOrder = new Map()

    // TODO: test this
    for (const rollCall of rollCalls) {
      const groupId = rollCall['group_id']
      const order = (perGroupOrder.get(groupId) ?? 0) + 1

      await db.query(`
        UPDATE roll_calls
        SET sort_order = $2
        WHERE id = $1;
      `, [rollCall['id'], order])

      perGroupOrder.set(groupId, order)
    }

    await db.query(`
      ALTER TABLE roll_calls
      ALTER COLUMN sort_order SET NOT NULL;
    `)

    await db.query(`
      ALTER TABLE roll_calls
      ADD CONSTRAINT unique_order UNIQUE (group_id, sort_order);
    `)
  },

  /** @param {{ context: import('pg').Pool }} context */
  async down({ context: db }) {
    await db.query(`
      ALTER TABLE roll_calls
      DROP CONSTRAINT unique_order;
    `)

    await db.query(`
      ALTER TABLE roll_calls
      DROP COLUMN sort_order;
    `)
  },
}
