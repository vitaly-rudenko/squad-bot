import { escapeMd } from '../../utils/escapeMd.js'

export function usersCommand({ usersStorage, membershipStorage }) {
  return async (context) => {
    const { localize, chatId } = context.state
    const isPrivateChat = context.chat.type === 'private'

    let users
    if (isPrivateChat) {
      users = await usersStorage.findAll()
    } else {
      const userIds = await membershipStorage.findUserIdsByChatId(chatId)
      users = await usersStorage.findByIds(userIds)
    }

    function localizeUser(user) {
      return localize('command.users.user', {
        id: escapeMd(user.id),
        name: escapeMd(user.name),
        username: escapeMd(user.username),
        profileUrl: escapeMd(`tg://user?id=${user.id}`),
        completenessStatus: localize(
          user.isComplete
            ? 'command.users.completenessStatus.yes'
            : 'command.users.completenessStatus.no'
        )
      })
    }

    await context.reply(
      localize(isPrivateChat ? 'command.users.allUsers' : 'command.users.chatUsers', {
        users: users.map(user => localizeUser(user)).join('\n'),
      }),
      { parse_mode: 'MarkdownV2' }
    )
  }
}