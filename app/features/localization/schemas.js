import { union, string, array, object } from 'superstruct'

const _ = union([string(), array(string())])
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
      ingoingDebts: _,
      noIngoingDebts: _,
      outgoingDebts: _,
      noOutgoingDebts: _,
      debt: _,
      noDescription: _,
      withPhoto: _,
      withoutPhoto: _,
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
      withText: _,
      withoutText: _,
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
  notifications: object({
    receiptStored: object({
      message: _,
      description: _,
      noDescription: _,
      actions: object({
        added: _,
        updated: _,
      }),
      part: _,
    }),
    receiptDeleted: object({
      message: _,
      description: _,
      noDescription: _,
    }),
  }),
})
