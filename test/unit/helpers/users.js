import { Chance } from 'chance'

const chance = new Chance()

export class UsersMockStorage {
  constructor() {
    this._users = new Map()
  }

  mock_storeUsers(...users) {
    for (const user of users) {
      this._users.set(user.id, user)
    }
  }

  findById(userId) {
    return this._users.get(userId)
  }

  findByIds(userIds) {
    const users = []

    for (const userId of userIds) {
      if (this._users.has(userId)) {
        users.push(this._users.get(userId))
      }
    }

    return users
  }

  findAndMapByIds(userIds) {
    const users = this.findByIds(userIds)
    return userIds.map(id => users.find(u => u.id === id))
  }
}

/**
 * @param {T[]} users
 * @returns {import('../../../app/features/users/storage.js').UsersPostgresStorage}
 * @template {import('../../../app/features/users/types').User} T
 */
export function createUsersStorage(users) {
  const usersStorage = new UsersMockStorage()
  usersStorage.mock_storeUsers(...users)
  // @ts-ignore
  return usersStorage
}

/** @returns {import('../../../app/features/users/types').User} */
export function createUser() {
  return {
    id: String(chance.integer({ min: 100000, max: 999999 })),
    name: chance.name({ prefix: true }),
    username: chance.name().replaceAll(' ', '_').toLowerCase(),
    locale: /** @type {import('../../../app/features/localization/types').Locale} */ (chance.locale()),
  }
}
