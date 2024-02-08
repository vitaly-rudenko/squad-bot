import { Chance } from 'chance'

const chance = new Chance()

export function createUser() {
  return {
    id: chance.guid(),
    name: chance.name({ prefix: true }),
    username: chance.name().replaceAll(' ', '_').toLowerCase(),
    locale: chance.locale(),
  }
}
