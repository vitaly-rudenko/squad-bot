import './env.js'

import { Telegraf } from 'telegraf'
import pg from 'pg'
import express from 'express'
import ejs from 'ejs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import multer from 'multer'

import { Cache } from './app/utils/Cache.js'
import { versionCommand } from './app/shared/flows/version.js'

import { PostgresStorage } from './app/PostgresStorage.js'
import { registerCommand, startCommand } from './app/users/flows/start.js'
import { usersCommand } from './app/users/flows/users.js'
import { debtsCommand } from './app/debts/flows/debts.js'
import { receiptsGetCommand } from './app/receipts/flows/receipts.js'
import { withUserId } from './app/users/middlewares/withUserId.js'
import { withPhaseFactory } from './app/shared/middlewares/withPhaseFactory.js'
import { UserSessionManager } from './app/users/UserSessionManager.js'
import { Phases } from './app/Phases.js'
import { cardsAddCommand, cardsAddNumberMessage, cardsAddBankAction, cardsDeleteCommand, cardsDeleteIdAction, cardsGet, cardsGetIdAction, cardsGetUserIdAction } from './app/cards/flows/cards.js'
import { paymentsGetCommand } from './app/payments/flows/payments.js'
import { withUserFactory } from './app/users/middlewares/withUserFactory.js'
import { User } from './app/users/User.js'
import { UsersPostgresStorage } from './app/users/UsersPostgresStorage.js'
import { withLocalization } from './app/localization/middlewares/withLocalization.js'
import { withPrivateChat } from './app/shared/middlewares/withPrivateChat.js'
import { withGroupChat } from './app/shared/middlewares/withGroupChat.js'
import { CardsPostgresStorage } from './app/cards/CardsPostgresStorage.js'
import { DebtsPostgresStorage } from './app/debts/DebtsPostgresStorage.js'
import { Debt } from './app/debts/Debt.js'
import { AggregatedDebt } from './app/debts/AggregatedDebt.js'
import { localize } from './app/localization/localize.js'
import { ReceiptTelegramNotifier } from './app/receipts/notifications/ReceiptTelegramNotifier.js'
import { TelegramNotifier } from './app/shared/notifications/TelegramNotifier.js'
import { TelegramLogger } from './app/shared/TelegramLogger.js'
import { PaymentTelegramNotifier } from './app/payments/notifications/PaymentTelegramNotifier.js'

if (process.env.USE_NATIVE_ENV !== 'true') {
  console.log('Using .env file')
  dotenv.config()
}

