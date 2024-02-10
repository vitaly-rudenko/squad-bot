export interface Dependencies {
  botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>
  cardsStorage: import('./features/cards/storage.js').CardsPostgresStorage
  createRedisCache: ReturnType<typeof import('./utils/createRedisCacheFactory.js').createRedisCacheFactory>
  debtsStorage: import('./features/debts/storage.js').DebtsPostgresStorage
  groupStorage: import('./features/groups/storage.js').GroupsPostgresStorage
  localize: typeof import('./localization/localize.js').localize
  membershipStorage: import('./features/memberships/storage.js').MembershipPostgresStorage
  paymentsStorage: import('./features/payments/storage.js').PaymentsPostgresStorage
  receiptManager: import('./receipts/ReceiptManager.js').ReceiptManager
  receiptsStorage: import('./receipts/ReceiptsPostgresStorage.js').ReceiptsPostgresStorage
  rollCallsStorage: import('./features/roll-calls/storage.js').RollCallsPostgresStorage
  telegram: import('telegraf').Telegram
  telegramBotToken: string
  tokenSecret: string
  usersStorage: import('./features/users/storage.js').UsersPostgresStorage
  useTestMode: boolean
  generateWebAppUrl: import('./utils/types').GenerateWebAppUrl
  webAppUrl: string
  webAppName: string
  generateTemporaryAuthToken: import('./features/auth/types.js').GenerateTemporaryAuthToken
  receiptNotifier: import('./receipts/notifications/ReceiptTelegramNotifier.js').ReceiptTelegramNotifier
  massTelegramNotificationFactory: import('./shared/notifications/MassTelegramNotification.js').MassTelegramNotificationFactory
  errorLogger: import('./shared/TelegramErrorLogger.js').TelegramErrorLogger
  telegramNotifier: import('./shared/notifications/TelegramNotifier.js').TelegramNotifier
}
