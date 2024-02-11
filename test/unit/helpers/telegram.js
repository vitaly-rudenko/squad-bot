import { spy } from 'sinon'

export function createTelegramMock() {
  const telegramMock = {
    sendMessage: spy(async () => {}),
  }

  /** @type {import('telegraf').Telegram} */
  // @ts-ignore
  const telegram = telegramMock

  return { telegram, telegramMock }
}
