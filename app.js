import './env.js'

import { Telegraf } from 'telegraf'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import crypto from 'crypto'
import pg from 'pg'
import express from 'express'
import ejs from 'ejs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import Redis from 'ioredis'

import { versionCommand } from './app/shared/flows/version.js'

import { startCommand } from './app/users/flows/start.js'
import { usersCommand } from './app/users/flows/users.js'
import { debtsCommand } from './app/debts/flows/debts.js'
import { receiptsGetCommand } from './app/receipts/flows/receipts.js'
import { withPhaseFactory } from './app/shared/middlewares/phase.js'
import { Phases } from './app/Phases.js'
import { cardsAddCommand, cardsAddNumberMessage, cardsAddBankAction, cardsDeleteCommand, cardsDeleteIdAction, cardsCommand, cardsGetIdAction, cardsGetUserIdAction } from './app/cards/flows/cards.js'
import { paymentsGetCommand } from './app/payments/flows/payments.js'
import { withUserId } from './app/users/middlewares/userId.js'
import { User } from './app/users/User.js'
import { UsersPostgresStorage } from './app/users/UsersPostgresStorage.js'
import { withLocalization } from './app/localization/middlewares/localization.js'
import { requirePrivateChat } from './app/shared/middlewares/privateChat.js'
import { CardsPostgresStorage } from './app/cards/CardsPostgresStorage.js'
import { DebtsPostgresStorage } from './app/debts/DebtsPostgresStorage.js'
import { RollCallsPostgresStorage } from './app/rollcalls/RollCallsPostgresStorage.js'
import { localize } from './app/localization/localize.js'
import { ReceiptTelegramNotifier } from './app/receipts/notifications/ReceiptTelegramNotifier.js'
import { TelegramNotifier } from './app/shared/notifications/TelegramNotifier.js'
import { TelegramErrorLogger } from './app/shared/TelegramErrorLogger.js'
import { PaymentTelegramNotifier } from './app/payments/notifications/PaymentTelegramNotifier.js'
import { PaymentsPostgresStorage } from './app/payments/PaymentsPostgresStorage.js'
import { Payment } from './app/payments/Payment.js'
import { ReceiptsPostgresStorage } from './app/receipts/ReceiptsPostgresStorage.js'
import { Receipt } from './app/receipts/Receipt.js'
import { ReceiptPhoto } from './app/receipts/ReceiptPhoto.js'
import { ReceiptManager } from './app/receipts/ReceiptManager.js'
import { PaymentManager } from './app/payments/PaymentManager.js'
import { DebtManager } from './app/debts/DebtManager.js'
import { MembershipManager } from './app/memberships/MembershipManager.js'
import { MembershipCache } from './app/memberships/MembershipCache.js'
import { MembershipPostgresStorage } from './app/memberships/MembershipPostgresStorage.js'
import { registerUser } from './app/users/middlewares/registeredUser.js'
import { UserManager } from './app/users/UserManager.js'
import { MassTelegramNotificationFactory } from './app/shared/notifications/MassTelegramNotification.js'
import { requireGroupChat, withGroupChat } from './app/shared/middlewares/groupChat.js'
import { UserCache } from './app/users/UserCache.js'
import { withChatId } from './app/shared/middlewares/chatId.js'
import { fromTelegramUser } from './app/users/fromTelegramUser.js'
import { wrap } from './app/shared/middlewares/wrap.js'
import { useTestMode } from './env.js'
import { createRedisCacheFactory } from './app/utils/createRedisCacheFactory.js'
import { logger } from './logger.js'
import { RollCall } from './app/rollcalls/RollCall.js'
import { rollCallsAddAction, rollCallsAddExcludeSenderAction, rollCallsAddMessagePatternMessage, rollCallsAddPollOptionsMessage, rollCallsAddPollOptionsSkipAction, rollCallsAddUsersPatternAllAction, rollCallsAddUsersPatternMessage, rollCallsCommand, rollCallsDeleteAction, rollCallsDeleteCancelAction, rollCallsDeleteIdAction, rollCallsMessage } from './app/rollcalls/flows/rollcalls.js'
import { Group } from './app/groups/Group.js'
import { GroupManager } from './app/groups/GroupManager.js'
import { GroupsPostgresStorage } from './app/groups/GroupPostgresStorage.js'
import { AlreadyExistsError } from './app/errors/AlreadyExistsError.js'
import { titleSetCancelAction, titleSetCommand, titleSetMessage, titleSetUserIdAction } from './app/titles/flows/title.js'
import { withUserSession } from './app/users/middlewares/userSession.js'
import { createUserSessionFactory } from './app/users/createUserSessionFactory.js'
import { RefreshMembershipsUseCase } from './app/memberships/RefreshMembershipsUseCase.js'
import { compressImage } from './app/utils/compressImage.js'

