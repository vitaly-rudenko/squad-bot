import './env.js'

import { Telegraf } from 'telegraf'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import pg from 'pg'
import express from 'express'
import { Redis } from 'ioredis'

import { versionCommand } from './app/shared/flows/version.js'

import { startCommand } from './app/users/flows/start.js'
import { debtsCommand } from './app/debts/flows/debts.js'
import { receiptsCommand } from './app/receipts/flows/receipts.js'
import { paymentsCommand } from './app/payments/flows/payments.js'
import { withUserId } from './app/users/middlewares/userId.js'
import { UsersPostgresStorage } from './app/users/UsersPostgresStorage.js'
import { withLocalization } from './app/localization/middlewares/localization.js'
import { requirePrivateChat } from './app/shared/middlewares/privateChat.js'
import { DebtsPostgresStorage } from './app/debts/DebtsPostgresStorage.js'
import { RollCallsPostgresStorage } from './app/rollcalls/RollCallsPostgresStorage.js'
import { localize } from './app/localization/localize.js'
import { ReceiptTelegramNotifier } from './app/receipts/notifications/ReceiptTelegramNotifier.js'
import { TelegramNotifier } from './app/shared/notifications/TelegramNotifier.js'
import { TelegramErrorLogger } from './app/shared/TelegramErrorLogger.js'
import { PaymentTelegramNotifier } from './app/payments/notifications/PaymentTelegramNotifier.js'
import { PaymentsPostgresStorage } from './app/payments/PaymentsPostgresStorage.js'
import { ReceiptsPostgresStorage } from './app/receipts/ReceiptsPostgresStorage.js'
import { ReceiptManager } from './app/receipts/ReceiptManager.js'
import { PaymentManager } from './app/payments/PaymentManager.js'
import { DebtManager } from './app/debts/DebtManager.js'
import { MembershipManager } from './app/memberships/MembershipManager.js'
import { MembershipCache } from './app/memberships/MembershipCache.js'
import { MembershipPostgresStorage } from './app/memberships/MembershipPostgresStorage.js'
import { registerUser } from './app/users/middlewares/registeredUser.js'
import { UserManager } from './app/users/UserManager.js'
import { MassTelegramNotificationFactory } from './app/shared/notifications/MassTelegramNotification.js'
import { withGroupChat } from './app/shared/middlewares/groupChat.js'
import { UserCache } from './app/users/UserCache.js'
import { withChatId } from './app/shared/middlewares/chatId.js'
import { fromTelegramUser } from './app/users/fromTelegramUser.js'
import { wrap } from './app/shared/middlewares/wrap.js'
import { useTestMode } from './env.js'
import { createRedisCacheFactory } from './app/utils/createRedisCacheFactory.js'
import { logger } from './logger.js'
import { rollCallsCommand, rollCallsMessage } from './app/rollcalls/flows/rollcalls.js'
import { Group } from './app/groups/Group.js'
import { GroupManager } from './app/groups/GroupManager.js'
import { GroupsPostgresStorage } from './app/groups/GroupPostgresStorage.js'
import { titlesCommand } from './app/titles/flows/titles.js'
import { withUserSession } from './app/users/middlewares/userSession.js'
import { createUserSessionFactory } from './app/users/createUserSessionFactory.js'
import { RefreshMembershipsUseCase } from './app/memberships/RefreshMembershipsUseCase.js'
import { createWebAppUrlGenerator } from './app/utils/createWebAppUrlGenerator.js'
import { generateTemporaryAuthToken } from './app/auth/generateTemporaryAuthToken.js'
import { createRouter } from './app/routes/index.js'
import { CardsPostgresStorage } from './app/features/cards/storage.js'
import { createCardsFlow } from './app/features/cards/telegram.js'

async function start() {
  if (useTestMode) {
    logger.warn('Test mode is enabled')
  }

  const redis = new Redis(process.env.REDIS_URL || '')
  const createRedisCache = createRedisCacheFactory(redis)

  const pgClient = new pg.Client(process.env.DATABASE_URL)
  await pgClient.connect()

  if (process.env.LOG_DATABASE_QUERIES === 'true') {
    const query = pgClient.query.bind(pgClient)
    // @ts-ignore
    pgClient.query = (...args) => {
      logger.debug({ args }, 'Database query')
    // @ts-ignore
      return query(argvum)
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
    { command: 'debts', description: 'Борги' },
    { command: 'receipts', description: 'Чеки' },
    { command: 'payments', description: 'Платежі' },
    { command: 'cards', description: 'Банківські картки' },
    { command: 'titles', description: 'Підписи в чаті' },
    { command: 'rollcalls', description: 'Переклички' },
    { command: 'start', description: 'Оновити дані' },
  ])

  process.on('unhandledRejection', (error) => {
    errorLogger.log(error)
  })

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

  const { cards } = createCardsFlow({ generateWebAppUrl })
  bot.command('cards', cards)

  bot.command('debts', debtsCommand({ usersStorage, debtManager }))
  bot.command('receipts', receiptsCommand({ generateWebAppUrl }))
  bot.command('payments', paymentsCommand({ generateWebAppUrl }))
  bot.command('rollcalls', rollCallsCommand({ generateWebAppUrl }))
  bot.command('titles', titlesCommand({ generateWebAppUrl }))

  bot.on('message',
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return
      return next()
    },
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
  app.use(createRouter({
    telegram: bot.telegram,
    botInfo,
    cardsStorage,
    createRedisCache,
    debtManager,
    debtsStorage,
    groupManager,
    groupStorage,
    membershipManager,
    membershipStorage,
    paymentManager,
    paymentsStorage,
    receiptManager,
    receiptsStorage,
    rollCallsStorage,
    telegramBotToken,
    tokenSecret,
    usersStorage,
    useTestMode,
  }))

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
