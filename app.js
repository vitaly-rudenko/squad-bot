import './env.js'

import { Telegraf } from 'telegraf'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import crypto from 'crypto'
import pg from 'pg'
import express from 'express'
import Router from 'express-promise-router'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { Redis } from 'ioredis'

import { versionCommand } from './app/shared/flows/version.js'

import { startCommand } from './app/users/flows/start.js'
import { debtsCommand } from './app/debts/flows/debts.js'
import { receiptsCommand } from './app/receipts/flows/receipts.js'
import { withPhaseFactory } from './app/shared/middlewares/phase.js'
import { Phases } from './app/Phases.js'
import { cardsAddCommand, cardsAddNumberMessage, cardsAddBankAction, cardsDeleteCommand, cardsDeleteIdAction, cardsCommand, cardsGetIdAction, cardsGetUserIdAction } from './app/cards/flows/cards.js'
import { paymentsCommand } from './app/payments/flows/payments.js'
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
import { rollCallsCommand, rollCallsMessage } from './app/rollcalls/flows/rollcalls.js'
import { Group } from './app/groups/Group.js'
import { GroupManager } from './app/groups/GroupManager.js'
import { GroupsPostgresStorage } from './app/groups/GroupPostgresStorage.js'
import { AlreadyExistsError } from './app/errors/AlreadyExistsError.js'
import { titleCommand } from './app/titles/flows/title.js'
import { withUserSession } from './app/users/middlewares/userSession.js'
import { createUserSessionFactory } from './app/users/createUserSessionFactory.js'
import { RefreshMembershipsUseCase } from './app/memberships/RefreshMembershipsUseCase.js'
import { createWebAppUrlGenerator } from './app/utils/createWebAppUrlGenerator.js'
import { generateTemporaryAuthToken } from './app/auth/generateTemporaryAuthToken.js'
import { ApiError } from './app/ApiError.js'
import { saveReceiptSchema } from './app/schemas/receipts.js'

