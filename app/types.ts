import type { RedisCache } from './utils/RedisCache.js'

export interface Dependencies {
  botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>
  cardsStorage: import('./features/cards/storage.js').CardsPostgresStorage
  createRedisCache: ReturnType<typeof import('./utils/createRedisCacheFactory.js').createRedisCacheFactory>
  debtsStorage: import('./features/debts/storage.js').DebtsPostgresStorage
  generateTemporaryAuthToken: import('./features/auth/types.js').GenerateTemporaryAuthToken
  generateWebAppUrl: import('./utils/types').GenerateWebAppUrl
  groupStorage: import('./features/groups/storage.js').GroupsPostgresStorage
  localize: typeof import('./features/localization/localize.js').localize
  membershipCache: RedisCache
  membershipStorage: import('./features/memberships/storage.js').MembershipPostgresStorage
  paymentsStorage: import('./features/payments/storage.js').PaymentsPostgresStorage
  receiptsStorage: import('./features/receipts/storage.js').ReceiptsPostgresStorage
  rollCallsStorage: import('./features/roll-calls/storage.js').RollCallsPostgresStorage
  telegram: import('telegraf').Telegram
  telegramBotToken: string
  tokenSecret: string
  usersStorage: import('./features/users/storage.js').UsersPostgresStorage
  useTestMode: boolean
  version: string
  webAppName: string
  webAppUrl: string
}