async function start() {
  if (useTestMode) {
    logger.warn('Test mode is enabled')
  }

  const upload = multer()

  const redis = new Redis(process.env.REDIS_URL)
  const createRedisCache = createRedisCacheFactory(redis)

  const pgClient = new pg.Client(process.env.DATABASE_URL)
  await pgClient.connect()

  if (process.env.LOG_DATABASE_QUERIES === 'true') {
    const query = pgClient.query.bind(pgClient)
    pgClient.query = (...args) => {
      logger.debug({ args }, 'Database query')
      return query(...args)
    }
  }

  const usersStorage = new UsersPostgresStorage(pgClient)
  const cardsStorage = new CardsPostgresStorage(pgClient)
  const debtsStorage = new DebtsPostgresStorage(pgClient)
  const paymentsStorage = new PaymentsPostgresStorage(pgClient)
  const receiptsStorage = new ReceiptsPostgresStorage(pgClient)
  const rollCallsStorage = new RollCallsPostgresStorage(pgClient)

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const tokenSecret = process.env.TOKEN_SECRET
  if (!telegramBotToken || !tokenSecret) {
    throw new Error('Telegram bot token is not defined')
  }

  const debugChatId = process.env.DEBUG_CHAT_ID
  const bot = new Telegraf(telegramBotToken)

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))

  const errorLogger = new TelegramErrorLogger({ telegram: bot.telegram, debugChatId })
  const telegramNotifier = new TelegramNotifier({ telegram: bot.telegram })

  const massTelegramNotificationFactory = new MassTelegramNotificationFactory({
    telegramNotifier,
    errorLogger,
  })

  const paymentNotifier = new PaymentTelegramNotifier({
    localize,
    massTelegramNotificationFactory,
    usersStorage,
  })

  const receiptNotifier = new ReceiptTelegramNotifier({
    localize,
    massTelegramNotificationFactory,
    usersStorage,
    debtsStorage,
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

  const membershipStorage = new MembershipPostgresStorage(pgClient)
  const membershipManager = new MembershipManager({
    membershipCache: new MembershipCache(createRedisCache('memberships', useTestMode ? 60_000 : 60 * 60_000)),
    membershipStorage,
    telegram: bot.telegram,
  })

  const groupStorage = new GroupsPostgresStorage(pgClient)
  const groupManager = new GroupManager(
    groupStorage,
    createRedisCache('groups', useTestMode ? 60_000 : 60 * 60_000)
  )

  const userManager = new UserManager({
    usersStorage,
    userCache: new UserCache(createRedisCache('users', useTestMode ? 60_000 : 60 * 60_000)),
  })

  bot.telegram.setMyCommands([
    { command: 'debts', description: 'Підрахувати борги' },
    { command: 'receipts', description: 'Додати або переглянути чеки' },
    { command: 'payments', description: 'Додати або переглянути платежі' },
    { command: 'cards', description: 'Переглянути банківські картки користувача' },
    { command: 'addcard', description: 'Додати банківську картку' },
    { command: 'deletecard', description: 'Видалити банківську картку' },
    { command: 'title', description: 'Швидко встановити підпис' },
    { command: 'rollcalls', description: 'Керування перекличками' },
    { command: 'start', description: 'Зареєструватись' },
  ])

  process.on('unhandledRejection', (error) => {
    errorLogger.log(error)
  })

  const withPhase = withPhaseFactory()

  bot.use((context, next) => {
    if (!useTestMode && context.from.is_bot) return
    return next()
  })

  bot.command('version', versionCommand())

  bot.use(withUserId())
  bot.use(withChatId())
  bot.use(withLocalization({ userManager }))
  bot.use(withUserSession({
    createUserSession: createUserSessionFactory({
      contextsCache: createRedisCache('contexts', 5 * 60_000),
      phasesCache: createRedisCache('phases', 5 * 60_000),
    })
  }))

  bot.on('new_chat_members', async (context) => {
    const { chatId } = context.state

    for (const chatMember of context.message.new_chat_members) {
      if (!useTestMode && chatMember.is_bot) continue

      const user = fromTelegramUser(chatMember)

      try {
        await userManager.softRegister(user)
        await membershipManager.hardLink(user.id, chatId)
      } catch (error) {
        errorLogger.log(error, 'Could not register new chat member', { user })
      }
    }
  })

  bot.on('left_chat_member', async (context) => {
    const user = context.message.left_chat_member
    if (!useTestMode && user.is_bot) return

    const { chatId } = context.state
    const userId = String(user.id)

    await membershipManager.unlink(userId, chatId)
  })

  bot.command('start', requirePrivateChat(), startCommand({ userManager }))

  bot.use(registerUser({ userManager }))
  bot.use(wrap(withGroupChat(), async (context, next) => {
    const { userId, chatId } = context.state

    await groupManager.store(new Group({ id: chatId, title: context.chat?.title || null }))
    await membershipManager.softLink(userId, chatId)

    return next()
  }))

  bot.command('users', usersCommand({ usersStorage, membershipStorage }))
  bot.command('debts', debtsCommand({ receiptsStorage, usersStorage, debtsStorage, debtManager }))
  bot.command('receipts', receiptsGetCommand({ usersStorage }))
  bot.command('payments', paymentsGetCommand({ usersStorage }))

  bot.command('addcard', cardsAddCommand())
  bot.action(/^cards:add:bank:(.+)$/, cardsAddBankAction())

  bot.command('deletecard', cardsDeleteCommand({ cardsStorage }))
  bot.action(/^cards:delete:id:(.+)$/, withPhase(Phases.deleteCard.id), cardsDeleteIdAction({ cardsStorage }))

  bot.command('cards', cardsCommand({ usersStorage, cardsStorage }))
  bot.action(/^cards:get:user-id:(.+)$/, cardsGetUserIdAction({ cardsStorage, usersStorage }))
  bot.action(/^cards:get:id:(.+)$/, cardsGetIdAction({ cardsStorage }))

  bot.command('rollcalls', requireGroupChat(), rollCallsCommand({ rollCallsStorage, usersStorage }))
  bot.action(/^rollcalls:delete$/, withPhase(Phases.rollCalls), rollCallsDeleteAction({ rollCallsStorage }))
  bot.action(/^rollcalls:delete:cancel$/, withPhase(Phases.deleteRollCall.id), rollCallsDeleteCancelAction())
  bot.action(/^rollcalls:delete:id:(.+)$/, withPhase(Phases.deleteRollCall.id), rollCallsDeleteIdAction({ rollCallsStorage }))
  bot.action(/^rollcalls:add$/, withPhase(Phases.rollCalls), rollCallsAddAction())
  bot.action(/^rollcalls:add:users-pattern:all$/, withPhase(Phases.addRollCall.usersPattern), rollCallsAddUsersPatternAllAction())
  bot.action(/^rollcalls:add:exclude-sender:(.+)$/, withPhase(Phases.addRollCall.excludeSender), rollCallsAddExcludeSenderAction())
  bot.action(/^rollcalls:add:poll-options:skip$/, withPhase(Phases.addRollCall.pollOptions), rollCallsAddPollOptionsSkipAction({ rollCallsStorage }))

  bot.command('title', requireGroupChat(), titleSetCommand({ bot, membershipStorage, usersStorage }))
  bot.action(/^title:set:user-id:(.+)$/, withPhase(Phases.title.set.chooseUser), titleSetUserIdAction({ usersStorage }))
  bot.action(/^title:set:cancel$/, withPhase(Phases.title.set.chooseUser, Phases.title.set.sendTitle), titleSetCancelAction())

  bot.on('message',
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return
      return next()
    },
    // cards
    wrap(withPhase(Phases.addCard.number), cardsAddNumberMessage({ cardsStorage })),
    // roll calls
    wrap(withGroupChat(), withPhase(Phases.addRollCall.messagePattern), rollCallsAddMessagePatternMessage()),
    wrap(withGroupChat(), withPhase(Phases.addRollCall.usersPattern), rollCallsAddUsersPatternMessage({ membershipStorage, usersStorage })),
    wrap(withGroupChat(), withPhase(Phases.addRollCall.pollOptions), rollCallsAddPollOptionsMessage({ rollCallsStorage })),
    wrap(withGroupChat(), withPhase(Phases.title.set.sendTitle), titleSetMessage({ bot, membershipStorage, usersStorage })),
    wrap(withGroupChat(), rollCallsMessage({ membershipStorage, rollCallsStorage, usersStorage })),
  )

  bot.catch((error) => errorLogger.log(error))

  const corsOrigin = process.env.CORS_ORIGIN?.split(',')
  if (!corsOrigin || corsOrigin?.length === 0) {
    throw new Error('CORS origin is not set up properly')
  }

  const app = express()
  app.use(express.json())
  app.use(cors({ origin: corsOrigin }))
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

  // --- API

  const temporaryAuthTokenCache = createRedisCache('tokens', useTestMode ? 60_000 : 5 * 60_000)

  app.get('/authenticate', async (req, res, next) => {
    const temporaryAuthToken = req.query['token']
    if (!(await temporaryAuthTokenCache.set(temporaryAuthToken))) {
      res.status(400).json({ error: { code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE' } })
      return
    }

    let userId
    try {
      ({ userId } = jwt.verify(temporaryAuthToken, tokenSecret))
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
    }, tokenSecret))
  })

  // https://stackoverflow.com/a/72985407
  function checkWebAppSignature(botToken, initData) {
    const query = new URLSearchParams(initData)
    const hash = query.get('hash')
    if (!hash) return false
    query.delete('hash')

    const sorted = [...query.entries()].sort(([key1], [key2]) => key1.localeCompare(key2))
    const dataCheckString = sorted.map(([key, value]) => `${key}=${value}`).join('\n')

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest('hex')
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    return computedHash === hash
  }

  // https://gist.github.com/konstantin24121/49da5d8023532d66cc4db1136435a885?permalink_comment_id=4574538#gistcomment-4574538
  function checkWebAppSignature(botToken, initData) {
    const urlParams = new URLSearchParams(initData)

    const hash = urlParams.get('hash')
    urlParams.delete('hash')
    urlParams.sort()

    let dataCheckString = ''
    for (const [key, value] of urlParams.entries()) {
        dataCheckString += `${key}=${value}\n`
    }
    dataCheckString = dataCheckString.slice(0, -1)

    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken)
    const calculatedHash = crypto.createHmac('sha256', secret.digest()).update(dataCheckString).digest('hex')

    return calculatedHash === hash
}

  app.post('/authenticate-web-app', async (req, res, next) => {
    try {
      const { initData } = req.body

      if (typeof initData !== 'string') {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR' } })
        return
      }

      if (!checkWebAppSignature(telegramBotToken, initData)) {
        res.status(400).json({ error: { code: 'INVALID_SIGNATURE' } })
        return
      }

      const parsedInitData = new URLSearchParams(initData)
      const telegramUser = JSON.parse(parsedInitData.get('user') ?? '')
      const userId = String(telegramUser.id)

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
      }, tokenSecret))
    } catch (error) {
      console.warn(error)
      next(error)
    }
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

  if (useTestMode) {
    app.post('/memberships', async (req, res) => {
      const { userId, groupId, title } = req.body

      await membershipManager.hardLink(userId, groupId)
      await groupManager.store(
        new Group({
          id: groupId,
          title,
        })
      )

      res.json('ok')
    })
  }

  app.use((req, res, next) => {
    const token = req.headers['authorization']?.slice(7) // 'Bearer ' length

    if (token) {
      try {
        const { user } = jwt.verify(token, tokenSecret)
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

    let receiptPhoto = null
    if (binary && mime) {
      try {
        receiptPhoto = new ReceiptPhoto({
          binary: await compressImage(binary),
          mime: 'image/jpeg',
        })
      } catch (error) {
        console.warn('Could not compress receipt photo:', error)
        return res
          .status(400)
          .json({ error: { code: 'COULD_NOT_COMPRESS_PHOTO', message: error.message } })
      }
    }

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
    const payments = await paymentsStorage.findByParticipantUserId(req.user.id)
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

  app.post('/rollcalls', async (req, res, next) => {
    const groupId = req.body.groupId

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    const messagePattern = req.body.messagePattern
    const usersPattern = req.body.usersPattern
    const excludeSender = req.body.excludeSender
    const pollOptions = req.body.pollOptions
    const sortOrder = req.body.sortOrder

    try {
      const storedRollCall = await rollCallsStorage.create(
        new RollCall({
          groupId,
          excludeSender,
          messagePattern,
          usersPattern,
          pollOptions,
          sortOrder,
        })
      )

      res.json(storedRollCall)
    } catch (error) {
      if (error instanceof AlreadyExistsError) {
        res.sendStatus(409)
      } else {
        next(error)
      }
    }
  })

  app.patch('/rollcalls/:id', async (req, res, next) => {
    const rollCallId = req.params.id

    const rollCall = await rollCallsStorage.findById(rollCallId)
    if (!rollCall) {
      res.sendStatus(404)
      return
    }

    const groupId = rollCall.groupId

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    const messagePattern = req.body.messagePattern
    const usersPattern = req.body.usersPattern
    const excludeSender = req.body.excludeSender
    const pollOptions = req.body.pollOptions
    const sortOrder = req.body.sortOrder

    const updatedRollCall = await rollCallsStorage.update(
      rollCallId,
      {
        excludeSender,
        messagePattern,
        usersPattern,
        pollOptions,
        sortOrder,
      }
    )

    res.json(updatedRollCall)
  })

  app.get('/rollcalls', async (req, res) => {
    const rollCalls = await rollCallsStorage.findByGroupId(req.query['group_id'])
    res.json(rollCalls)
  })

  app.delete('/rollcalls/:rollCallId', async (req, res) => {
    const rollCall = await rollCallsStorage.findById(req.params.rollCallId)
    if (!rollCall) {
      res.sendStatus(404)
      return
    }

    if (!(await membershipManager.isHardLinked(req.user.id, rollCall.groupId))) {
      res.sendStatus(403)
      return
    }

    await rollCallsStorage.deleteById(req.params.rollCallId)
    res.sendStatus(204)
  })

  app.get('/groups', async (req, res) => {
    res.json(await groupStorage.findByMemberUserId(req.user.id))
  })

  const port = Number(process.env.PORT) || 3000

  if (process.env.USE_TEST_MODE === 'true') {
    // https://stackoverflow.com/a/69743888
    const key = fs.readFileSync('./.cert/key.pem', 'utf-8')
    const cert = fs.readFileSync('./.cert/cert.pem', 'utf-8')
    await new Promise(resolve => {
      https.createServer({ key, cert }, app).listen(port, () => resolve())
    })
  } else {
    await new Promise(resolve => {
      app.listen(port, () => resolve())
    })
  }

  bot.catch((error) => errorLogger.log(error))

  logger.info({}, 'Starting telegram bot')
  bot.launch().catch((error) => {
    logger.error(error, 'Could not launch telegram bot')
    process.exit(1)
  })

  const refreshMembershipsJobIntervalMs = 5 * 60_000
  const refreshMembershipsUseCase = new RefreshMembershipsUseCase({
    errorLogger,
    membershipManager,
    membershipStorage,
  })

  if (Number.isInteger(refreshMembershipsJobIntervalMs)) {
    async function runRefreshMembershipsJob() {
      try {
        await refreshMembershipsUseCase.run()
      } catch (error) {
        logger.error(error, 'Could not refresh memberships')
      } finally {
        logger.debug(
          { refreshMembershipsJobIntervalMs },
          'Scheduling next automatic memberships refresh job'
        )
        setTimeout(runRefreshMembershipsJob, refreshMembershipsJobIntervalMs)
      }
    }

    await runRefreshMembershipsJob()
  }
}

start()
  .then(() => logger.info({}, 'Started!'))
  .catch((error) => {
    logger.error(error, 'Unexpected starting error')
    process.exit(1)
  })