async function start() {
  if (useTestMode) {
    logger.warn('Test mode is enabled')
  }

  const upload = multer()

  const redis = new Redis(process.env.REDIS_URL || '')
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

  const botInfo = await bot.telegram.getMe()
  const generateWebAppUrl = createWebAppUrlGenerator({
    botUsername: botInfo.username,
    webAppName: process.env.WEB_APP_NAME,
  })

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
    generateWebAppUrl,
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
    if (!useTestMode && context.from?.is_bot) return
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

    await groupManager.store(
      new Group({
        id: chatId,
        title: (context.chat && 'title' in context.chat) ? context.chat.title : undefined,
      })
    )

    await membershipManager.softLink(userId, chatId)

    return next()
  }))

  bot.command('login', requirePrivateChat(), async (context) => {
    const { userId } = context.state
    await context.reply(`${process.env.WEB_APP_URL}/?token=${generateTemporaryAuthToken(userId)}`)
  })

  bot.command('debts', debtsCommand({ usersStorage, debtManager }))
  bot.command('receipts', receiptsCommand({ generateWebAppUrl }))
  bot.command('payments', paymentsCommand({ generateWebAppUrl }))
  bot.command('rollcalls', rollCallsCommand({ generateWebAppUrl }))

  bot.command('addcard', cardsAddCommand())
  bot.action(/^cards:add:bank:(.+)$/, cardsAddBankAction())

  bot.command('deletecard', cardsDeleteCommand({ cardsStorage }))
  bot.action(/^cards:delete:id:(.+)$/, withPhase(Phases.deleteCard.id), cardsDeleteIdAction({ cardsStorage }))

  bot.command('cards', cardsCommand({ usersStorage, cardsStorage }))
  bot.action(/^cards:get:user-id:(.+)$/, cardsGetUserIdAction({ cardsStorage, usersStorage }))
  bot.action(/^cards:get:id:(.+)$/, cardsGetIdAction({ cardsStorage }))

  bot.command('title', titleCommand({ generateWebAppUrl }))

  bot.on('message',
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return
      return next()
    },
    // cards
    wrap(withPhase(Phases.addCard.number), cardsAddNumberMessage({ cardsStorage })),
    // roll calls
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

  const router = Router()

  const temporaryAuthTokenCache = createRedisCache('tokens', useTestMode ? 60_000 : 5 * 60_000)

  router.get('/authenticate', async (req, res) => {
    const temporaryAuthToken = req.query['token']
    if (typeof temporaryAuthToken !== 'string' || !(await temporaryAuthTokenCache.set(temporaryAuthToken))) {
      res.status(400).json({ error: { code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE' } })
      return
    }

    let userId
    try {
      const parsed = jwt.verify(temporaryAuthToken, tokenSecret)
      if (typeof parsed === 'string' || !parsed.userId) {
        throw new Error('Temporary token does not contain user ID')
      }
      userId = parsed.userId
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

  router.post('/authenticate-web-app', async (req, res, next) => {
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

  router.get('/receipts/:receiptId/photo', async (req, res) => {
    const receiptId = req.params.receiptId
    const receiptPhoto = await receiptsStorage.getReceiptPhoto(receiptId)

    if (receiptPhoto) {
      res.contentType(receiptPhoto.mime).send(receiptPhoto.binary).end()
    } else {
      res.sendStatus(404)
    }
  })

  if (useTestMode) {
    router.post('/memberships', async (req, res) => {
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

  router.use((req, res, next) => {
    const token = req.headers['authorization']?.slice(7) // 'Bearer ' length

    if (token) {
      try {
        const parsed = jwt.verify(token, tokenSecret)
        if (typeof parsed === 'string' || !parsed.user || !parsed.user.id || !parsed.user.username || !parsed.user.name) {
          throw new Error('Token does not contain user ID, username and name')
        }
        req.user = parsed.user
        next()
      } catch (error) {
        res.status(401).json({ error: { code: 'INVALID_AUTH_TOKEN', message: error.message } })
      }
    } else {
      res.status(401).json({ error: { code: 'AUTH_TOKEN_NOT_PROVIDED' } })
    }
  })

  router.post('/users', async (req, res) => {
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

  router.get('/users', async (req, res) => {
    const groupId = req.query.group_id
    if (groupId) {
      const userIds = await membershipStorage.findUserIdsByGroupId(groupId)
      const users = await usersStorage.findByIds(userIds)
      res.json(users)
      return
    }

    const users = await usersStorage.findAll()
    res.json(users)
  })

  router.get('/bot', async (_, res) => {
    res.json({
      id: String(botInfo.id),
      name: botInfo.first_name,
      username: botInfo.username,
    })
  })

  /**
   * @param {import('./app/receipts/Receipt.js').Receipt} receipt
   * @param {import('./app/debts/Debt.js').Debt[]} debts
   */
  function formatReceipt(receipt, debts) {
    return {
      id: receipt.id,
      createdAt: receipt.createdAt,
      payerId: receipt.payerId,
      amount: receipt.amount,
      description: receipt.description,
      hasPhoto: receipt.hasPhoto,
      debts: debts
        .filter(debt => debt.receiptId === receipt.id)
        .map(debt => ({
          debtorId: debt.debtorId,
          amount: debt.amount,
        }))
    }
  }

  router.post('/receipts', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > 300_000) { // 300 kb
      res.sendStatus(413)
      return
    }

    const {
      id,
      payer_id: payerId,
      description,
      amount,
      debts,
      leave_photo: leavePhoto,
    } = saveReceiptSchema.create(req.body)

    const binary = req.file?.buffer
    const mime = req.file?.mimetype

    const receiptPhoto = (binary && mime)
      ? new ReceiptPhoto({ binary, mime })
      : leavePhoto ? undefined : 'delete'

    const receipt = new Receipt({
      id,
      payerId,
      amount,
      description,
      hasPhoto: receiptPhoto !== undefined && receiptPhoto !== 'delete'
    })

    const storedReceipt = await receiptManager.store({ debts, receipt, receiptPhoto }, { editorId: req.user.id })

    res.json(
      formatReceipt(
        storedReceipt,
        await debtsStorage.findByReceiptId(receipt.id)
      )
    )
  })

  router.get('/receipts', async (req, res) => {
    const receipts = await receiptsStorage.findByParticipantUserId(req.user.id)
    const debts = await debtsStorage.findByReceiptIds(receipts.map(r => r.id))

    res.json(receipts.map((receipt) => formatReceipt(receipt, debts)))
  })

  router.get('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    const receipt = await receiptsStorage.findById(receiptId)

    if (!receipt) {
      return res.sendStatus(404)
    }

    const debts = await debtsStorage.findByReceiptId(receiptId)

    res.json(formatReceipt(receipt, debts))
  })

  router.delete('/receipts/:receiptId', async (req, res) => {
    await receiptManager.delete(req.params.receiptId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  router.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body
    const payment = new Payment({ fromUserId, toUserId, amount })
    const storedPayment = await paymentManager.store(payment, { editorId: req.user.id })
    res.json(storedPayment)
  })

  router.delete('/payments/:paymentId', async (req, res) => {
    await paymentManager.delete(req.params.paymentId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  router.get('/payments', async (req, res) => {
    const payments = await paymentsStorage.findByParticipantUserId(req.user.id)
    res.json(payments)
  })

  router.get('/debts', async (req, res) => {
    const { ingoingDebts, outgoingDebts } = await debtManager.aggregateByUserId(req.user.id)

    res.json({
      ingoingDebts: ingoingDebts.map(debt => ({
        userId: debt.fromUserId,
        amount: debt.amount,
      })),
      outgoingDebts: outgoingDebts.map(debt => ({
        userId: debt.toUserId,
        amount: debt.amount,
      })),
    })
  })

  router.post('/rollcalls', async (req, res, next) => {
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

  router.patch('/rollcalls/:id', async (req, res) => {
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

  router.get('/rollcalls', async (req, res) => {
    const groupId = req.query['group_id']
    if (typeof groupId !== 'string') {
      res.sendStatus(400)
      return
    }

    const rollCalls = await rollCallsStorage.findByGroupId(groupId)
    res.json(rollCalls)
  })

  router.delete('/rollcalls/:rollCallId', async (req, res) => {
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

  router.get('/groups', async (req, res) => {
    res.json(await groupStorage.findByMemberUserId(req.user.id))
  })

  router.get('/admins', async (req, res) => {
    const groupId = req.query.group_id
    if (typeof groupId !== 'string') {
      res.sendStatus(400)
      return
    }

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    try {
      const admins = await bot.telegram.getChatAdministrators(Number(groupId))

      res.json(admins.map(admin => ({
        userId: String(admin.user.id),
        title: admin.custom_title || '',
        isCreator: admin.status === 'creator',
        isCurrentBot: admin.user.id === botInfo.id,
        editable: admin.status !== 'creator' && admin.can_be_edited,
      })))
    } catch (error) {
      if (error.message.includes('chat not found')) {
        res.status(502).json({ error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found. Does bot have access to the group?' } })
        return
      }

      logger.error({ error, groupId }, 'Could not get chat administrators')
      throw error
    }
  })

  async function setUserCustomTitle(groupId, userId, title) {
    try {
      await bot.telegram.setChatAdministratorCustomTitle(Number(groupId), Number(userId), title)
    } catch (error) {
      if (error.message.includes('ADMIN_RANK_EMOJI_NOT_ALLOWED')) {
        throw new ApiError({ code: 'INVALID_CUSTOM_TITLE', status: 502 })
      }

      if (error.message.includes('RIGHT_FORBIDDEN')) {
        throw new ApiError({ code: 'INSUFFICIENT_PERMISSIONS', status: 502 })
      }

      if (error.message.includes('method is available only for supergroups')) {
        throw new ApiError({ code: 'FOR_SUPERGROUPS_ONLY', status: 502 })
      }

      throw error
    }
  }

  // https://stackoverflow.com/questions/61022534/telegram-bot-with-add-new-admin-rights-cant-promote-new-admins-or-change-cust
  // "To change custom title, user has to be promoted by the bot itself."
  async function setUserCustomTitleAndPromote(groupId, userId, title) {
    try {
      await setUserCustomTitle(groupId, userId, title)
    } catch (error) {
      if (!error.message.includes('user is not an administrator')) {
        throw error
      }

      try {
        await bot.telegram.promoteChatMember(Number(groupId), Number(userId), {
          can_change_info: true,
          can_pin_messages: true,
        })
      } catch (error) {
        if (error.message.includes('not enough rights')) {
          throw new ApiError({ code: 'CANNOT_ADD_NEW_ADMINS', status: 502 })
        }

        throw error
      }

      await setUserCustomTitle(groupId, userId, title)
    }
  }

  router.patch('/admins', async (req, res) => {
    const { groupId, admins } = req.body
    if (
      typeof groupId !== 'string' ||
      !Array.isArray(admins) ||
      admins.some(admin =>
        typeof admin.userId !== 'string' ||
        typeof admin.title !== 'string'
      )
    ) {
      res.sendStatus(400)
      return
    }

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    const errorCodes = []
    for (const admin of admins) {
      try {
        await setUserCustomTitleAndPromote(groupId, admin.userId, admin.title)
      } catch (error) {
        if (error instanceof ApiError) {
          errorCodes.push({ userId: admin.userId, errorCode: error.code })
        } else {
          logger.error({ error, groupId, admin }, 'Could not update admin')
          throw error
        }
      }
    }

    if (errorCodes.length > 0) {
      res.status(400).json({ error: { code: 'COULD_NOT_UPDATE_ADMINS', context: { errorCodes } } })
    } else {
      res.sendStatus(200)
    }
  })

  app.use(router)

  const port = Number(process.env.PORT) || 3000

  if (process.env.ENABLE_TEST_HTTPS === 'true') {
    logger.warn('Starting in test HTTPs mode')
    // https://stackoverflow.com/a/69743888
    const key = fs.readFileSync('./.cert/key.pem', 'utf-8')
    const cert = fs.readFileSync('./.cert/cert.pem', 'utf-8')
    await new Promise(resolve => {
      https.createServer({ key, cert }, app).listen(port, () => resolve(undefined))
    })
  } else {
    await new Promise(resolve => app.listen(port, () => resolve(undefined)))
  }

  bot.catch((error) => errorLogger.log(error))

  logger.info({}, 'Starting telegram bot')
  bot.launch().catch((error) => {
    logger.error({ error }, 'Could not launch telegram bot')
    process.exit(1)
  })

  if (process.env.DISABLE_MEMBERSHIP_REFRESH_TASK === 'true') return

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
        logger.error({ error }, 'Could not refresh memberships')
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
    logger.error({ error }, 'Unexpected starting error')
    process.exit(1)
  })
