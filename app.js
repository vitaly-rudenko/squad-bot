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

import { startCommand } from './app/users/flows/start.js'
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
import { localize } from './app/localization/localize.js'
import { ReceiptTelegramNotifier } from './app/receipts/notifications/ReceiptTelegramNotifier.js'
import { TelegramNotifier } from './app/shared/notifications/TelegramNotifier.js'
import { TelegramLogger } from './app/shared/TelegramLogger.js'
import { PaymentTelegramNotifier } from './app/payments/notifications/PaymentTelegramNotifier.js'
import { PaymentsPostgresStorage } from './app/payments/PaymentsPostgresStorage.js'
import { Payment } from './app/payments/Payment.js'
import { ReceiptsPostgresStorage } from './app/receipts/ReceiptsPostgresStorage.js'
import { Receipt } from './app/receipts/Receipt.js'
import { ReceiptPhoto } from './app/receipts/ReceiptPhoto.js'
import { ReceiptManager } from './app/receipts/ReceiptManager.js'
import { PaymentManager } from './app/payments/PaymentManager.js'
import { DebtManager } from './app/debts/DebtManager.js'

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
  const paymentsStorage = new PaymentsPostgresStorage(pgClient)
  const receiptsStorage = new ReceiptsPostgresStorage(pgClient)

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

  const debugChatId = process.env.DEBUG_CHAT_ID
  const bot = new Telegraf(telegramBotToken)

  const logger = new TelegramLogger({ telegram: bot.telegram, debugChatId })
  const telegramNotifier = new TelegramNotifier({ telegram: bot.telegram })

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
    debtsStorage,
    logger,
  })

  const receiptManager = new ReceiptManager({
    debtsStorage,
    receiptNotifier,
    receiptsStorage,
  })

  const paymentManager = new PaymentManager({
    paymentNotifier,
    paymentsStorage,
  })

  const debtManager = new DebtManager({
    debtsStorage,
    paymentsStorage,
  })

  bot.telegram.setMyCommands([
    { command: 'debts', description: 'Підрахувати борги' },
    { command: 'receipts', description: 'Додати або переглянути чеки' },
    { command: 'payments', description: 'Додати або переглянути платежі' },
    { command: 'cards', description: 'Переглянути банківські картки користувача' },
    { command: 'addcard', description: 'Додати банківську картку' },
    { command: 'deletecard', description: 'Видалити банківську картку' },
    { command: 'start', description: 'Зареєструватись' },
    { command: 'users', description: 'Список користувачів' },
    { command: 'version', description: 'Версія' },
  ])

  process.on('unhandledRejection', (error) => {
    logger.error(error)
  })

  const userSessionManager = new UserSessionManager()
  const withPhase = withPhaseFactory(userSessionManager)
  const withUser = withUserFactory(usersStorage)

  bot.use(withUserId())
  bot.use(withLocalization())

  bot.use(async (context) => {
    const userId = context.state.userId
    const { first_name: name, username } = context.from

    const user = new User({
      id: userId,
      name,
      username: username || null,
      isComplete: false,
    })
    
    try {
      await usersStorage.create(user)
    } catch (error) {
      if (error.code !== 'ALREADY_EXISTS') {
        throw error
      }
    }
  })

  bot.use(withUser()) // TODO: cache to avoid too many requests against database

  bot.command('version', versionCommand())
  bot.command('start', withPrivateChat(), startCommand({ usersStorage }))

  bot.command('users', withPrivateChat(), usersCommand({ usersStorage }))
  bot.command('debts', debtsCommand({ receiptsStorage, usersStorage, debtManager }))
  bot.command('receipts', receiptsGetCommand())
  bot.command('payments', paymentsGetCommand())

  bot.command('addcard', cardsAddCommand({ userSessionManager }))
  bot.action(/cards:add:bank:(.+)/, withPhase(Phases.addCard.bank, cardsAddBankAction({ userSessionManager })))

  bot.command('deletecard', cardsDeleteCommand({ cardsStorage, userSessionManager }))
  bot.action(/cards:delete:id:(.+)/, withPhase(Phases.deleteCard.id, cardsDeleteIdAction({ cardsStorage, userSessionManager })))

  bot.command('cards', cardsGet({ usersStorage, userSessionManager }))
  bot.action(/cards:get:user-id:(.+)/, cardsGetUserIdAction({ cardsStorage, usersStorage, userSessionManager }))
  bot.action(/cards:get:id:(.+)/, cardsGetIdAction({ cardsStorage, userSessionManager }))

  bot.on('message',
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return;
      await next();
    },
    // Cards
    withPhase(Phases.addCard.number, cardsAddNumberMessage({ cardsStorage, userSessionManager }))
  )

  bot.catch((error) => logger.error(error))

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
    const receiptPhoto = await receiptsStorage.getReceiptPhoto(receiptId)

    if (receiptPhoto) {
      res.contentType(receiptPhoto.mime).send(receiptPhoto.binary).end()
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

  async function formatReceipt(receipt) {
    const debts = await debtsStorage.findByReceiptId(receipt.id)
    
    return {
      id: receipt.id,
      createdAt: receipt.createdAt,
      payerId: receipt.payerId,
      amount: receipt.amount,
      description: receipt.description,
      hasPhoto: receipt.hasPhoto,
      debts: debts.map(debt => ({
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

    const id = req.body.id ?? undefined
    const payerId = req.body.payer_id
    const binary = req.file?.buffer ?? null
    const mime = req.file?.mimetype ?? null
    const description = req.body.description ?? null
    const amount = Number(req.body.amount)
    const debts = Object.entries(JSON.parse(req.body.debts))
      .map(([debtorId, amount]) => ({
        debtorId,
        amount: (amount && Number.isInteger(Number(amount)))
          ? Number(amount)
          : null,
      }))

    const receipt = new Receipt({ id, payerId, amount, description })

    let receiptPhoto = binary && mime
      ? new ReceiptPhoto({ binary, mime })
      : null

    if (id && !receiptPhoto && req.body.leave_photo === 'true') {
      receiptPhoto = await receiptsStorage.getReceiptPhoto(id)
    }

    const storedReceipt = await receiptManager.store({ debts, receipt, receiptPhoto }, { editorId: req.user.id })
    
    res.json(await formatReceipt(storedReceipt))
  })

  app.get('/receipts', async (req, res) => {
    const receipts = await receiptsStorage.findByParticipantUserId(req.user.id)

    const formattedReceipts = []
    for (const receipt of receipts) {
      formattedReceipts.push(
        await formatReceipt(receipt)
      )
    }

    res.json(formattedReceipts)
  })

  app.get('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    const receipt = await receiptsStorage.findById(receiptId)

    if (!receipt) {
      return res.sendStatus(404)
    }

    res.json(await formatReceipt(receipt))
  })

  app.delete('/receipts/:receiptId', async (req, res) => {
    await receiptManager.delete(req.params.receiptId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  app.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body
    const payment = new Payment({ fromUserId, toUserId, amount })
    const storedPayment = await paymentManager.store(payment, { editorId: req.user.id })
    res.json(storedPayment)
  })

  app.delete('/payments/:paymentId', async (req, res) => {
    await paymentManager.delete(req.params.paymentId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  app.get('/payments', async (req, res) => {
    const fromUserId = req.query['from_user_id']
    const toUserId = req.query['to_user_id']

    const payments = fromUserId
      ? await paymentsStorage.findByFromUserId(fromUserId)
      : await paymentsStorage.findByToUserId(toUserId)

    res.json(payments)
  })

  app.get('/debts', async (req, res) => {
    const { ingoingDebts, outgoingDebts, incompleteReceiptIds } = await debtManager.aggregateByUserId(req.user.id)

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

  if (process.env.DISABLE_BOT !== 'true') {
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
  } else {
    console.log('Telegram bot is disabled by the environment variable')
  }
})()
