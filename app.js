import './env.js'

import { Telegraf } from 'telegraf'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import pg from 'pg'
import express from 'express'
import { Redis } from 'ioredis'

import { receiptsCommand } from './app/receipts/flows/receipts.js'
import { requirePrivateChat } from './app/shared/middlewares/privateChat.js'
import { RollCallsPostgresStorage } from './app/features/roll-calls/storage.js'
import { ReceiptTelegramNotifier } from './app/receipts/notifications/ReceiptTelegramNotifier.js'
import { TelegramNotifier } from './app/shared/notifications/TelegramNotifier.js'
import { TelegramErrorLogger } from './app/shared/TelegramErrorLogger.js'
import { ReceiptsPostgresStorage } from './app/receipts/ReceiptsPostgresStorage.js'
import { ReceiptManager } from './app/receipts/ReceiptManager.js'
import { MassTelegramNotificationFactory } from './app/shared/notifications/MassTelegramNotification.js'
import { withGroupChat } from './app/shared/middlewares/groupChat.js'
import { withChatId } from './app/shared/middlewares/chatId.js'
import { wrap } from './app/shared/middlewares/wrap.js'
import { useTestMode } from './env.js'
import { createRedisCacheFactory } from './app/utils/createRedisCacheFactory.js'
import { logger } from './logger.js'
import { createWebAppUrlGenerator } from './app/utils/createWebAppUrlGenerator.js'
import { createRouter } from './app/routes/index.js'
import { CardsPostgresStorage } from './app/features/cards/storage.js'
import { createCardsFlow } from './app/features/cards/telegram.js'
import { createRollCallsFlow } from './app/features/roll-calls/telegram.js'
import { string } from 'superstruct'
import { createTemporaryAuthTokenGenerator } from './app/features/auth/utils.js'
import { createAuthFlow } from './app/features/auth/telegram.js'
import { createCommonFlow } from './app/features/common/telegram.js'
import { getAppVersion } from './app/features/common/utils.js'
import { createAdminsFlow } from './app/features/admins/telegram.js'
import { DebtsPostgresStorage } from './app/features/debts/storage.js'
import { createDebtsFlow } from './app/features/debts/telegram.js'
import { PaymentsPostgresStorage } from './app/features/payments/storage.js'
import { createPaymentsFlow } from './app/features/payments/telegram.js'
import { ApiError } from './app/features/common/errors.js'
import { GroupsPostgresStorage } from './app/features/groups/storage.js'
import { UsersPostgresStorage } from './app/features/users/storage.js'
import { useUsersFlow, withUserId } from './app/features/users/telegram.js'
import { runRefreshMembershipsTask, unlink } from './app/features/memberships/use-cases.js'
import { MembershipPostgresStorage } from './app/features/memberships/storage.js'
import { registry } from './app/registry.js'
import { withLocale } from './app/features/localization/telegram.js'
import { localize } from './app/features/localization/localize.js'

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

    /** @param {any[]} args */
    pgClient.query = (...args) => {
      logger.debug({ args }, 'Database query')
      // @ts-ignore
      return query(...args)
    }
  }

  const usersStorage = new UsersPostgresStorage(pgClient)

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

  registry.values({
    botInfo: await bot.telegram.getMe(),
    cardsStorage: new CardsPostgresStorage(pgClient),
    createRedisCache,
    debtsStorage: new DebtsPostgresStorage(pgClient),
    errorLogger,
    localize,
    paymentsStorage: new PaymentsPostgresStorage(pgClient),
    receiptsStorage: new ReceiptsPostgresStorage(pgClient),
    rollCallsStorage: new RollCallsPostgresStorage(pgClient),
    telegram: bot.telegram,
    telegramBotToken,
    tokenSecret,
    usersStorage,
    useTestMode,
    version: getAppVersion(),
    webAppName: string().create(process.env.WEB_APP_NAME),
    webAppUrl: string().create(process.env.WEB_APP_URL),
  })

  registry.create('generateWebAppUrl', ({ botInfo, webAppName }) => createWebAppUrlGenerator({ botUsername: botInfo.username, webAppName }))
  registry.create('telegramNotifier', (deps) => new TelegramNotifier(deps))
  registry.create('massTelegramNotificationFactory', (deps) => new MassTelegramNotificationFactory(deps))
  registry.create('receiptNotifier', (deps) => new ReceiptTelegramNotifier(deps))
  registry.create('receiptManager', (deps) => new ReceiptManager(deps))

  const membershipStorage = new MembershipPostgresStorage(pgClient)
  const membershipCache = createRedisCache('memberships', useTestMode ? 60_000 : 60 * 60_000)

  const groupStorage = new GroupsPostgresStorage(pgClient)
  const groupCache = createRedisCache('groups', useTestMode ? 60_000 : 60 * 60_000)

  const usersCache = createRedisCache('users', useTestMode ? 60_000 : 60 * 60_000)

  registry.values({
    membershipStorage,
    groupStorage,
    generateTemporaryAuthToken: createTemporaryAuthTokenGenerator({ tokenSecret, useTestMode }),
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

  bot.use(withUserId())
  bot.use(withChatId())
  bot.use(withLocale())

  // TODO: deprecated?
  bot.on('new_chat_members', async (context) => {
    const { chatId } = context.state

    for (const chatMember of context.message.new_chat_members) {
      if (!useTestMode && chatMember.is_bot) continue

      const userId = String(chatMember.id)
      try {
        await usersStorage.store({
          id: userId,
          name: chatMember.first_name,
          ...chatMember.username && { username: chatMember.username },
          // TODO: get locale from `chatMember.language_code`
          locale: 'uk',
        })

        await membershipStorage.store(userId, chatId)
      } catch (err) {
        errorLogger.log(err, 'Could not register new chat member', { chatMember })
      }
    }
  })

  // TODO: deprecated?
  bot.on('left_chat_member', async (context) => {
    const user = context.message.left_chat_member
    if (!useTestMode && user.is_bot) return

    const { chatId } = context.state
    const userId = String(user.id)

    try {
      await unlink(userId, chatId)
    } catch (err) {
      logger.warn({ err }, 'Could not unlink left chat member')
    }
  })

  const { start } = useUsersFlow()
  bot.command('start', requirePrivateChat(), start)

  bot.use(async (context, next) => {
    if (!context.from) return

    const { userId } = context.state

    if (!(await usersCache.has(userId))) {
      await usersStorage.store({
        id: userId,
        name: context.from.first_name,
        ...context.from.username && { username: context.from.username },
        // TODO: get locale from `context.from.language_code`
        locale: 'uk',
      })

      await usersCache.set(userId)
    }

    return next()
  })

  // TODO: is this efficient?
  // TODO: also need to re-arrange commands to avoid this middleware to be executed unnecessarily
  bot.use(wrap(withGroupChat(), async (context, next) => {
    const { userId, chatId } = context.state

    if (!(await groupCache.has(chatId))) {
      await groupStorage.store({
        id: chatId,
        title: (context.chat && 'title' in context.chat)
          ? context.chat.title
          : '',
      })

      await groupCache.set(chatId)
    }

    if (!(await membershipCache.has(`${userId}_${chatId}`))) {
      await membershipStorage.store(userId, chatId)
      await membershipCache.set(`${userId}_${chatId}`)
    }

    return next()
  }))

  const { cards } = createCardsFlow()
  bot.command('cards', cards)

  const { rollCalls, rollCallMessage } = createRollCallsFlow()
  bot.command('rollcalls', rollCalls)

  const { login } = createAuthFlow()
  bot.command('login', requirePrivateChat(), login)

  const { version } = createCommonFlow()
  bot.command('version', requirePrivateChat(), version)

  const { titles } = createAdminsFlow()
  bot.command('titles', titles)

  const { debts } = createDebtsFlow()
  bot.command('debts', debts)

  const { payments } = createPaymentsFlow()
  bot.command('payments', payments)

  bot.command('receipts', receiptsCommand())

  bot.on('message',
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return
      return next()
    },
    // roll calls
    wrap(withGroupChat(), rollCallMessage),
  )

  bot.catch((error) => errorLogger.log(error))

  const corsOrigin = process.env.CORS_ORIGIN?.split(',')
  if (!corsOrigin || corsOrigin?.length === 0) {
    throw new Error('CORS origin is not set up properly')
  }

  const app = express()
  app.use(express.json())
  app.use(cors({ origin: corsOrigin }))
  app.use(createRouter())

  // @ts-ignore
  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err)
    }

    if (err instanceof ApiError) {
      res.status(err.status).json({
        error: {
          code: err.code,
          ...err.message && { message: err.message },
          ...err.context && { context: err.context },
        }
      })
    } else {
      next(err)
    }
  })

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
  bot.launch().catch((err) => {
    logger.error({ err }, 'Could not launch telegram bot')
    process.exit(1)
  })

  if (process.env.DISABLE_MEMBERSHIP_REFRESH_TASK === 'true') return

  const refreshMembershipsJobIntervalMs = 5 * 60_000

  if (Number.isInteger(refreshMembershipsJobIntervalMs)) {
    async function runRefreshMembershipsJob() {
      try {
        await runRefreshMembershipsTask()
      } catch (err) {
        logger.error({ err }, 'Could not refresh memberships')
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
  .catch((err) => {
    logger.error({ err }, 'Unexpected starting error')
    process.exit(1)
  })
