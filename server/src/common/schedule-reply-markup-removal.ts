import type { Message } from '@telegraf/types'
import { registry } from '../registry.js'

export function scheduleReplyMarkupRemoval(message: Pick<Message, 'chat' | 'message_id'>, timeoutMs: number) {
  const { telegram } = registry.export()

  setTimeout(async () => {
    await telegram
      .editMessageReplyMarkup(message.chat.id, message.message_id, undefined, { inline_keyboard: [] })
      .catch(() => {})
  }, timeoutMs)
}
