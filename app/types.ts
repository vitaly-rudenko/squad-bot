import type { RedisCache } from './utils/RedisCache.js'

export interface Dependencies {
  botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>
  cardsStorage: import('./features/cards/storage.js').CardsPostgresStorage
  createRedisCache: ReturnType<typeof import('./utils/createRedisCacheFactory.js').createRedisCacheFactory>
  debtsStorage: import('./features/debts/storage.js').DebtsPostgresStorage
  errorLogger: import('./shared/TelegramErrorLogger.js').TelegramErrorLogger
  generateTemporaryAuthToken: import('./features/auth/types.js').GenerateTemporaryAuthToken
  generateWebAppUrl: import('./utils/types').GenerateWebAppUrl
  groupStorage: import('./features/groups/storage.js').GroupsPostgresStorage
  localize: typeof import('./localization/localize.js').localize
  massTelegramNotificationFactory: import('./shared/notifications/MassTelegramNotification.js').MassTelegramNotificationFactory
  membershipCache: RedisCache
  membershipStorage: import('./features/memberships/storage.js').MembershipPostgresStorage
  paymentsStorage: import('./features/payments/storage.js').PaymentsPostgresStorage
  receiptManager: import('./receipts/ReceiptManager.js').ReceiptManager
  receiptNotifier: import('./receipts/notifications/ReceiptTelegramNotifier.js').ReceiptTelegramNotifier
  receiptsStorage: import('./receipts/ReceiptsPostgresStorage.js').ReceiptsPostgresStorage
  rollCallsStorage: import('./features/roll-calls/storage.js').RollCallsPostgresStorage
  telegram: import('telegraf').Telegram
  telegramBotToken: string
  telegramNotifier: import('./shared/notifications/TelegramNotifier.js').TelegramNotifier
  tokenSecret: string
  usersStorage: import('./features/users/storage.js').UsersPostgresStorage
  useTestMode: boolean
  version: string
  webAppName: string
  webAppUrl: string
}
