import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import fetch from 'node-fetch'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { TOKEN_SECRET } from './env.js'

chai.use(deepEqualInAnyOrder)

const createStringGenerator = (prefix = '') => {
  return () => prefix + crypto.randomBytes(10).toString('hex');
}

const generateUserId = createStringGenerator()

function validateResponse(response) {
  if (response.status !== 200) {
    throw new Error(`Invalid response: ${response.status} (${response.statusText})`)
  }
}

async function createUser(index = null) {
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

async function createUsers(count) {
  const users = []

  for (let i = 1; i <= count; i++) {
    users.push(await createUser(i))
  }

  return users
}

async function createReceipt(payerId, debtsMap) {
  const debts = Object.entries(debtsMap).map(([debtorId, amount]) => ({ debtorId, amount }))

  const receipt = {
    payerId,
    description: 'hello world',
    amount: debts.reduce((acc, curr) => acc + curr.amount, 0),
    debts,
  }

  const response = await fetch('http://localhost:3001/receipts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(receipt)
  })

  validateResponse(response)

  return receipt
}

async function getReceipts(userId) {
  const token = createToken(userId)
  const response = await fetch(`http://localhost:3001/receipts?token=${token}`)

  validateResponse(response)

  return await response.json()
}

function expectReceiptsToEqual(receipts1, receipts2) {
  expect(receipts1).to.have.lengthOf(receipts2.length)

  for (const [i, receipt] of receipts1.entries()) {
    expectReceiptToShallowEqual(receipt, receipts2[i])
  }
}

function expectReceiptToShallowEqual(receipt1, receipt2) {
  const { id, createdAt, ...receipt } = receipt1
  expect(id).to.be.a.string
  expect(Date.parse(createdAt)).to.be.greaterThanOrEqual(Date.now() - 10000)
  expect(receipt).to.deep.equalInAnyOrder(receipt2)
}

function createToken(userId) {
  return jwt.sign({ userId }, TOKEN_SECRET)
}

describe('[receipts]', () => {
  it('should create a receipt (1)', async () => {
    const [user1, user2, user3, user4] = await createUsers(4)

    expect(await getReceipts(user1.id)).to.deep.equalInAnyOrder([])
    expect(await getReceipts(user2.id)).to.deep.equalInAnyOrder([])
    expect(await getReceipts(user3.id)).to.deep.equalInAnyOrder([])
    expect(await getReceipts(user4.id)).to.deep.equalInAnyOrder([])

    await createReceipt(user1.id, {
      [user1.id]: 5,
      [user2.id]: 15,
    })

    const receipt1 = {
      payerId: user1.id,
      description: 'hello world',
      amount: 20,
      debts: [{
        debtorId: user1.id,
        amount: 5,
      }, {
        debtorId: user2.id,
        amount: 15,
      }]
    }

    expectReceiptsToEqual(await getReceipts(user1.id), [receipt1])

    expect(await getReceipts(user2.id)).to.deep.equalInAnyOrder(await getReceipts(user1.id))
    expect(await getReceipts(user3.id)).to.deep.equalInAnyOrder([])

    await createReceipt(user3.id, {
      [user1.id]: 50,
      [user3.id]: 50,
    })

    const receipt2 = {
      payerId: user3.id,
      description: 'hello world',
      amount: 100,
      debts: [{
        debtorId: user1.id,
        amount: 50,
      }, {
        debtorId: user3.id,
        amount: 50,
      }]
    }

    expectReceiptsToEqual(await getReceipts(user1.id), [receipt2, receipt1])
    expectReceiptsToEqual(await getReceipts(user2.id), [receipt1])
    expectReceiptsToEqual(await getReceipts(user3.id), [receipt2])
    expect(await getReceipts(user4.id)).to.deep.equalInAnyOrder([])
  })
})
