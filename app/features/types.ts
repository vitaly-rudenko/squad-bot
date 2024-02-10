export interface Dependencies {
  redis: import('ioredis').Redis
  botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>
  cardsStorage: import('./cards/storage.js').CardsPostgresStorage
  debtsStorage: import('./debts/storage.js').DebtsPostgresStorage
  generateTemporaryAuthToken: import('./auth/types.js').GenerateTemporaryAuthToken
  groupStorage: import('./groups/storage.js').GroupsPostgresStorage
  localize: typeof import('./localization/localize.js').localize
  membershipCache: import('./common/cache.js').RedisCache
  membershipStorage: import('./memberships/storage.js').MembershipPostgresStorage
  paymentsStorage: import('./payments/storage.js').PaymentsPostgresStorage
  receiptsStorage: import('./receipts/storage.js').ReceiptsPostgresStorage
  rollCallsStorage: import('./roll-calls/storage.js').RollCallsPostgresStorage
  generateWebAppUrl: ReturnType<typeof import('./common/telegram.js').createWebAppUrlGenerator>
  telegram: import('telegraf').Telegram
  telegramBotToken: string
  tokenSecret: string
  usersStorage: import('./users/storage.js').UsersPostgresStorage
  useTestMode: boolean
  version: string
  webAppName: string
  webAppUrl: string
}
