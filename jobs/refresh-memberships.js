import '../env.js'

import pg from 'pg'
import Redis from 'ioredis'

import { Telegraf } from 'telegraf'
import { MembershipPostgresStorage } from '../app/chats/MembershipPostgresStorage.js'
import { MembershipManager } from '../app/chats/MembershipManager.js'
import { MembershipCache } from '../app/chats/MembershipCache.js'
import { TelegramErrorLogger } from '../app/shared/TelegramErrorLogger.js'
import { createRedisCacheFactory } from '../app/utils/createRedisCacheFactory.js'
import { logger } from '../logger.js'

(async () => {
  const pgClient = new pg.Client(process.env.DATABASE_URL)
  await pgClient.connect()

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const bot = new Telegraf(telegramBotToken)

  const debugChatId = process.env.DEBUG_CHAT_ID
  const errorLogger = new TelegramErrorLogger({ telegram: bot.telegram, debugChatId })

  const redis = new Redis(process.env.REDIS_URL)
  const createRedisCache = createRedisCacheFactory(redis)

  const membershipStorage = new MembershipPostgresStorage(pgClient)
  const membershipManager = new MembershipManager({
    telegram: bot.telegram,
    membershipCache: new MembershipCache(createRedisCache('memberships', 60 * 60_000)),
    membershipStorage,
  })

  const memberships = await membershipStorage.findOldest({ limit: 10 })
  logger.info(`Found ${memberships.length} memberships to refresh`)

  for (const { userId, chatId } of memberships) {
    logger.info(`Refreshing membership of user ${userId} in chat: ${chatId}`)

    try {
      await membershipManager.refreshLink(userId, chatId)
    } catch (error) {
      errorLogger.log(error, 'Could not refresh membership link', { userId, chatId })
    }
  }
})().then(() => {
  logger.info('Done!')
  process.exit(0)
})
