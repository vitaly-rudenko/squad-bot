import { expect } from 'chai'
import { createMembership, createUser, createUsers, generateChatId, getGroups } from './helpers.js'

describe('[groups]', () => {
  it('should be empty by default', async () => {
    const user = await createUser()

    expect(await getGroups(user.id)).to.deep.eq([])
  })

  it('should return groups that user is a member of', async () => {
    const chat1Id = generateChatId()
    const chat2Id = generateChatId()
    const chat3Id = generateChatId()

    const [user1, user2] = await createUsers(2)

    await createMembership(user1.id, chat1Id, 'Chat 1')
    await createMembership(user1.id, chat2Id, 'Chat 2')
    await createMembership(user2.id, chat2Id, 'Chat 2')
    await createMembership(user2.id, chat3Id, 'Chat 3')

    expect(await getGroups(user1.id)).to.deep.eq([
      { id: chat1Id, title: 'Chat 1' },
      { id: chat2Id, title: 'Chat 2' },
    ])

    expect(await getGroups(user2.id)).to.deep.eq([
      { id: chat2Id, title: 'Chat 2' },
      { id: chat3Id, title: 'Chat 3' },
    ])
  })
})