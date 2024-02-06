import Router from 'express-promise-router'

/**
 * @param {{
 *   groupStorage: import('../groups/GroupPostgresStorage.js').GroupsPostgresStorage,
 * }} input
 */
export function createRouter({
  groupStorage,
}) {
  const router = Router()

  router.get('/groups', async (req, res) => {
    const groups = await groupStorage.findByMemberUserId(req.user.id)
    res.json(groups)
  })

  return router
}
