import './env.js'

import { Telegraf } from 'telegraf'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import pg from 'pg'
import express from 'express'
import { Redis } from 'ioredis'

import { RollCallsPostgresStorage } from './roll-calls/storage.js'
import { logger } from './common/logger.js'
import { createApiRouter } from './api.js'
import { CardsPostgresStorage } from './cards/storage.js'
import { createCardsFlow } from './cards/telegram.js'
import { createRollCallsFlow } from './roll-calls/telegram.js'
import { createTemporaryAuthTokenGenerator } from './auth/utils.js'
import { createAuthFlow } from './auth/telegram.js'
import { createCommonFlow, createWebAppUrlGenerator, requirePrivateChat, withChatId, withGroupChat, wrap } from './common/telegram.js'
import { getAppVersion } from './common/utils.js'
import { createAdminsFlow } from './admins/telegram.js'
import { DebtsPostgresStorage } from './debts/storage.js'
import { createDebtsFlow } from './debts/telegram.js'
import { PaymentsPostgresStorage } from './payments/storage.js'
import { createPaymentsFlow } from './payments/telegram.js'
import { ApiError } from './common/errors.js'
import { GroupsPostgresStorage } from './groups/storage.js'
import { UsersPostgresStorage } from './users/storage.js'
import { registerTelegramUser, useUsersFlow, withUserId } from './users/telegram.js'
import { runRefreshMembershipsTask, unlink } from './memberships/tasks.js'
import { MembershipPostgresStorage } from './memberships/storage.js'
import { registry } from './registry.js'
import { withLocale } from './localization/telegram.js'
import { localize } from './localization/localize.js'
import { ReceiptsPostgresStorage } from './receipts/storage.js'
import { createReceiptsFlow } from './receipts/telegram.js'
import { createRedisCache } from './common/cache.js'
import { createGroupsFlow } from './groups/telegram.js'
import { env } from './env.js'

