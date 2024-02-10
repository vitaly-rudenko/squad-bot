/** @param {import('./types').User[]} users */
export function deduplicateUsers(users) {
  const userIds = new Set()
  return users.filter(user => {
    if (userIds.has(user.id)) return false
    userIds.add(user.id)
    return true
  })
}