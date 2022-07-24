import '../env.js'

import pg from 'pg'
import Redis from 'ioredis'

import { Telegraf } from 'telegraf'
import { MembershipPostgresStorage } from '../app/memberships/MembershipPostgresStorage.js'
import { MembershipManager } from '../app/memberships/MembershipManager.js'
import { MembershipCache } from '../app/memberships/MembershipCache.js'
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

  for (const { userId, groupId } of memberships) {
    logger.info(`Refreshing membership of user ${userId} in chat: ${groupId}`)

    try {
      await membershipManager.refreshLink(userId, groupId)
    } catch (error) {
      errorLogger.log(error, 'Could not refresh membership link', { userId, groupId })
    }
  }
})().then(() => {
  logger.info('Done!')
  process.exit(0)
})
