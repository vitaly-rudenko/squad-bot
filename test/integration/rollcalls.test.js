import './setup.js'
import { expect } from 'chai'
import { createMembership, createRollCall, createUser, createUsers, deleteRollCall, generateGroupId, getRollCalls, updateRollCall } from './helpers.js'

describe('[roll calls]', () => {
  it('should contain empty list by default', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    await expect(getRollCalls(groupId, user.id)).to.eventually.deep.eq([])
  })

  it('should not allow creating roll calls for groups that you are not a member of', async () => {
    const groupId = generateGroupId()
    const user = await createUser()

    await expect(createRollCall(user.id, groupId))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
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

  it('should scope roll calls per group', async () => {
    const [user1, user2, user3] = await createUsers(3)

    const group1Id = generateGroupId()
    const group2Id = generateGroupId()
    const group3Id = generateGroupId()

    for (const user of [user1, user2, user3]) {
      for (const groupId of [group1Id, group2Id, group3Id]) {
        await createMembership(user.id, groupId)
      }
    }

    await createRollCall(user1.id, group1Id, 1)
    await createRollCall(user2.id, group2Id, 2)
    await createRollCall(user3.id, group2Id, 3)
    await createRollCall(user1.id, group3Id, 4)
    await createRollCall(user2.id, group3Id, 5)
    await createRollCall(user3.id, group3Id, 6)

    for (const user of [user1, user2, user3]) {
      expect(await getRollCalls(group1Id, user.id)).to.have.lengthOf(1)
      expect(await getRollCalls(group2Id, user.id)).to.have.lengthOf(2)
      expect(await getRollCalls(group3Id, user.id)).to.have.lengthOf(3)
    }
  })

  it('should allow deleting roll calls', async () => {
    const [user1, user2] = await createUsers(2)

    const group1Id = generateGroupId()
    const group2Id = generateGroupId()

    for (const user of [user1, user2]) {
      for (const groupId of [group1Id, group2Id]) {
        await createMembership(user.id, groupId)
      }
    }

    const rollCall1 = await createRollCall(user1.id, group1Id, 1)
    const rollCall2 = await createRollCall(user2.id, group1Id, 2)
    const rollCall3 = await createRollCall(user1.id, group2Id, 3)
    const rollCall4 = await createRollCall(user2.id, group2Id, 4)

    await deleteRollCall(rollCall1.id, user1.id)
    await deleteRollCall(rollCall3.id, user1.id)

    expect(await getRollCalls(group1Id, user1.id)).to.have.lengthOf(1)
    expect(await getRollCalls(group2Id, user1.id)).to.have.lengthOf(1)

    await deleteRollCall(rollCall2.id, user2.id)
    await deleteRollCall(rollCall4.id, user2.id)

    expect(await getRollCalls(group1Id, user1.id)).to.have.lengthOf(0)
    expect(await getRollCalls(group2Id, user1.id)).to.have.lengthOf(0)
  })

  it('should not allow deleting roll calls of groups that you are not a member of', async () => {
    const [user1, user2] = await createUsers(2)

    const group1Id = generateGroupId()
    const group2Id = generateGroupId()

    await createMembership(user1.id, group1Id)
    await createMembership(user2.id, group2Id)

    const rollCall1 = await createRollCall(user1.id, group1Id, 1)
    const rollCall2 = await createRollCall(user2.id, group2Id, 2)

    await expect(deleteRollCall(rollCall1.id, user2.id))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
    await expect(deleteRollCall(rollCall2.id, user1.id))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
  })

  it('should restrict updating', async () => {
    const groupId = generateGroupId()
    const [user, otherUser] = await createUsers(2)
    await createMembership(user.id, groupId)

    const rollCall = await createRollCall(user.id, groupId, 1, {
      messagePattern: 'original message',
      excludeSender: true,
      pollOptions: ['yes', 'no'],
      usersPattern: '123,456,789'
    })

    await expect(updateRollCall(otherUser.id, rollCall.id, { excludeSender: false }))
      .to.eventually.be.rejectedWith('Invalid response: 403 (Forbidden)')
  })

  it('should allow updating roll calls', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    const rollCall = await createRollCall(user.id, groupId, 1, {
      messagePattern: 'original message',
      excludeSender: true,
      pollOptions: ['yes', 'no'],
      usersPattern: '123,456,789'
    })

    const updatedRollCall = await updateRollCall(user.id, rollCall.id, {
      messagePattern: 'updated message',
      excludeSender: false,
      pollOptions: [],
      usersPattern: '*',
    })

    expect(updatedRollCall.id).to.eq(rollCall.id)
    expect(updatedRollCall).to.containSubset({
      groupId,
      messagePattern: 'updated message',
      excludeSender: false,
      pollOptions: [],
      usersPattern: '*',
    })

    expect(await getRollCalls(groupId, user.id)).to.deep.eq([updatedRollCall])
  })

  it('should keep correct sort order for updated roll calls', async () => {
    const groupId = generateGroupId()
    const user = await createUser()
    await createMembership(user.id, groupId)

    const rollCall1 = await createRollCall(user.id, groupId, 1)
    const rollCall2 = await createRollCall(user.id, groupId, 2)
    const rollCall3 = await createRollCall(user.id, groupId, 3)
    const rollCall4 = await createRollCall(user.id, groupId, 4)

    await updateRollCall(user.id, rollCall3.id, { sortOrder: 1 })
    await updateRollCall(user.id, rollCall4.id, { sortOrder: 2 })
    await updateRollCall(user.id, rollCall1.id, { sortOrder: 3 })
    await updateRollCall(user.id, rollCall2.id, { sortOrder: 4 })

    expect((await getRollCalls(groupId, user.id)).map(rc => rc.id)).to.deep.eq([
      rollCall2.id, rollCall1.id, rollCall4.id, rollCall3.id,
    ])
  })
})
