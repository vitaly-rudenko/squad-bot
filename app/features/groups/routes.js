import Router from 'express-promise-router'

/**
 * @param {{
 *   groupStorage: import('./storage.js').GroupsPostgresStorage,
 * }} input
 */
export function createGroupsRouter({
  groupStorage,
}) {
  const router = Router()

  router.get('/groups', async (req, res) => {
    res.json(
      await groupStorage.findByMemberUserId(req.user.id)
    )
  })

  return router
}
