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
}
