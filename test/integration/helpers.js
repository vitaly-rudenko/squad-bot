import { expect } from 'chai'
import fetch, { FormData, File } from 'node-fetch'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { uniqueNamesGenerator, names } from 'unique-names-generator'
import { TOKEN_SECRET } from './env.js'

const TEST_API_URL = 'http://localhost:3000'
const nameConfig = {
  dictionaries: [names],
  style: 'lowerCase',
}

export const generateGroupId = () => {
  return `group_${crypto.randomBytes(3).toString('hex')}`
}

export const generateUserId = () => {
  return `${uniqueNamesGenerator(nameConfig)}_${crypto.randomBytes(3).toString('hex')}`
}

export function validateResponse(response) {
  if (!String(response.status).startsWith('2')) {
    throw new Error(`Invalid response: ${response.status} (${response.statusText})`)
  }
}

/** @returns {Promise<import('../../app/features/users/types').User>} */
export async function createUser(index) {
  const userId = [index, generateUserId()].filter(Boolean).join('_')

  const response = await fetch(`${TEST_API_URL}/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...createAuthorizationHeader({ userId }),
    }
  })

  validateResponse(response)

  return await response.json()
}

export async function createUsers(count = 1) {
  const users = []

  for (let i = 1; i <= count; i++) {
    users.push(await createUser(i))
  }

  return users
}

/**
 *
 * @param {string} payerId
 * @param {Record<string, number>} debts
 * @param {{
 *   leavePhoto?: boolean
 *   photo?: Buffer
 *   mime?: string
 *   description?: string
 *   receiptId?: string
 *   amount?: number
 * }} [input]
 * @returns {Promise<import('../../app/receipts/Receipt.js').Receipt>}
 */
export async function createReceipt(payerId, debts, {
  leavePhoto = false,
  photo,
  mime,
  description,
  receiptId,
  amount,
} = {}) {
  if (!amount) {
    amount = Object.values(debts).reduce((a, b) => a + b, 0)
  }

  const body = new FormData()
  body.set('payer_id', payerId)
  body.set('amount', amount)
  body.set('debts', JSON.stringify(debts))

  if (receiptId) {
    body.set('id', receiptId)
  }

  if (description) {
    body.set('description', description)
  }

  if (leavePhoto) {
    body.set('leave_photo', 'true')
  } else if (photo) {
    const photoFile = new File([photo], 'photo.jpg', { type: mime })
    body.set('photo', photoFile, 'photo.jpg')
  }

  const response = await fetch(`${TEST_API_URL}/receipts`, {
    method: 'POST',
    headers: createAuthorizationHeader({ userId: payerId }),
    body,
  })

  validateResponse(response)

  return await response.json()
}

/** @returns {Promise<import('../../app/receipts/Receipt.js').Receipt[]>} */
export async function getReceipts(userId) {
  const response = await fetch(`${TEST_API_URL}/receipts`, {
    headers: createAuthorizationHeader({ userId })
  })

  validateResponse(response)

  return await response.json()
}

export async function getAuthToken(temporaryAuthToken) {
  const response = await fetch(`${TEST_API_URL}/authenticate?token=${temporaryAuthToken}`)

  return await response.json()
}

/** @returns {Promise<import('../../app/receipts/Receipt.js').Receipt>} */
export async function getReceipt(receiptId, userId) {
  const response = await fetch(`${TEST_API_URL}/receipts/${receiptId}`, {
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)

  return await response.json()
}

export async function deleteReceipt(receiptId, userId) {
  const response = await fetch(`${TEST_API_URL}/receipts/${receiptId}`, {
    headers: createAuthorizationHeader({ userId }),
    method: 'DELETE',
  })

  validateResponse(response)
}

export async function getReceiptPhoto(receiptId) {
  const response = await fetch(`${TEST_API_URL}/receipts/${receiptId}/photo`)

  if (response.status !== 200) {
    return response
  }

  return {
    mime: response.headers.get('Content-Type'),
    photo: await response.arrayBuffer(),
  }
}

export function expectReceiptsToEqual(receipts1, receipts2) {
  expect(receipts1).to.have.lengthOf(receipts2.length)

  for (const [i, receipt] of receipts1.entries()) {
    expectReceiptToShallowEqual(receipt, receipts2[i])
  }
}

export function expectReceiptToShallowEqual(receipt1, receipt2) {
  const { id, createdAt, ...receipt } = receipt1
  expect(id).to.be.a.string
  expect(Date.parse(createdAt)).to.be.greaterThanOrEqual(Date.now() - 10000)
  expect(receipt).to.deep.equalInAnyOrder(receipt2)
}

export function createAuthorizationHeader({
  userId,
  username = `username_${userId}`,
  name = toCapital(userId.split('_').slice(1).join(' ')),
  locale = 'uk',
}) {
  return { 'Authorization': `Bearer ${createToken({ userId, username, name, locale })}` }
}

function toCapital(str) {
  return str[0].toUpperCase() + str.slice(1)
}

export function createToken({ userId, username, name, locale }) {
  return jwt.sign({ user: { id: userId, username, name, locale } }, TOKEN_SECRET)
}

/** @returns {Promise<import('../../app/features/payments/types').Payment>} */
export async function createPayment(fromUserId, toUserId, amount) {
  const payment = { fromUserId, toUserId, amount }

  const response = await fetch(`${TEST_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAuthorizationHeader({ userId: fromUserId }),
    },
    body: JSON.stringify(payment)
  })

  validateResponse(response)

  return await response.json()
}

