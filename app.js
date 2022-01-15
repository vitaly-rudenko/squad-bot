import './env.js'

import { Telegraf } from 'telegraf'
import express from 'express'

import { Cache } from './app/utils/Cache.js'
import { versionCommand } from './app/flows/version.js'

(async () => {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

  const debugChatId = process.env.DEBUG_CHAT_ID
  const bot = new Telegraf(telegramBotToken)

  process.on('unhandledRejection', async (error) => {
    await logError(error)
  })

  async function logError(error) {
    console.error('Unexpected error:', error)

    try {
      await bot.telegram.sendMessage(
        debugChatId,
        `❗️Unexpected error at ${new Date().toISOString()}❗️\n${error.name}: ${error.message}\n\nStack:\n${error.stack}`
      )
    } catch (error) {
      console.warn('Could not post log to debug chat:', error)
    }
  }

  bot.use(async (context, next) => {
    if (context.chat.type === 'group') {
      await next()
    }
  })

  bot.command('version', versionCommand())

  bot.catch((error) => logError(error))

  await bot.telegram.deleteWebhook()

  const domain = process.env.DOMAIN
  const port = Number(process.env.PORT) || 3001
  const webhookUrl = `${domain}/bot${telegramBotToken}`

  await bot.telegram.setWebhook(webhookUrl, { allowed_updates: ['message', 'callback_query'] })

  const handledUpdates = new Cache(60_000)

  const app = express()
  app.use(express.json())
  app.post(`/bot${telegramBotToken}`, async (req, res, next) => {
    const updateId = req.body['update_id']
    if (!updateId) {
      console.log('Invalid update:', req.body)
      res.sendStatus(500)
      return
    }

    if (handledUpdates.has(updateId)) {
      console.log('Update is already handled:', req.body)
      res.sendStatus(200)
      return
    }

    handledUpdates.set(updateId)
    console.log('Update received:', req.body)

    try {
      await bot.handleUpdate(req.body, res)
    } catch (error) {
      next(error)
    }
  })

  await new Promise(resolve => app.listen(port, () => resolve()))

  console.log(
    `Webhook 0.0.0.0:${port} is listening at ${webhookUrl}:`,
    await bot.telegram.getWebhookInfo()
  )
})()
