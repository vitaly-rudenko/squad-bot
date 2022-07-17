import './setup.js'
import { expect } from 'chai'
import { createMembership, createRollCall, createUser, createUsers, deleteRollCall, generateChatId, getRollCalls } from './helpers.js'

describe('[roll calls]', () => {
  it('should contain empty list by default', async () => {
    const chatId = generateChatId()
    const user = await createUser()
    await createMembership(user.id, chatId)

    await expect(getRollCalls(chatId, user.id)).to.eventually.deep.eq([])
  })

  it('should not allow creating roll calls for chats that you are not a member of', async () => {
    const chatId = generateChatId()
    const user = await createUser()

    await expect(createRollCall(user.id, chatId))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
  })

  it('should create a basic roll call', async () => {
    const chatId = generateChatId()
    const user = await createUser()
    await createMembership(user.id, chatId)

    const messagePattern = '@channel'
    const usersPattern = '*'
    const excludeSender = true
    const pollOptions = ['yes', 'no']

    const rollCall = await createRollCall(user.id, chatId, {
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
    })

    expect(rollCall.id).to.be.a.string
    expect(rollCall).to.containSubset({
      chatId,
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
    })

    expect(await getRollCalls(chatId, user.id)).to.deep.equalInAnyOrder([rollCall])
  })

  it('should allow creating multiple roll calls', async () => {
    const chatId = generateChatId()
    const user = await createUser()
    await createMembership(user.id, chatId)

    await createRollCall(user.id, chatId)
    await createRollCall(user.id, chatId)
    await createRollCall(user.id, chatId)

    expect(await getRollCalls(chatId, user.id)).to.have.lengthOf(3)
  })

  it('should scope roll calls per chat', async () => {
    const [user1, user2, user3] = await createUsers(3)

    const chat1Id = generateChatId()
    const chat2Id = generateChatId()
    const chat3Id = generateChatId()

    for (const user of [user1, user2, user3]) {
      for (const chatId of [chat1Id, chat2Id, chat3Id]) {
        await createMembership(user.id, chatId)
      }
    }

    await createRollCall(user1.id, chat1Id)
    await createRollCall(user2.id, chat2Id)
    await createRollCall(user3.id, chat2Id)
    await createRollCall(user1.id, chat3Id)
    await createRollCall(user2.id, chat3Id)
    await createRollCall(user3.id, chat3Id)

    for (const user of [user1, user2, user3]) {
      expect(await getRollCalls(chat1Id, user.id)).to.have.lengthOf(1)
      expect(await getRollCalls(chat2Id, user.id)).to.have.lengthOf(2)
      expect(await getRollCalls(chat3Id, user.id)).to.have.lengthOf(3)
    }
  })

  it('should allow deleting roll calls', async () => {
    const [user1, user2] = await createUsers(2)

    const chat1Id = generateChatId()
    const chat2Id = generateChatId()

    for (const user of [user1, user2]) {
      for (const chatId of [chat1Id, chat2Id]) {
        await createMembership(user.id, chatId)
      }
    }

    const rollCall1 = await createRollCall(user1.id, chat1Id)
    const rollCall2 = await createRollCall(user2.id, chat1Id)
    const rollCall3 = await createRollCall(user1.id, chat2Id)
    const rollCall4 = await createRollCall(user2.id, chat2Id)

    await deleteRollCall(rollCall1.id, user1.id)
    await deleteRollCall(rollCall3.id, user1.id)

    expect(await getRollCalls(chat1Id, user1.id)).to.have.lengthOf(1)
    expect(await getRollCalls(chat2Id, user1.id)).to.have.lengthOf(1)

    await deleteRollCall(rollCall2.id, user2.id)
    await deleteRollCall(rollCall4.id, user2.id)

    expect(await getRollCalls(chat1Id, user1.id)).to.have.lengthOf(0)
    expect(await getRollCalls(chat2Id, user1.id)).to.have.lengthOf(0)
  })

  it('should not allow deleting roll calls of chats that you are not a member of', async () => {
    const [user1, user2] = await createUsers(2)

    const chat1Id = generateChatId()
    const chat2Id = generateChatId()

    await createMembership(user1.id, chat1Id)
    await createMembership(user2.id, chat2Id)

    const rollCall1 = await createRollCall(user1.id, chat1Id)
    const rollCall2 = await createRollCall(user2.id, chat2Id)

    await expect(deleteRollCall(rollCall1.id, user2.id))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
    await expect(deleteRollCall(rollCall2.id, user1.id))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
  })
})