export async function deletePayment(paymentId, userId) {
  const response = await fetch(`${TEST_API_URL}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)
}

/** @returns {Promise<import('../../app/features/debts/types').Debt[]>} */
export async function getDebts(userId) {
  const response = await fetch(`${TEST_API_URL}/debts`, {
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)

  return await response.json()
}

/** @returns {Promise<import('../../app/features/roll-calls/types').RollCall>} */
export async function createRollCall(userId, groupId, sortOrder = 1, {
  messagePattern = '@channel',
  usersPattern = '*',
  excludeSender = true,
  pollOptions = [],
} = {}) {
  const response = await fetch(`${TEST_API_URL}/rollcalls`, {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader({ userId }),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      groupId,
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
      sortOrder,
    })
  })

  validateResponse(response)

  return await response.json()
}

/**
 *
 * @param {string} userId
 * @param {string} rollCallId
 * @param {{
 *   messagePattern?: string
 *   usersPattern?: string
 *   excludeSender?: boolean
 *   pollOptions?: string[]
 *   sortOrder?: number
 * }} input
 */
export async function updateRollCall(userId, rollCallId, {
  messagePattern,
  usersPattern,
  excludeSender,
  pollOptions,
  sortOrder,
} = {}) {
  const response = await fetch(`${TEST_API_URL}/rollcalls/${rollCallId}`, {
    method: 'PATCH',
    headers: {
      ...createAuthorizationHeader({ userId }),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
      sortOrder,
    })
  })

  validateResponse(response)
}

/** @returns {Promise<import('../../app/features/roll-calls/types').RollCall[]>} */
export async function getRollCalls(groupId, userId) {
  const response = await fetch(`${TEST_API_URL}/rollcalls?group_id=${groupId}`, {
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)

  return await response.json()
}

export async function deleteRollCall(id, userId) {
  const response = await fetch(`${TEST_API_URL}/rollcalls/${id}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)
}

/** @returns {Promise<import('../../app/features/groups/types').Group>} */
export async function getGroups(userId) {
  const response = await fetch(`${TEST_API_URL}/groups`, {
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)

  return await response.json()
}

// --- TEST MODE
export async function createMembership(userId, groupId, title = 'Fake chat') {
  const response = await fetch(`${TEST_API_URL}/memberships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, groupId, title })
  })

  validateResponse(response)
}

export const NO_DEBTS = { ingoingDebts: [], outgoingDebts: [] }