(async () => {
  const upload = multer()

  const pgClient = new pg.Client(process.env.DATABASE_URL)
  await pgClient.connect()

  const usersStorage = new UsersPostgresStorage(pgClient)
  const cardsStorage = new CardsPostgresStorage(pgClient)
  const debtsStorage = new DebtsPostgresStorage(pgClient)
  const storage = new PostgresStorage(pgClient, debtsStorage)

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

  const debugChatId = process.env.DEBUG_CHAT_ID
  const bot = new Telegraf(telegramBotToken)

  const logger = new TelegramLogger({ bot, debugChatId })
  const telegramNotifier = new TelegramNotifier({ bot })

  const paymentNotifier = new PaymentTelegramNotifier({
    localize,
    telegramNotifier,
    usersStorage,
    logger,
  })

  const receiptNotifier = new ReceiptTelegramNotifier({
    localize,
    telegramNotifier,
    usersStorage,
    logger,
  })

  bot.telegram.setMyCommands([
    { command: 'debts', description: 'Підрахувати борги' },
    { command: 'receipts', description: 'Додати або переглянути чеки' },
    { command: 'payments', description: 'Додати або переглянути платежі' },
    { command: 'cards', description: 'Переглянути банківські картки користувача' },
    { command: 'addcard', description: 'Додати банківську картку' },
    { command: 'deletecard', description: 'Видалити банківську картку' },
    { command: 'start', description: 'Зареєструватись' },
    { command: 'register', description: 'Зареєструватись' },
    { command: 'users', description: 'Список користувачів' },
    { command: 'version', description: 'Версія' },
  ])

  process.on('unhandledRejection', (error) => {
    logger.error(error)
  })

  /**
   * @returns {Promise<{
   *   ingoingDebts: import('./app/debts/AggregatedDebt').AggregatedDebt[],
   *   outgoingDebts: import('./app/debts/AggregatedDebt').AggregatedDebt[],
   *   incompleteReceiptIds: string[],
   * }>}
   */
  async function aggregateDebtsByUserId(userId) {
    const ingoingDebts = await debtsStorage.aggregateIngoingDebts(userId)
    const outgoingDebts = await debtsStorage.aggregateOutgoingDebts(userId)
    const ingoingPayments = await storage.getIngoingPayments(userId)
    const outgoingPayments = await storage.getOutgoingPayments(userId)

    const debtMap = {}
    const incompleteMap = {}
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

    for (const debt of ingoingDebts) {
      addPayment(userId, debt.fromUserId, debt.amount)
      if (debt.incompleteReceiptIds.length > 0) {
        const key = debt.fromUserId + '_' + userId
        if (!incompleteMap[key]) incompleteMap[key] = new Set()
        incompleteMap[key].add(...debt.incompleteReceiptIds)
      }
    }

    for (const debt of outgoingDebts) {
      addPayment(debt.toUserId, userId, debt.amount)
      if (debt.incompleteReceiptIds.length > 0) {
        const key = userId + '_' + debt.toUserId
        if (!incompleteMap[key]) incompleteMap[key] = new Set()
        incompleteMap[key].add(...debt.incompleteReceiptIds)
      }
    }

    for (const payment of ingoingPayments)
      addPayment(payment.userId, userId, payment.amount)
    for (const payment of outgoingPayments)
      addPayment(userId, payment.userId, payment.amount)

    const debts = []
    for (const [debtUserId, amount] of Object.entries(debtMap)) {
      const ingoingKey = debtUserId + '_' + userId
      const outgoingKey = userId + '_' + debtUserId

      if (amount !== 0) {
        const [fromUserId, toUserId] = amount > 0 ? [userId, debtUserId] : [debtUserId, userId]
        const key = fromUserId + '_' + toUserId

        debts.push(
          new AggregatedDebt({
            fromUserId,
            toUserId,
            amount: Math.abs(amount),
            incompleteReceiptIds: incompleteMap[key] ? [...incompleteMap[key]] : [],
          })
        )
      } else {
        if (incompleteMap[ingoingKey]) {
          debts.push(
            new AggregatedDebt({
              fromUserId: debtUserId,
              toUserId: userId,
              amount: 0,
              incompleteReceiptIds: [...incompleteMap[ingoingKey]],
            })
          )
        }

        if (incompleteMap[outgoingKey]) {
          debts.push(
            new AggregatedDebt({
              fromUserId: userId,
              toUserId: debtUserId,
              amount: 0,
              incompleteReceiptIds: [...incompleteMap[outgoingKey]],
            })
          )
        }
      }
    }

    return {
      ingoingDebts: debts.filter(debt => debt.toUserId === userId),
      outgoingDebts: debts.filter(debt => debt.fromUserId === userId),
      incompleteReceiptIds: [...new Set([
        ...ingoingDebts.flatMap(d => d.incompleteReceiptIds),
        ...outgoingDebts.flatMap(d => d.incompleteReceiptIds),
      ])],
    }
  }

  const userSessionManager = new UserSessionManager()
  const withPhase = withPhaseFactory(userSessionManager)
  const withUser = withUserFactory(usersStorage)

  bot.use(withUserId())
  bot.use(withLocalization())

  bot.command('version', versionCommand())
  bot.command('start', withPrivateChat(), startCommand({ usersStorage }))
  bot.command('register', withGroupChat(), registerCommand({ usersStorage }))

  bot.command('users', withPrivateChat(), withUser(), usersCommand({ usersStorage }))
  bot.command('debts', withUser(), debtsCommand({ storage, usersStorage, aggregateDebtsByUserId }))
  bot.command('receipts', withUser(), receiptsGetCommand())
  bot.command('payments', withUser(), paymentsGetCommand())

  bot.command('addcard', withUser(), cardsAddCommand({ userSessionManager }))
  bot.action(/cards:add:bank:(.+)/, withUser(), withPhase(Phases.addCard.bank, cardsAddBankAction({ userSessionManager })))

  bot.command('deletecard', withUser(), cardsDeleteCommand({ cardsStorage, userSessionManager }))
  bot.action(/cards:delete:id:(.+)/, withUser(), withPhase(Phases.deleteCard.id, cardsDeleteIdAction({ cardsStorage, userSessionManager })))

  bot.command('cards', withUser(), cardsGet({ usersStorage, userSessionManager }))
  bot.action(/cards:get:user-id:(.+)/, withUser(), withPhase(Phases.getCard.userId, cardsGetUserIdAction({ cardsStorage, usersStorage, userSessionManager })))
  bot.action(/cards:get:id:(.+)/, withUser(), withPhase(Phases.getCard.id, cardsGetIdAction({ cardsStorage, userSessionManager })))

  bot.on('message',
    withUser({ ignore: true }),
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return;
      await next();
    },
    // Cards
    withPhase(Phases.addCard.number, cardsAddNumberMessage({ cardsStorage, userSessionManager }))
  )

  bot.catch((error) => logger.error(error))

  async function storeReceipt(editorId, { id = undefined, payerId, amount, description = null, photo = null, mime = null, debts }) {
    const isNew = !Boolean(id)
    if (id) {
      await storage.updateReceipt({
        id,
        payerId,
        amount,
        description,
        photo,
        mime,
      })

      await debtsStorage.deleteByReceiptId(id)
    } else {
      id = await storage.createReceipt({
        payerId,
        amount,
        description,
        photo,
        mime,
      })
    }

    for (const debt of debts) {
      const { debtorId, amount } = debt

      await debtsStorage.create(
        new Debt({
          receiptId: id,
          debtorId,
          amount,
        })
      )
    }

    const receipt = { payerId, amount, description, debts }
    if (isNew) {
      receiptNotifier.created(receipt, { editorId })
    } else {
      receiptNotifier.updated(receipt, { editorId })
    }

    return id
  }

  async function deleteReceipt(editorId, receiptId) {
    const receipt = await storage.findReceiptById(receiptId)

    await debtsStorage.deleteByReceiptId(receiptId)
    await storage.deleteReceiptById(receiptId)

    await receiptNotifier.deleted(receipt, { editorId })
  }

  async function storePayment(editorId, { fromUserId, toUserId, amount }) {
    const id = await storage.createPayment({ fromUserId, toUserId, amount })

    await paymentNotifier.created({
      fromUserId,
      toUserId,
      amount,
    }, { editorId })

    return id
  }

  async function deletePayment(editorId, paymentId) {
    const payment = await storage.findPaymentById(paymentId)

    await storage.deletePaymentById(paymentId)

    await paymentNotifier.deleted(payment, { editorId })
  }

  const app = express()
  app.use(express.json())
  app.use('/static', express.static('./public'))
  app.engine('html', ejs.renderFile)
  app.set('view engine', 'html')

  app.get('/', async (req, res) => {
    res.render('receipt')
  })

  app.get('/authpage', async (req, res) => {
    res.render('auth')
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

  // --- Telegram

  const handledBotUpdates = new Cache(60_000)

  app.post(`/bot${telegramBotToken}`, async (req, res, next) => {
    const updateId = req.body['update_id']
    if (!updateId) {
      console.log('Invalid update:', req.body)
      res.sendStatus(500)
      return
    }

    if (handledBotUpdates.has(updateId)) {
      console.log('Update is already handled:', req.body)
      res.sendStatus(200)
      return
    }

    handledBotUpdates.set(updateId)
    console.log('Update received:', req.body)

    try {
      await bot.handleUpdate(req.body, res)
    } catch (error) {
      next(error)
    }
  })

  // --- API

  const temporaryAuthTokenCache = new Cache(60_000)

  app.get('/authenticate', async (req, res, next) => {
    const temporaryAuthToken = req.query['token']
    if (temporaryAuthTokenCache.has(temporaryAuthToken)) {
      res.status(400).json({ error: { code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE' } })
      return
    }

    let userId
    try {
      ({ userId } = jwt.verify(temporaryAuthToken, process.env.TOKEN_SECRET))
      if (!userId) {
        throw new Error('Temporary token does not contain user ID')
      }
    } catch (error) {
      res.status(400).json({ error: { code: 'INVALID_TEMPORARY_AUTH_TOKEN' } })
      return
    }

    const user = await usersStorage.findById(userId)
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND' } })
      return
    }

    res.json(jwt.sign({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
      }
    }, process.env.TOKEN_SECRET))
    temporaryAuthTokenCache.set(temporaryAuthToken)
  })

  app.get('/receipts/:receiptId/photo', async (req, res) => {
    const receiptId = req.params.receiptId
    const receiptPhoto = await storage.getReceiptPhoto(receiptId)

    if (receiptPhoto) {
      res.contentType(receiptPhoto.mime).send(receiptPhoto.photo).end()
    } else {
      res.sendStatus(404)
    }
  })

  app.use((req, res, next) => {
    const token = req.headers['authorization']?.slice(7) // 'Bearer ' length

    if (token) {
      try {
        const { user } = jwt.verify(token, process.env.TOKEN_SECRET)
        if (!user.id || !user.username || !user.name) {
          throw new Error('Token does not contain user ID, username and name')
        }
        req.user = user
        next()
      } catch (error) {
        res.status(401).json({ error: { code: 'INVALID_AUTH_TOKEN', message: error.message } })
      }
    } else {
      res.status(401).json({ error: { code: 'AUTH_TOKEN_NOT_PROVIDED' } })
    }
  })

  app.post('/users', async (req, res) => {
    const { id, username, name } = req.user

    try {
      const user = new User({ id, name, username })
      await usersStorage.create(user)
      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
      })
    } catch (error) {
      res.sendStatus(409)
    }
  })

  app.get('/users', async (req, res) => {
    const users = await usersStorage.findAll()
    res.json(users)
  })

  function formatReceipt(receipt) {
    return {
      id: receipt.id,
      createdAt: receipt.createdAt,
      payerId: receipt.payerId,
      amount: receipt.amount,
      description: receipt.description,
      hasPhoto: receipt.hasPhoto,
      debts: receipt.debts.map(debt => ({
        debtorId: debt.debtorId,
        amount: debt.amount,
      }))
    }
  }

  app.post('/receipts', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > 10_000_000) { // 10 mb
      res.sendStatus(413)
      return
    }

    let id = req.body.id ?? null

    const payerId = req.body.payer_id
    let photo = req.file?.buffer ?? null
    let mime = req.file?.mimetype ?? null
    const description = req.body.description ?? null
    const amount = Number(req.body.amount)
    const debts = Object.entries(JSON.parse(req.body.debts))
      .map(([debtorId, amount]) => ({
        debtorId,
        amount: (amount !== null && Number.isInteger(Number(amount)) && Number(amount) > 0) ? Number(amount) : null,
      }))

    if (id && req.body.leave_photo === 'true' && (!photo || !mime)) {
      const receiptPhoto = await storage.getReceiptPhoto(id)
      if (receiptPhoto) {
        photo = receiptPhoto.photo
        mime = receiptPhoto.mime
      }
    }

    id = await storeReceipt(req.user.id, {
      id,
      payerId,
      photo,
      mime,
      description,
      amount,
      debts,
    })

    const receipt = await storage.findReceiptById(id)
    res.json(formatReceipt(receipt))
  })

  app.get('/receipts', async (req, res) => {
    const receipts = await storage.findReceiptsByParticipantUserId(req.user.id)
    res.json(receipts.map(formatReceipt))
  })

  app.get('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    const receipt = await storage.findReceiptById(receiptId)

    if (!receipt) {
      return res.sendStatus(404)
    }

    res.json(formatReceipt(receipt))
  })

  app.delete('/receipts/:receiptId', async (req, res) => {
    await deleteReceipt(req.user.id, req.params.receiptId)
    res.sendStatus(204)
  })

  app.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body
    const id = await storePayment(req.user.id, { fromUserId, toUserId, amount })
    const payment = await storage.findPaymentById(id)
    res.json(payment)
  })

  app.delete('/payments/:paymentId', async (req, res) => {
    await deletePayment(req.user.id, req.params.paymentId)
    res.sendStatus(204)
  })

  app.get('/payments', async (req, res) => {
    const fromUserId = req.query['from_user_id']
    const toUserId = req.query['to_user_id']
    const payments = await storage.findPayments({ fromUserId, toUserId })
    res.json(payments)
  })

  app.get('/debts', async (req, res) => {
    const { ingoingDebts, outgoingDebts, incompleteReceiptIds } = await aggregateDebtsByUserId(req.user.id)

    res.json({
      ingoingDebts: ingoingDebts.map(debt => ({
        userId: debt.fromUserId,
        amount: debt.amount,
        ...debt.incompleteReceiptIds.length > 0 && { isIncomplete: debt.incompleteReceiptIds.length > 0 },
      })),
      outgoingDebts: outgoingDebts.map(debt => ({
        userId: debt.toUserId,
        amount: debt.amount,
        ...debt.incompleteReceiptIds.length > 0 && { isIncomplete: debt.incompleteReceiptIds.length > 0 },
      })),
      ...incompleteReceiptIds.length > 0 && { incompleteReceiptIds }
    })
  })

  const port = Number(process.env.PORT) || 3001

  await new Promise(resolve => app.listen(port, () => resolve()))

  await bot.telegram.deleteWebhook()

  const domain = process.env.DOMAIN
  const webhookUrl = `${domain}/bot${telegramBotToken}`

  console.log('Setting webhook to', webhookUrl)
  while (true) {
    try {
      await bot.telegram.setWebhook(webhookUrl, { allowed_updates: ['message', 'callback_query'] })
      break;
    } catch (error) {
      console.log('Could not set webhook, retrying...', error.message)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(
    `Webhook 0.0.0.0:${port} is listening at ${webhookUrl}:`,
    await bot.telegram.getWebhookInfo()
  )
})()
