import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createMembership, createUser, getRollCalls } from './helpers.js'

chai.use(deepEqualInAnyOrder)

describe('[roll calls]', () => {
  it('should contain empty list by default', async () => {
    const chatId = 'fake-chat-id'
    const user = await createUser()
    await createMembership(user.id, chatId)

    expect(await getRollCalls(chatId, user.id)).to.deep.eq([])
  })
})
