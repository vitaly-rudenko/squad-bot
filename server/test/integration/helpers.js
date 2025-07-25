import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { expect } from 'chai'
import fetch, { FormData, File } from 'node-fetch'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { uniqueNamesGenerator, names } from 'unique-names-generator'
import { env } from '../../src/env.js'

export const receiptPhotoBuffer = await fs.readFile(
  path.join(path.dirname(fileURLToPath(import.meta.url)), './assets/receipt.png')
)

export const updatedReceiptPhotoBuffer = await fs.readFile(
  path.join(path.dirname(fileURLToPath(import.meta.url)), './assets/receipt_updated.jpeg')
)

export const TEST_API_URL = 'http://localhost:3000'
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

export async function validateResponse(response) {
  if (!String(response.status).startsWith('2')) {
    const json = await response.json().catch(() => null)
    throw new Error(`Invalid response: ${response.status} (${response.statusText}, response: ${JSON.stringify(json, null)})`)
  }
}

/** @returns {Promise<import('../../src/users/types').User>} */
export async function createUser(index) {
  const userId = [index, generateUserId()].filter(Boolean).join('_')

  const response = await fetch(`${TEST_API_URL}/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...createAuthorizationHeader({ userId }),
    }
  })

  await validateResponse(response)

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
 * @returns {Promise<import('../../src/receipts/types').Receipt>}
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
  body.set('amount', String(amount))
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
    const filename = mime === 'image/jpeg' ? 'photo.jpg' : 'photo.png'
    const photoFile = new File([photo], filename, { type: mime })
    body.set('photo', photoFile, filename)
  }

  const response = await fetch(`${TEST_API_URL}/receipts`, {
    method: 'POST',
    headers: createAuthorizationHeader({ userId: payerId }),
    body,
  })

  await validateResponse(response)

  return await response.json()
}

/** @returns {Promise<{ items: import('../../src/receipts/types').Receipt[]; total: number }>} */
export async function getReceipts(userId) {
  const response = await fetch(`${TEST_API_URL}/receipts`, {
    headers: createAuthorizationHeader({ userId })
  })

  await validateResponse(response)

  return await response.json()
}

/** @returns {Promise<string>} */
export async function getAuthToken(temporaryAuthToken) {
  const response = await fetch(`${TEST_API_URL}/authenticate?code=${temporaryAuthToken}`)

  return await response.json()
}

/** @returns {Promise<import('../../src/receipts/types').Receipt>} */
export async function getReceipt(receiptId, userId) {
  const response = await fetch(`${TEST_API_URL}/receipts/${receiptId}`, {
    headers: createAuthorizationHeader({ userId }),
  })

  await validateResponse(response)

  return await response.json()
}

export async function deleteReceipt(receiptId, userId) {
  const response = await fetch(`${TEST_API_URL}/receipts/${receiptId}`, {
    headers: createAuthorizationHeader({ userId }),
    method: 'DELETE',
  })

  await validateResponse(response)
}

/** @returns {Promise<{ binary: ArrayBufferLike; mime: string }>} */
export async function getPhoto(photoFilename) {
  const response = await fetch(`${TEST_API_URL}/photos/${photoFilename}`)

  if (response.status !== 200) {
    return response
  }

  return {
    mime: response.headers.get('Content-Type'),
    binary: await response.arrayBuffer(),
  }
}

export async function doesPhotoExist(photoFilename) {
  try {
    await fs.access(path.resolve('files', 'photos', photoFilename))
    return true
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
    return false
  }
}

export function expectReceiptsToEqual(receipts1, receipts2) {
  expect(receipts1).to.have.lengthOf(receipts2.length)

  for (const [i, receipt] of receipts1.entries()) {
    expectReceiptToShallowEqual(receipt, receipts2[i])
  }
}

export function expectReceiptToShallowEqual(receipt1, receipt2) {
  const { id, createdAt, updatedAt, photoFilename, ...shallowReceipt1 } = receipt1
  const { photoFilename: photoFilename2, ...shallowReceipt2 } = receipt2

  expect(id).to.be.a.string
  expect((photoFilename !== undefined) === (photoFilename2 !== undefined)).to.be.true
  expect(Date.parse(createdAt)).to.be.greaterThanOrEqual(Date.now() - 10000)
  expect(Date.parse(updatedAt)).to.be.greaterThanOrEqual(Date.now() - 10000)
  expect(shallowReceipt1).to.deep.equalInAnyOrder(shallowReceipt2)
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
  return jwt.sign({ user: { id: userId, username, name, locale } }, env.TOKEN_SECRET)
}

/** @returns {Promise<import('../../src/payments/types').Payment>} */
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

  await validateResponse(response)

  return await response.json()
}

export async function deletePayment(paymentId, userId) {
  const response = await fetch(`${TEST_API_URL}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader({ userId }),
  })

  await validateResponse(response)
}

/** @returns {Promise<import('../../src/debts/types').Debt[]>} */
export async function getDebts(userId) {
  const response = await fetch(`${TEST_API_URL}/debts`, {
    headers: createAuthorizationHeader({ userId }),
  })

  await validateResponse(response)

  return await response.json()
}

/** @returns {Promise<import('../../src/roll-calls/types').RollCall>} */
export async function createRollCall(userId, groupId, sortOrder = 1, {
  messagePattern = '@channel',
  usersPattern = '*',
  excludeSender = true,
  pollOptions = [],
  isMultiselectPoll = false,
  isAnonymousPoll = false,
} = {}) {
  const response = await fetch(`${TEST_API_URL}/roll-calls`, {
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
      isMultiselectPoll,
      isAnonymousPoll,
    })
  })

  await validateResponse(response)

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
  const response = await fetch(`${TEST_API_URL}/roll-calls/${rollCallId}`, {
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

  await validateResponse(response)
}

/** @returns {Promise<{ items: import('../../src/roll-calls/types').RollCall[], total: number }>} */
export async function getRollCalls(groupId, userId) {
  const response = await fetch(`${TEST_API_URL}/roll-calls?group_id=${groupId}`, {
    headers: createAuthorizationHeader({ userId }),
  })

  await validateResponse(response)

  return await response.json()
}

export async function deleteRollCall(id, userId) {
  const response = await fetch(`${TEST_API_URL}/roll-calls/${id}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader({ userId }),
  })

  await validateResponse(response)
}

/** @returns {Promise<{ items: import('../../src/groups/types').Group[]; total: number }>} */
export async function getGroups(userId) {
  const response = await fetch(`${TEST_API_URL}/groups`, {
    headers: createAuthorizationHeader({ userId }),
  })

  await validateResponse(response)

  return await response.json()
}

// --- TEST MODE
export async function createMembership(userId, groupId, title = 'Fake chat') {
  const response = await fetch(`${TEST_API_URL}/memberships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, groupId, title })
  })

  await validateResponse(response)
}

export const NO_DEBTS = { ingoingDebts: [], outgoingDebts: [] }
