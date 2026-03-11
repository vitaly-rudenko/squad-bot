import type { Message } from '@telegraf/types'
import { registry } from '../registry.js'

export function scheduleReplyMarkupRemoval(message: Message, timeout = 60_000) {
  const { telegram } = registry.export()
  setTimeout(() => {
    telegram.editMessageReplyMarkup(message.chat.id, message.message_id, undefined, { inline_keyboard: [] }).catch(() => {})
  }, timeout)
}
