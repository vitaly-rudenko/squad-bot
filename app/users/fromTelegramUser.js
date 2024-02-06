import { User } from './User.js'

export function fromTelegramUser(user) {
  return new User({
    id: String(user.id),
    name: user.first_name,
    username: user.username ?? undefined,
  })
}
