import { User } from '../../users/User.js'

export function startCommand({ usersStorage }) {
  return async (context) => {
    const userId = context.state.userId
    const { first_name: name, username } = context.from

    const user = new User({
      id: userId,
      name,
      username: username || null,
      isComplete: true,
    })

    let isNew = false

    try {
      await usersStorage.create(user)
      isNew = true
    } catch (error) {
      if (error.code === 'ALREADY_EXISTS') {
        await usersStorage.update(user)
      } else {
        throw error
      }
    }

    await context.reply(
      isNew
        ? '🎉 Ты успешно зарегистрировался'
        : '📝 Твои данные были обновлены, теперь ты можешь получать уведомления'
    )
  }
}

export function registerCommand({ usersStorage }) {
  return async (context) => {
    const userId = context.state.userId
    const { first_name: name, username } = context.from

    const user = new User({
      id: userId,
      name,
      username: username || null,
      isComplete: false,
    })

    let isNew = false

    try {
      await usersStorage.create(user)
      isNew = true
    } catch (error) {
      if (error.code === 'ALREADY_EXISTS') {
        await usersStorage.update(user)
      } else {
        throw error
      }
    }

    await context.reply(
      isNew
        ? '🎉 Ты успешно зарегистрировался (без поддержки уведомлений)'
        : '📝 Твои данные были обновлены'
    )
  }
}
