import { User } from '../../users/User.js'

export function startCommand({ usersStorage }) {
  return async (context) => {
    const { userId, localize } = context.state
    const { first_name: name, username } = context.from

    const user = new User({
      id: userId,
      name,
      username: username || null,
      isComplete: true,
    })

    try {
      await usersStorage.create(user)
      await context.reply(
        localize('command.start.signedUp'),
        { parse_mode: 'MarkdownV2' }
      )
    } catch (error) {
      if (error.code === 'ALREADY_EXISTS') {
        await usersStorage.update(user)
        await context.reply(
          localize('command.start.updated'),
          { parse_mode: 'MarkdownV2' }
        )
      } else {
        throw error
      }
    }
  }
}