async function start() {
  if (env.USE_TEST_MODE) {
    logger.warn({}, 'Test mode is enabled')
  }

  registry.value('redis', new Redis(env.REDIS_URL))

  const pgClient = new pg.Client(env.DATABASE_URL)
  await pgClient.connect()

  if (env.LOG_DATABASE_QUERIES) {
    const query = pgClient.query.bind(pgClient)

    /** @param {any[]} args */
    pgClient.query = (...args) => {
      logger.debug({ args }, 'Database query')
      // @ts-ignore
      return query(...args)
    }
  }

  const usersStorage = new UsersPostgresStorage(pgClient)

  const telegramBotToken = env.TELEGRAM_BOT_TOKEN
  const tokenSecret = env.TOKEN_SECRET
  if (!telegramBotToken || !tokenSecret) {
    throw new Error('Telegram bot token is not defined')
  }

  const bot = new Telegraf(telegramBotToken)

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))

  registry.values({
    webAppName: env.WEB_APP_NAME,
    webAppUrl: env.WEB_APP_URL,
    debugChatId: env.DEBUG_CHAT_ID,
    botInfo: await bot.telegram.getMe(),
    cardsStorage: new CardsPostgresStorage(pgClient),
    debtsStorage: new DebtsPostgresStorage(pgClient),
    localize,
    paymentsStorage: new PaymentsPostgresStorage(pgClient),
    receiptsStorage: new ReceiptsPostgresStorage(pgClient),
    rollCallsStorage: new RollCallsPostgresStorage(pgClient),
    telegram: bot.telegram,
    usersStorage,
    version: getAppVersion(),
  })

  registry.create('generateWebAppUrl', (deps) => createWebAppUrlGenerator(deps))

  const membershipStorage = new MembershipPostgresStorage(pgClient)
  const groupStorage = new GroupsPostgresStorage(pgClient)

  registry.values({
    membershipStorage,
    groupStorage,
    membershipCache: createRedisCache('memberships', env.USE_TEST_MODE ? 60_000 : 60 * 60_000),
    groupCache: createRedisCache('groups', env.USE_TEST_MODE ? 60_000 : 60 * 60_000),
    usersCache: createRedisCache('users', env.USE_TEST_MODE ? 60_000 : 60 * 60_000),
    generateTemporaryAuthToken: createTemporaryAuthTokenGenerator({
      tokenSecret,
      expiresInMs: env.USE_TEST_MODE ? 60_000 : 5 * 60_000,
    }),
  })

  bot.telegram.setMyCommands([
    { command: 'debts', description: 'Debts' },
    { command: 'receipts', description: 'Receipts' },
    { command: 'payments', description: 'Payments' },
    { command: 'cards', description: 'Bank cards' },
    { command: 'titles', description: 'Admin titles' },
    { command: 'rollcalls', description: 'Roll calls' },
    { command: 'start', description: 'Update user info' },
  ])

  process.on('unhandledRejection', (err) => {
    logger.error({ err }, 'Unhandled rejection')
  })

  bot.use((context, next) => {
    if (!env.USE_TEST_MODE && context.from?.is_bot) return
    return next()
  })

  bot.use(withUserId())
  bot.use(withChatId())
  bot.use(withLocale())

  // TODO: deprecated?
  bot.on('new_chat_members', async (context) => {
    const { chatId } = context.state

    for (const chatMember of context.message.new_chat_members) {
      if (!env.USE_TEST_MODE && chatMember.is_bot) continue

      const userId = String(chatMember.id)
      try {
        await registerTelegramUser(chatMember, { usersStorage })
        await membershipStorage.store(userId, chatId)
      } catch (err) {
        logger.error({ err, chatMember }, 'Could not register new chat member')
      }
    }
  })

  // TODO: deprecated?
  bot.on('left_chat_member', async (context) => {
    const user = context.message.left_chat_member
    if (!env.USE_TEST_MODE && user.is_bot) return

    const { chatId } = context.state
    const userId = String(user.id)

    try {
      await unlink(userId, chatId)
    } catch (err) {
      logger.warn({ err }, 'Could not unlink left chat member')
    }
  })

  const { start, useRegisterUser } = useUsersFlow()
  bot.command('start', requirePrivateChat(), start)

  bot.use(useRegisterUser)

  const { useRegisterGroupAndMembership } = createGroupsFlow()
  bot.use(useRegisterGroupAndMembership)

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

  const { receipts } = createReceiptsFlow()
  bot.command('receipts', receipts)

  bot.on('message',
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return
      return next()
    },
    // roll calls
    wrap(withGroupChat(), rollCallMessage),
  )

  const app = express()
  app.use(express.json())
  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(createApiRouter())

  // @ts-ignore
  app.use((err, req, res, next) => {
    if (!(err instanceof ApiError)) {
      logger.error({ err, req }, 'Unhandled API error')
    }

    if (res.headersSent) return
    if (err instanceof ApiError) {
      res.status(err.status).json({
        error: {
          code: err.code,
          ...err.message ? { message: err.message } : undefined,
          ...err.context ? { context: err.context } : undefined,
        }
      })
    } else {
      res.sendStatus(500)
    }
  })

  if (env.ENABLE_TEST_HTTPS) {
    logger.warn({}, 'Starting server in test HTTPS mode')
    // https://stackoverflow.com/a/69743888
    const key = fs.readFileSync('./.cert/key.pem', 'utf-8')
    const cert = fs.readFileSync('./.cert/cert.pem', 'utf-8')
    await new Promise(resolve => {
      https.createServer({ key, cert }, app).listen(env.PORT, () => resolve(undefined))
    })
  } else {
    logger.info({}, 'Starting server')
    await new Promise(resolve => app.listen(env.PORT, () => resolve(undefined)))
  }

  logger.info({}, 'Starting telegram bot')
  bot.launch().catch((err) => {
    logger.fatal({ err }, 'Could not launch telegram bot')
    process.exit(1)
  })

  if (env.DISABLE_MEMBERSHIP_REFRESH_TASK) return

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
    logger.fatal({ err }, 'Unexpected starting error')
    process.exit(1)
  })
