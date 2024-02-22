import { Chance } from 'chance'

const chance = new Chance()

export class UsersMockStorage {
  constructor() {
    this._users = new Map()
  }

  /** @param {import('../../../src/users/types').User[]} users */
  mock_storeUsers(...users) {
    for (const user of users) {
      this._users.set(user.id, user)
    }
  }

  /** @param {string} userId */
  findById(userId) {
    return this._users.get(userId)
  }

  /** @param {{ ids: string[] }} options */
  find({ ids }) {
    const users = []

    for (const userId of ids) {
      if (this._users.has(userId)) {
        users.push(this._users.get(userId))
      }
    }

    return users
  }
}

/**
 * @param {T[]} users
 * @returns {import('../../../src/users/storage.js').UsersPostgresStorage}
 * @template {import('../../../src/users/types').User} T
 */
export function createUsersStorage(users) {
  const usersStorage = new UsersMockStorage()
  usersStorage.mock_storeUsers(...users)
  // @ts-ignore
  return usersStorage
}

/** @returns {import('../../../src/users/types').User} */
export function createUser() {
  return {
    id: String(chance.integer({ min: 100000, max: 999999 })),
    name: chance.name({ prefix: true }),
    username: chance.name().replaceAll(' ', '_').toLowerCase(),
    locale: /** @type {import('../../../src/localization/types').Locale} */ (chance.locale()),
  }
}
