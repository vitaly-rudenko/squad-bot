import './env.js'

import { Telegraf } from 'telegraf'
import express from 'express'

import { Cache } from './app/utils/Cache.js'
import { versionCommand } from './app/flows/version.js'

import { google } from 'googleapis'
import { renderReceiptIntoSheetValues } from './app/renderReceiptIntoSheetValues.js'
import { parseReceiptsFromSheetValues } from './app/parseReceiptsFromSheetValues.js'

(async () => {
  const credentials = JSON.parse(process.env.GOOGLE_API_CREDENTIALS)

  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  )

  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: 'Debts',
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  console.log('Receipts:', parseReceiptsFromSheetValues(res.data.values))

  const receipt = {
    date: new Date(),
    payer: 'Jon Snow',
    description: 'Some description',
    receiptUrl: 'http://example.com/receipt.jpg',
    amount: 123.45,
    debts: [
      { name: 'Vitaly', amount: 100, paid: 25, type: 'member', comment: 'hello world' },
      { name: 'Nikita', amount: null, paid: 0, type: 'member', comment: null },
      { name: 'Mikhail', amount: null, paid: 5.75, type: 'member', comment: null },
    ]
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: 'Debts',
    valueInputOption: 'RAW',
    requestBody: {
      values: [renderReceiptIntoSheetValues(res.data.values, receipt)]
    }
  })

  console.log('Added a new receipt!')

  return

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
