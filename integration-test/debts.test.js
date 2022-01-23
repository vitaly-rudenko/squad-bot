import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import fetch from 'node-fetch'
import crypto from 'crypto'

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

  for (let i = 0; i < count; i++) {
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

async function createPayment(fromUserId, toUserId, amount) {
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

async function getDebts(userId) {
  const response = await fetch(`http://localhost:3001/debts/${userId}`)

  validateResponse(response)

  return await response.json()
}

const NO_DEBTS = { ingoingDebts: [], outgoingDebts: [] }

describe('[debts]', () => {
  it('should calculate debts properly (1)', async () => {
    const [user1, user2] = await createUsers(2)

    await createReceipt(user1.id, {
      [user1.id]: 5,
      [user2.id]: 5,
    })

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 5,
      }],
      outgoingDebts: [],
    })

    expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [],
      outgoingDebts: [{
        userId: user1.id,
        amount: 5,
      }],
    })

    await createPayment(user2.id, user1.id, 5)

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder(NO_DEBTS)
    expect(await getDebts(user2.id)).to.deep.equalInAnyOrder(NO_DEBTS)
  })

  it('should calculate debts properly (2)', async () => {
    const [user1, user2, user3] = await createUsers(3)

    await createReceipt(user1.id, {
      [user1.id]: 2,
      [user2.id]: 3,
      [user3.id]: 5,
    })

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 3,
      }, {
        userId: user3.id,
        amount: 5,
      }],
      outgoingDebts: [],
    })

    await createPayment(user3.id, user1.id, 4)

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 3,
      }, {
        userId: user3.id,
        amount: 1,
      }],
      outgoingDebts: [],
    })

    await createPayment(user3.id, user1.id, 1)

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 3,
      }],
      outgoingDebts: [],
    })

    expect(await getDebts(user3.id)).to.deep.equalInAnyOrder(NO_DEBTS)
  })

  describe('[cross debts]', () => {
    it('should calculate cross debts properly (1)', async () => {
      const user1 = await createUser(1)
      const user2 = await createUser(2)

      await createReceipt(user1.id, {
        [user1.id]: 5,
        [user2.id]: 5,
      })

      await createReceipt(user2.id, {
        [user1.id]: 5,
        [user2.id]: 5,
      })

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder(NO_DEBTS)
      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder(NO_DEBTS)
    })

    it('should calculate cross debts properly (2)', async () => {
      const [user1, user2] = await createUsers(2)

      await createReceipt(user1.id, { [user2.id]: 10 })
      await createReceipt(user2.id, { [user1.id]: 6 })

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user2.id,
          amount: 4,
        }],
        outgoingDebts: [],
      })

      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [],
        outgoingDebts: [{
          userId: user1.id,
          amount: 4,
        }],
      })
    })

    it('should calculate cross debts properly (3)', async () => {
      const [user1, user2, user3] = await createUsers(3)

      await createReceipt(user1.id, {
        [user1.id]: 10,
        [user2.id]: 15,
        [user3.id]: 5,
      })

      await createReceipt(user1.id, {
        [user1.id]: 5,
        [user3.id]: 10,
      })

      await createReceipt(user2.id, {
        [user1.id]: 20,
        [user3.id]: 5,
      })

      await createReceipt(user3.id, {
        [user1.id]: 3,
        [user2.id]: 7,
      })

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user3.id,
          amount: 12,
        }],
        outgoingDebts: [{
          userId: user2.id,
          amount: 5,
        }],
      })

      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user1.id,
          amount: 5,
        }],
        outgoingDebts: [{
          userId: user3.id,
          amount: 2,
        }],
      })

      expect(await getDebts(user3.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user2.id,
          amount: 2,
        }],
        outgoingDebts: [{
          userId: user1.id,
          amount: 12,
        }],
      })

      await createPayment(user1.id, user2.id, 5) // exact
      await createPayment(user2.id, user3.id, 5) // more than needed (+3)
      await createPayment(user3.id, user1.id, 10) // less than needed (-2)

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user3.id,
          amount: 2,
        }],
        outgoingDebts: [],
      })

      // expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
      //   ingoingDebts: [],
      //   outgoingDebts: [],
      // })

      // expect(await getDebts(user3.id)).to.deep.equalInAnyOrder({
      //   ingoingDebts: [],
      //   outgoingDebts: [{
      //     userId: user1.id,
      //     amount: 2,
      //   }],
      // })
    })
  })
})
