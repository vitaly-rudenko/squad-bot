import { Chance } from 'chance'
import { User } from '../../../app/users/User.js'

const chance = new Chance()

/** @returns {User & { username: string }} */
export function createUser() {
  // @ts-ignore
  return new User({
    id: chance.guid(),
    name: chance.name({ prefix: true }),
    username: chance.name().replaceAll(' ', '_').toLowerCase(),
    isComplete: true,
    locale: chance.locale(),
  })
}
