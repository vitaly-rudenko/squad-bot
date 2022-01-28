import './env.js'

import { Telegraf } from 'telegraf'
import express from 'express'
import ejs from 'ejs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import multer from 'multer'

import { Cache } from './app/utils/Cache.js'
import { versionCommand } from './app/flows/version.js'

import { PostgresStorage } from './app/PostgresStorage.js'
import { startCommand } from './app/flows/start.js'
import { usersCommand } from './app/flows/users.js'
import { debtsCommand } from './app/flows/debts.js'
import { receiptsGetCommand } from './app/flows/receipts.js'
import { withUserId } from './app/withUserId.js'
import { withPhaseFactory } from './app/withPhaseFactory.js'
import { UserSessionManager } from './app/utils/UserSessionManager.js'
import { phases } from './app/phases.js'
import { cardsAddCommand, cardsAddNumberMessage, cardsAddBankAction, cardsDeleteCommand, cardsDeleteIdAction, cardsGet, cardsGetIdAction, cardsGetUserIdAction } from './app/flows/cards.js'
import { paymentsGetCommand } from './app/flows/payments.js'

if (process.env.USE_NATIVE_ENV !== 'true') {
  console.log('Using .env file')
  dotenv.config()
}

(async () => {
  const upload = multer()

  const storage = new PostgresStorage(process.env.DATABASE_URL)
  await storage.connect()

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

  const debugChatId = process.env.DEBUG_CHAT_ID
  const bot = new Telegraf(telegramBotToken)

  bot.telegram.setMyCommands([
    { command: 'debts', description: 'Посчитать долги' },
    { command: 'receipts', description: 'Добавить/посмотреть чеки' },
    { command: 'payments', description: 'Добавить/посмотреть платежи' },
    { command: 'cards', description: 'Посмотреть банковские карты пользователя' },
    { command: 'addcard', description: 'Добавить банковскую карту' },
    { command: 'deletecard', description: 'Удалить банковскую карту' },
    { command: 'start', description: 'Зарегистрироваться' },
    { command: 'register', description: 'Зарегистрироваться' },
    { command: 'users', description: 'Список пользователей' },
    { command: 'version', description: 'Версия' },
  ])

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
    const ingoingDebts = await storage.getIngoingDebts(userId)
    const outgoingDebts = await storage.getOutgoingDebts(userId)
    const ingoingPayments = await storage.getIngoingPayments(userId)
    const outgoingPayments = await storage.getOutgoingPayments(userId)

    const debtMap = {}
    const addPayment = (fromUserId, toUserId, amount) => {
      const debtUserId = fromUserId === userId ? toUserId : fromUserId

      if (!debtMap[debtUserId]) {
        debtMap[debtUserId] = 0
      }

      if (fromUserId === userId) {
        debtMap[debtUserId] -= amount
      } else {
        debtMap[debtUserId] += amount
      }
    }

    for (const debt of ingoingDebts)
      addPayment(userId, debt.userId, debt.amount)
    for (const debt of outgoingDebts)
      addPayment(debt.userId, userId, debt.amount)
    for (const payment of ingoingPayments)
      addPayment(payment.userId, userId, payment.amount)
    for (const payment of outgoingPayments)
      addPayment(userId, payment.userId, payment.amount)

    const debts = Object.entries(debtMap)
      .map(([userId, amount]) => ({ userId, amount }))

    return {
      ingoingDebts: debts.filter(d => d.amount < 0).map(({ userId, amount }) => ({ userId, amount: -amount })),
      outgoingDebts: debts.filter(d => d.amount > 0),
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
  bot.command('receipts', receiptsGetCommand())
  bot.command('payments', paymentsGetCommand())

  bot.command('addcard', cardsAddCommand({ userSessionManager }))
  bot.action(/cards:add:bank:(.+)/, withPhase(phases.addCard.bank, cardsAddBankAction({ userSessionManager })))

  bot.command('deletecard', cardsDeleteCommand({ storage, userSessionManager }))
  bot.action(/cards:delete:id:(.+)/, withPhase(phases.deleteCard.id, cardsDeleteIdAction({ storage, userSessionManager })))

  bot.command('cards', cardsGet({ storage, userSessionManager }))
  bot.action(/cards:get:user-id:(.+)/, withPhase(phases.getCard.userId, cardsGetUserIdAction({ storage, userSessionManager })))
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

  async function storeReceipt({ id = undefined, payerId, amount, description = null, photo = null, mime = null, debts }) {
    if (id) {
      await storage.deleteReceiptById(id)
    }

    id = await storage.createReceipt({
      id,
      payerId,
      amount,
      description,
      photo,
      mime,
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
    res.render('receipt')
  })
  
  app.get('/paymentview', async (req, res) => {
    res.render('payment')
  })
  
  app.get('/paymentslist', async (req, res) => {
    res.render('payments_list')
  })
  
  app.get('/receiptslist', async (req, res) => {
    res.render('receipts_list')
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

  app.post('/receipts', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > 10_000_000) { // 10 mb
      res.sendStatus(413)
      return
    }

    const payerId = req.body.payer_id
    const photo = req.file?.buffer ?? null
    const mime = req.file?.mimetype ?? null
    const description = req.body.description ?? null
    const amount = Number(req.body.amount)
    const debts = JSON.parse(req.body.debts)

    const id = await storeReceipt({
      payerId,
      photo,
      mime,
      description,
      amount,
      debts,
    })

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
    const token = req.query.token

    let receipts = []
    if (token) {
      const { userId } = jwt.verify(token, process.env.TOKEN_SECRET)
      receipts = await storage.findReceiptsByParticipantUserId(userId)
    } else { // @deprecated
      receipts = await storage.findReceipts()
    }

    res.json(receipts)
  })

  app.get('/receipts/:receiptId/photo', async (req, res) => {
    const receiptId = req.params.receiptId

    const { photo, mime } = await storage.getReceiptPhoto(receiptId)

    if (photo) {
      res.contentType(mime).send(photo).end()
    } else {
      res.sendStatus(404)
    }
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
