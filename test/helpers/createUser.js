import { Chance } from 'chance'
import { User } from '../../app/users/User.js'

const chance = new Chance()

export function createUser() {
  return new User({
    id: chance.guid(),
    name: chance.name(),
    username: chance.name(),
    isComplete: true,
    locale: chance.locale(),
  })
}