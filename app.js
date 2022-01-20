import './env.js'

import { Telegraf } from 'telegraf'
import express from 'express'
import ejs from 'ejs'

import { Cache } from './app/utils/Cache.js'
import { versionCommand } from './app/flows/version.js'

import { PostgresStorage } from './app/PostgresStorage.js'
import { startCommand } from './app/flows/start.js'
import { usersCommand } from './app/flows/users.js'
import { debtsCommand } from './app/flows/debts.js'
import { receiptCommand } from './app/flows/receipt.js'
import { withUserId } from './app/withUserId.js'
import { withPhaseFactory } from './app/withPhaseFactory.js'
import { UserSessionManager } from './app/utils/UserSessionManager.js'
import { phases } from './app/phases.js'
import { cardsAddCommand, cardsAddNumberMessage, cardsAddBankAction, cardsDeleteCommand, cardsDeleteIdAction, cardsGet, cardsGetIdAction } from './app/flows/cards.js'

(async () => {
  const storage = new PostgresStorage(process.env.DATABASE_URL)
  await storage.connect()

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

  const debugChatId = process.env.DEBUG_CHAT_ID
  const bot = new Telegraf(telegramBotToken)

  bot.telegram.setMyCommands(
    ['receipt', 'debts', 'start', 'addcard', 'deletecard', 'cards', 'register', 'users', 'version']
      .map(command => ({
        command: `/${command}`,
        description: command[0].toUpperCase() + command.slice(1),
      }))
)

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

  async function getDebtsByUserId(userId) {
    const ingoingDebts = await storage.aggregateIngoingDebts(userId)
    const outgoingDebts = await storage.aggregateOutgoingDebts(userId)

    return {
      ingoingDebts: ingoingDebts
        .map(debt => {
          const outgoingDebt = outgoingDebts.find(d => d.userId === debt.userId)

          return {
            userId: debt.userId,
            amount: debt.amount - (outgoingDebt?.amount ?? 0),
          }
        })
        .filter(debt => debt.amount > 0),
      outgoingDebts: outgoingDebts
        .map(debt => {
          const ingoingDebt = ingoingDebts.find(d => d.userId === debt.userId)

          return {
            userId: debt.userId,
            amount: debt.amount - (ingoingDebt?.amount ?? 0),
          }
        })
        .filter(debt => debt.amount > 0),
    }
  }

  const userSessionManager = new UserSessionManager()
  const withPhase = withPhaseFactory(userSessionManager)

  bot.use(withUserId())

  bot.command('version', versionCommand())
  bot.command('start', startCommand({ storage }))
  bot.command('register', startCommand({ storage }))
  bot.command('users', usersCommand({ storage }))
  bot.command('debts', debtsCommand({ storage, getDebtsByUserId }))
  bot.command('receipt', receiptCommand())

  bot.command('addcard', cardsAddCommand({ userSessionManager }))
  bot.action(/cards:add:bank:(.+)/, withPhase(phases.addCard.bank, cardsAddBankAction({ userSessionManager })))

  bot.command('deletecard', cardsDeleteCommand({ storage, userSessionManager }))
  bot.action(/cards:delete:id:(.+)/, withPhase(phases.deleteCard.id, cardsDeleteIdAction({ storage, userSessionManager })))

  bot.command('cards', cardsGet({ storage, userSessionManager }))
  bot.action(/cards:get:id:(.+)/, withPhase(phases.getCard.id, cardsGetIdAction({ storage, userSessionManager })))

  bot.on('message',
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return;
      await next();
    },
    // Cards
    withPhase(phases.addCard.number, cardsAddNumberMessage({ storage, userSessionManager }))
  )

  bot.catch((error) => logError(error))

  await bot.telegram.deleteWebhook()

  const domain = process.env.DOMAIN
  const port = Number(process.env.PORT) || 3001
  const webhookUrl = `${domain}/bot${telegramBotToken}`

  await bot.telegram.setWebhook(webhookUrl, { allowed_updates: ['message', 'callback_query'] })

  const handledUpdates = new Cache(60_000)

  async function storeReceipt({ id = undefined, payerId, amount, description, debts }) {
    if (id) {
      await storage.deleteReceiptById(id)
    }

    id = await storage.createReceipt({
      id,
      payerId,
      amount,
      description,
    })

    for (const debt of debts) {
      const { debtorId, amount } = debt

      await storage.createDebt({
        receiptId: id,
        amount,
        debtorId,
      })
    }

    return id
  }

  const app = express()
  app.use(express.json())
  app.use("/static", express.static("./public"))
  app.engine("html", ejs.renderFile)
  app.set("view engine", "html")

  app.get('/', async (req, res) => {
    res.render('index')
  })

  app.post('/users', async (req, res) => {
    const { id, username, name } = req.body

    try {
      await storage.createUser({ id, username, name })
      res.sendStatus(200)
    } catch (error) {
      res.sendStatus(409)
    }
  })

  app.get('/users', async (req, res) => {
    const users = await storage.findUsers()
    res.json(users)
  })

  app.post('/receipts', async (req, res) => {
    const id = await storeReceipt(req.body)
    res.json({ id })
  })

  app.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body
    const id = await storage.createPayment({ fromUserId, toUserId, amount })
    res.json({ id })
  })

  app.delete('/payments/:paymentId', async (req, res) => {
    await storage.deletePaymentById(req.params.paymentId)
    res.sendStatus(200)
  })

  app.get('/receipts', async (req, res) => {
    const receipts = await storage.findReceipts()
    res.json(receipts)
  })

  app.delete('/receipts/:receiptId', async (req, res) => {
    await storage.deleteReceiptById(req.params.receiptId)
    res.sendStatus(200)
  })

  app.get('/payments', async (req, res) => {
    const fromUserId = req.query['from_user_id']
    const toUserId = req.query['to_user_id']
    const payments = await storage.findPayments({ fromUserId, toUserId })
    res.json(payments)
  })

  app.get('/debts/:userId', async (req, res) => {
    const debts = await getDebtsByUserId(req.params.userId)
    res.json(debts)
  })

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
