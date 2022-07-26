import { expect } from 'chai'
import { createMembership, createUser, createUsers, generateGroupId, getGroups } from './helpers.js'

describe('[groups]', () => {
  it('should be empty by default', async () => {
    const user = await createUser()

    expect(await getGroups(user.id)).to.deep.eq([])
  })

  it('should return groups that user is a member of', async () => {
    const group1Id = generateGroupId()
    const group2Id = generateGroupId()
    const group3Id = generateGroupId()

    const [user1, user2] = await createUsers(2)

    await createMembership(user1.id, group1Id, 'Group 1')
    await createMembership(user1.id, group2Id, 'Group 2')
    await createMembership(user2.id, group2Id, 'Group 2')
    await createMembership(user2.id, group3Id, 'Group 3')

    expect(await getGroups(user1.id)).to.deep.equalInAnyOrder([
      { id: group1Id, title: 'Group 1' },
      { id: group2Id, title: 'Group 2' },
    ])

    expect(await getGroups(user2.id)).to.deep.equalInAnyOrder([
      { id: group2Id, title: 'Group 2' },
      { id: group3Id, title: 'Group 3' },
    ])
  })
})