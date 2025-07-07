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
        ingoingDebt: _,
        outgoingDebt: _,
        checkDebts: _,
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
      failedToSendPhoto: _,
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
      message: _,
    }),
    noOneToMention: _,
    notApplicablePollOption: _,
    pollTitle: _,
    pollTitleMultiselect: _,
    groupPollTitle: _,
    groupPollTitleMultiselect: _,
    notification: _,
    mention: object({
      withUsername: _,
      withoutUsername: _,
    }),
  }),
  export: object({
    receipts: object({
      command: object({
        message: _,
        noReceipts: _,
      }),
      columns: object({
        date: _,
        description: _,
        amount: _,
        payer: _,
      }),
      filenamePrefix: _,
    })
  }),
  admins: object({
    titles: object({
      command: object({
        message: _,
      }),
    }),
  }),
  socialLinkFix: object({
    enabled: _,
    disabled: _,
  }),
  groupChatOnly: _,
  privateChatOnly: _,
  unknownUser: _,
  messageWasDeleted: _,
})
