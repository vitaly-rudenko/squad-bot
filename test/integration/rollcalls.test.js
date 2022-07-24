import './setup.js'
import { expect } from 'chai'
import { createMembership, createRollCall, createUser, createUsers, deleteRollCall, generateGroupId, getRollCalls } from './helpers.js'

describe('[roll calls]', () => {
  it('should contain empty list by default', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    await expect(getRollCalls(groupId, user.id)).to.eventually.deep.eq([])
  })

  it('should not allow creating roll calls for chats that you are not a member of', async () => {
    const groupId = generateGroupId()
    const user = await createUser()

    await expect(createRollCall(user.id, groupId))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
  })

  it('should not allow creating roll calls with the same sort order values', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    await createRollCall(user.id, groupId, 1)
    await createRollCall(user.id, groupId, 2)

    await expect(createRollCall(user.id, groupId, 1))
      .to.eventually.be.rejectedWith('Invalid response: 409 (Conflict)')
    await expect(createRollCall(user.id, groupId, 2))
      .to.eventually.be.rejectedWith('Invalid response: 409 (Conflict)')
  })

  it('should sort roll calls by sort order values', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    const rollCall1 = await createRollCall(user.id, groupId, 2)
    const rollCall2 = await createRollCall(user.id, groupId, 1)
    const rollCall3 = await createRollCall(user.id, groupId, 3)
    const rollCall4 = await createRollCall(user.id, groupId, 4)

    const rollCalls = await getRollCalls(groupId, user.id)

    expect(rollCalls.map(rc => rc.id)).to.deep.eq([rollCall4.id, rollCall3.id, rollCall1.id, rollCall2.id])
    expect(rollCalls.map(rc => rc.sortOrder)).to.deep.eq([4, 3, 2, 1])
  })

  it('should create a basic roll call', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    const messagePattern = '@channel'
    const usersPattern = '*'
    const excludeSender = true
    const pollOptions = ['yes', 'no']

    const rollCall = await createRollCall(user.id, groupId, 1, {
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
    })

    expect(rollCall.id).to.be.a.string
    expect(rollCall).to.containSubset({
      groupId,
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
    })

    expect(await getRollCalls(groupId, user.id)).to.deep.equalInAnyOrder([rollCall])
  })

  it('should allow creating multiple roll calls', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    await createRollCall(user.id, groupId, 1)
    await createRollCall(user.id, groupId, 2)
    await createRollCall(user.id, groupId, 3)

    expect(await getRollCalls(groupId, user.id)).to.have.lengthOf(3)
  })

  it('should scope roll calls per chat', async () => {
    const [user1, user2, user3] = await createUsers(3)

    const chat1Id = generateGroupId()
    const chat2Id = generateGroupId()
    const chat3Id = generateGroupId()

    for (const user of [user1, user2, user3]) {
      for (const groupId of [chat1Id, chat2Id, chat3Id]) {
        await createMembership(user.id, groupId)
      }
    }

    await createRollCall(user1.id, chat1Id, 1)
    await createRollCall(user2.id, chat2Id, 2)
    await createRollCall(user3.id, chat2Id, 3)
    await createRollCall(user1.id, chat3Id, 4)
    await createRollCall(user2.id, chat3Id, 5)
    await createRollCall(user3.id, chat3Id, 6)

    for (const user of [user1, user2, user3]) {
      expect(await getRollCalls(chat1Id, user.id)).to.have.lengthOf(1)
      expect(await getRollCalls(chat2Id, user.id)).to.have.lengthOf(2)
      expect(await getRollCalls(chat3Id, user.id)).to.have.lengthOf(3)
    }
  })

  it('should allow deleting roll calls', async () => {
    const [user1, user2] = await createUsers(2)

    const chat1Id = generateGroupId()
    const chat2Id = generateGroupId()

    for (const user of [user1, user2]) {
      for (const groupId of [chat1Id, chat2Id]) {
        await createMembership(user.id, groupId)
      }
    }

    const rollCall1 = await createRollCall(user1.id, chat1Id, 1)
    const rollCall2 = await createRollCall(user2.id, chat1Id, 2)
    const rollCall3 = await createRollCall(user1.id, chat2Id, 3)
    const rollCall4 = await createRollCall(user2.id, chat2Id, 4)

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

    const chat1Id = generateGroupId()
    const chat2Id = generateGroupId()

    await createMembership(user1.id, chat1Id)
    await createMembership(user2.id, chat2Id)

    const rollCall1 = await createRollCall(user1.id, chat1Id, 1)
    const rollCall2 = await createRollCall(user2.id, chat2Id, 2)

    await expect(deleteRollCall(rollCall1.id, user2.id))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
    await expect(deleteRollCall(rollCall2.id, user1.id))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
  })

  it('should allow updating roll calls')

  it('should keep correct sort order for updated roll calls')
})
