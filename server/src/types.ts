import { Group } from './groups/types.js'
import { User } from './users/types.js'

export interface Dependencies {
  botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>
  cardsStorage: import('./cards/storage.js').CardsPostgresStorage
  debtsStorage: import('./debts/storage.js').DebtsPostgresStorage
  generateCode: import('./auth/types.js').generateCode
  generateWebAppUrl: ReturnType<typeof import('./web-app/utils.js').createWebAppUrlGenerator>
  groupCache: import('./common/cache.js').RedisCache<Group>
  groupStorage: import('./groups/storage.js').GroupsPostgresStorage
  localize: typeof import('./localization/localize.js').localize
  linksStorage: import('./links/storage.js').LinksPostgresStorage,
  membershipCache: import('./common/cache.js').RedisCache<true>
  membershipStorage: import('./memberships/storage.js').MembershipPostgresStorage
  paymentsStorage: import('./payments/storage.js').PaymentsPostgresStorage
  receiptsStorage: import('./receipts/storage.js').ReceiptsPostgresStorage
  redis: import('ioredis').Redis
  rollCallsStorage: import('./roll-calls/storage.js').RollCallsPostgresStorage
  telegram: import('telegraf').Telegram
  usersCache: import('./common/cache.js').RedisCache<User>
  usersStorage: import('./users/storage.js').UsersPostgresStorage
  version: string
  webAppName: string
  webAppUrl: string
  debugChatId: number
}

export type Deps<N extends keyof Dependencies> = Pick<Dependencies, N>
