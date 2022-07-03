import { expect } from 'chai'
import fetch, { FormData, File } from 'node-fetch'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { uniqueNamesGenerator, names } from 'unique-names-generator'
import { TOKEN_SECRET } from './env.js'

const TEST_API_URL = 'http://localhost:3001'
const nameConfig = {
  dictionaries: [names],
  style: 'lowerCase',
}

export const generateChatId = () => {
  return `chat_${crypto.randomBytes(3).toString('hex')}`
}

export const generateUserId = () => {
  return `${uniqueNamesGenerator(nameConfig)}_${crypto.randomBytes(3).toString('hex')}`
}

export function validateResponse(response) {
  if (!String(response.status).startsWith('2')) {
    throw new Error(`Invalid response: ${response.status} (${response.statusText})`)
  }
}

export async function createUser(index = null) {
  const userId = [index, generateUserId()].filter(Boolean).join('_')

  const response = await fetch(`${TEST_API_URL}/users`, {
    method: 'POST',
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

export async function createReceipt(payerId, debts, {
  leavePhoto = false,
  photo = null,
  mime = null,
  description = null,
  receiptId = null,
  amount = null,
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
}) {
  return { 'Authorization': `Bearer ${createToken({ userId, username, name })}` }
}

function toCapital(str) {
  return str[0].toUpperCase() + str.slice(1)
}

export function createToken({ userId, username, name }) {
  return jwt.sign({ user: { id: userId, username, name } }, TOKEN_SECRET)
}

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

export async function getDebts(userId) {
  const response = await fetch(`${TEST_API_URL}/debts`, {
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)

  return await response.json()
}

export async function createRollCall(userId, chatId, {
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
      chatId,
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
    })
  })

  validateResponse(response)

  return await response.json()
}

export async function getRollCalls(chatId, userId) {
  const response = await fetch(`${TEST_API_URL}/rollcalls?chat_id=${chatId}`, {
    headers: createAuthorizationHeader({ userId }),
  })

  validateResponse(response)

  return await response.json()
}

// --- TEST MODE
export async function createMembership(userId, chatId) {
  const response = await fetch(`${TEST_API_URL}/memberships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, chatId })
  })

  validateResponse(response)

  return await response.json()
}

export const NO_DEBTS = { ingoingDebts: [], outgoingDebts: [] }
