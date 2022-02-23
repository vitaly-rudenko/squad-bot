import { escapeMd } from '../../utils/escapeMd.js'

export function usersCommand({ usersStorage }) {
  return async (context) => {
    const users = await usersStorage.findAll()

    function localizeUser(user) {
      return context.state.localize('command.users.user', {
        id: escapeMd(user.id),
        name: escapeMd(user.name),
        username: escapeMd(user.username),
        profileUrl: escapeMd(`tg://user?id=${user.id}`),
        completenessStatus: context.state.localize(
          user.isComplete
            ? 'command.users.completenessStatus.yes'
            : 'command.users.completenessStatus.no'
        )
      })
    }

    await context.reply(
      context.state.localize('command.users.users', {
        users: users.map(user => localizeUser(user)).join('\n'),
      }),
      { parse_mode: 'MarkdownV2' }
    )
  }
}