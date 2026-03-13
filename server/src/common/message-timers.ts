import type { Message } from '@telegraf/types'

type MessageTimer = {
  message: Pick<Message, 'chat' | 'message_id'>
  timeoutId: NodeJS.Timeout
}

let messageTimers: MessageTimer[] = []

export function setMessageTimeout(
  message: Pick<Message, 'chat' | 'message_id'>,
  timeoutMs: number,
  callback: () => unknown,
) {
  resetMessageTimers(message)

  const timeoutId = setTimeout(callback, timeoutMs)
  addMessageTimer({ message, timeoutId })
}

function addMessageTimer(messageTimer: MessageTimer) {
  messageTimers.unshift(messageTimer)
  messageTimers = messageTimers.slice(0, 100)
}

function resetMessageTimers(message: Pick<Message, 'chat' | 'message_id'>) {
  for (const messageTimer of messageTimers) {
    if (messageTimer.message.chat.id === message.chat.id && messageTimer.message.message_id === message.message_id) {
      clearTimeout(messageTimer.timeoutId)
    }
  }
}
