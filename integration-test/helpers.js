import { expect } from 'chai'
import fetch, { FormData, File } from 'node-fetch'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { TOKEN_SECRET } from './env.js'

const createStringGenerator = (prefix = '') => {
  return () => prefix + crypto.randomBytes(10).toString('hex');
}

export const generateUserId = createStringGenerator()

export function validateResponse(response) {
  if (!String(response.status).startsWith('2')) {
    throw new Error(`Invalid response: ${response.status} (${response.statusText})`)
  }
}

export async function createUser(index = null) {
  const userId = [index, generateUserId()].filter(Boolean).join('_')

  const response = await fetch('http://localhost:3001/users', {
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

  const response = await fetch('http://localhost:3001/receipts', {
    method: 'POST',
    headers: createAuthorizationHeader(payerId),
    body,
  })

  validateResponse(response)

  return await response.json()
}

export async function getReceipts(userId) {
  const response = await fetch('http://localhost:3001/receipts', {
    headers: createAuthorizationHeader(userId)
  })

  validateResponse(response)

  return await response.json()
}

export async function getAuthToken(temporaryAuthToken) {
  const response = await fetch(`http://localhost:3001/auth-token?temporary_auth_token=${temporaryAuthToken}`)

  return await response.json()
}

export async function getReceipt(receiptId, userId) {
  const response = await fetch(`http://localhost:3001/receipts/${receiptId}`, {
    headers: createAuthorizationHeader(userId),
  })

  validateResponse(response)

  return await response.json()
}

export async function deleteReceipt(receiptId, userId) {
  const response = await fetch(`http://localhost:3001/receipts/${receiptId}`, {
    headers: createAuthorizationHeader(userId),
    method: 'DELETE',
  })

  validateResponse(response)
}

export async function getReceiptPhoto(receiptId, userId) {
  const response = await fetch(`http://localhost:3001/receipts/${receiptId}/photo`)

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

export function createToken(id, username = 'fake-username', name = 'Fake Name') {
  return jwt.sign({ user: { id, username, name } }, TOKEN_SECRET)
}

export function createAuthorizationHeader(userId) {
  return { 'Authorization': `Bearer ${createToken(userId)}` }
}

export async function createPayment(fromUserId, toUserId, amount) {
  const payment = { fromUserId, toUserId, amount }
  
  const response = await fetch('http://localhost:3001/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAuthorizationHeader(fromUserId),
    },
    body: JSON.stringify(payment)
  })

  validateResponse(response)

  return await response.json()
}

export async function deletePayment(paymentId, userId) {
  const response = await fetch(`http://localhost:3001/payments/${paymentId}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader(userId),
  })

  validateResponse(response)
}

export async function getDebts(userId) {
  const response = await fetch(`http://localhost:3001/debts/${userId}`, {
    headers: createAuthorizationHeader(userId),
  })

  validateResponse(response)

  return await response.json()
}

export const NO_DEBTS = { ingoingDebts: [], outgoingDebts: [] }
