import { string, array, object, coerce } from 'superstruct'

const _ = coerce(string(), array(string()), (value) => value.join('\n'))

export const localeFileSchema = object({
  payments: object({
    command: object({
      message: _,
    }),
    notifications: object({
      saved: object({
        message: _,
        action: object({
          create: _,
          update: _,
        }),
      }),
      deleted: object({
        message: _,
      }),
    }),
  }),
  receipts: object({
    command: object({
      message: _,
    }),
    notifications: object({
      part: _,
      saved: object({
        message: _,
        description: _,
        action: object({
          create: _,
          update: _,
        }),
        ingoingDebt: _,
        outgoingDebt: _,
        checkDebts: _,
      }),
      deleted: object({
        message: _,
        description: _,
      }),
    }),
    actions: object({
      getPhoto: _,
      sendingPhoto: _,
    }),
  }),
  users: object({
    command: object({
      start: object({
        message: _,
      }),
    }),
  }),
  cards: object({
    command: object({
      message: _,
    }),
  }),
  debts: object({
    command: object({
      noDebts: _,
      ingoingDebt: _,
      ingoingDebtsOne: _,
      ingoingDebtsMany: _,
      outgoingDebt: _,
      outgoingDebtsOne: _,
      outgoingDebtsMany: _,
    }),
  }),
  rollCalls: object({
    command: object({
      group: _,
      private: _,
    }),
    noOneToMention: _,
    defaultPollTitle: _,
    message: object({
      withTitle: _,
      withoutTitle: _,
    }),
    mention: object({
      withUsername: _,
      withoutUsername: _,
    }),
  }),
  admins: object({
    titles: object({
      command: object({
        message: _,
      }),
    }),
  }),
  groupChatOnly: _,
  privateChatOnly: _,
  unknownUser: _,
})
