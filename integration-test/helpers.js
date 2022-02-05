import { expect } from 'chai'
import fetch, { FormData, File } from 'node-fetch'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { TOKEN_SECRET } from './env.js'

const createStringGenerator = (prefix = '') => {
  return () => prefix + crypto.randomBytes(10).toString('hex');
}

const generateUserId = createStringGenerator()

export function validateResponse(response) {
  if (response.status !== 200) {
    throw new Error(`Invalid response: ${response.status} (${response.statusText})`)
  }
}

export async function createUser(index = null) {
  const id = [index, generateUserId()].filter(Boolean).join('_')
  const user = {
    id,
    name: `User ${id}`,
    username: `username_${id}`,
  }

  const response = await fetch('http://localhost:3001/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user)
  })

  validateResponse(response)

  return user
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
    body,
  })

  validateResponse(response)

  return (await response.json()).id
}

export async function getReceipts(userId) {
  const token = createToken(userId)
  const response = await fetch(`http://localhost:3001/receipts?token=${token}`)

  validateResponse(response)

  return await response.json()
}

export async function getReceipt(receiptId) {
  const response = await fetch(`http://localhost:3001/receipts/${receiptId}`)

  validateResponse(response)

  return await response.json()
}

export async function getReceiptPhoto(receiptId) {
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

export function createToken(userId) {
  return jwt.sign({ userId }, TOKEN_SECRET)
}

export async function createPayment(fromUserId, toUserId, amount) {
  const payment = { fromUserId, toUserId, amount }
  
  const response = await fetch('http://localhost:3001/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment)
  })

  validateResponse(response)

  return payment
}

export async function getDebts(userId) {
  const response = await fetch(`http://localhost:3001/debts/${userId}`)

  validateResponse(response)

  return await response.json()
}

export const NO_DEBTS = { ingoingDebts: [], outgoingDebts: [] }
