import { registry } from '../registry.js'
import { markdownEscapes } from 'markdown-escapes'

const ESCAPE_REGEX = new RegExp(`(?<!\\\\)([\\${markdownEscapes.join('\\')}])`, 'g')

const GROUP_CHAT_TYPES = ['group', 'supergroup']

/**  @param {import('telegraf').Context} context */
export function isGroupChat(context) {
  return (
    context.chat !== undefined &&
    GROUP_CHAT_TYPES.includes(context.chat.type)
  )
}

/**  @param {import('telegraf').Context} context */
export function isPrivateChat(context) {
  return (
    context.chat !== undefined &&
    context.chat.type === 'private'
  )
}

export function createCommonFlow() {
  const { version: appVersion } = registry.export()

  /** @param {import('telegraf').Context} context */
  const version = async (context) => {
    if (!context.from || !context.chat) return

    await context.reply([
      `Version: ${appVersion}`,
      `Bot ID: ${context.botInfo.id}`,
      `User ID: ${context.from.id}`,
      `Chat ID: ${context.chat.id} (${context.chat.type})`,
    ].join('\n'))
  }

  return { version }
}

const ignoredErrors = [
  'chat not found',
  "bot can't initiate conversation with a user",
  "bots can't send messages to bots",
]

/** @param {Error} err */
export function isNotificationErrorIgnorable(err) {
  return ignoredErrors.some(m => err.message.includes(m))
}

export const requireGroupChat = () => {
  const { localize } = registry.export()

  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    const { locale } = context.state

    if (isGroupChat(context)) {
      return next()
    }

    await context.reply(localize(locale, 'groupChatOnly'), { parse_mode: 'MarkdownV2' })
  }
}

export const withGroupChat = () => {
  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    if (isGroupChat(context)) {
      return next()
    }
  }
}

export const requirePrivateChat = () => {
  const { localize } = registry.export()

  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { locale } = context.state

    if (isPrivateChat(context)) {
      return next()
    }

    await context.reply(localize(locale, 'privateChatOnly'), { parse_mode: 'MarkdownV2' })
  }
}

export const withPrivateChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    if (isPrivateChat(context)) {
      return next()
    }
  }
}

export const withChatId = () => {
  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    if (context.chat) {
      context.state.chatId = context.chat.id
    }

    return next()
  }
}

/**
 * @param {Middleware[]} middlewares
 * @template {(context: T, next: Function) => unknown} Middleware
 * @template {import('telegraf').Context} T
 */
export function wrap(...middlewares) {
  /**
   * @param {T} context
   * @param {Function} next
   */
  return async (context, next) => {
    for (const [i, middleware] of middlewares.entries()) {
      if (i === middlewares.length - 1) {
        return middleware(context, next)
      } else {
        let interrupt = true
        await middleware(context, async () => interrupt = false)
        if (interrupt) break
      }
    }

    return next()
  }
}

/** @param {string} string */
export function escapeMd(string) {
  return string.replace(ESCAPE_REGEX, '\\$1')
}
