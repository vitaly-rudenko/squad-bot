import jwt from 'jsonwebtoken'
import { env } from '../env'
import { faker } from '@faker-js/faker'
import { api } from './api'

/**
 * @param {T} input
 * @returns {T}
 * @template T
 */
export function unordered(input) {
  if (typeof input !== 'object' || input === null) {
    return input
  }

  if (Array.isArray(input)) {
    return expect.toIncludeSameMembers(input.map(unordered))
  }

  return Object.entries(input).reduce((result, [key, value]) => {
    result[key] = unordered(value)
    return result
  }, {})
}

/**
 * @param {Partial<import('../users/types').User>} [input]
 * @returns {Promise<import('../users/types').User>}
 */
export async function createUser(input) {
  const name = faker.person.firstName()
  const username = faker.internet.userName({ firstName: name }).toLowerCase().replaceAll('.', '_')

  const user = {
    id: `${username}_${faker.string.nanoid(8)}`,
    name,
    username,
    locale: faker.helpers.arrayElement(['en', 'uk']),
    ...input,
  }

  await api.put('/users', {}, { headers: generateAuthHeaders(user) })

  return user
}

/** @param {import('../users/types').User} user */
export function generateAuthHeaders(user) {
  return {
    'Authorization': `Bearer ${jwt.sign({ user }, env.TOKEN_SECRET)}`,
  }
}
