import Router from 'express-promise-router'
import { ApiError } from '../ApiError.js'
import { logger } from '../../logger.js'
import { array, nonempty, object, size, string, trimmed } from 'superstruct'
import { groupIdSchema, userIdSchema } from '../schemas/common.js'

export const updateAdminsSchema = object({
  groupId: groupIdSchema,
  admins: nonempty(
    array(object({
      userId: userIdSchema,
      title: size(trimmed(string()), 0, 16),
    }))
  )
})

/**
 * @param {{
 *   telegram: import('telegraf').Telegram,
 *   botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>,
 *   groupStorage: import('../groups/GroupPostgresStorage.js').GroupsPostgresStorage,
 *   membershipManager: import('../memberships/MembershipManager.js').MembershipManager,
 * }} input
 */
export function createRouter({
  telegram,
  botInfo,
  groupStorage,
  membershipManager,
}) {
  const router = Router()

  router.get('/groups', async (req, res) => {
    const groups = await groupStorage.findByMemberUserId(req.user.id)
    res.json(groups)
  })

  router.get('/admins', async (req, res) => {
    const groupId = groupIdSchema.create(req.query.group_id)

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    try {
      const admins = await telegram.getChatAdministrators(Number(groupId))

      res.json(
        admins.map(admin => ({
          userId: String(admin.user.id),
          title: admin.custom_title || '',
          isCreator: admin.status === 'creator',
          isCurrentBot: admin.user.id === botInfo.id,
          editable: admin.status !== 'creator' && admin.can_be_edited,
        }))
      )
    } catch (error) {
      if (error.message.includes('chat not found')) {
        res.status(502).json({ error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found. Does bot have access to the group?' } })
        return
      }

      logger.error({ error, groupId }, 'Could not get chat administrators')
      throw error
    }
  })

  router.patch('/admins', async (req, res) => {
    const { groupId, admins } = updateAdminsSchema.create(req.body)

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    /** @type {{ userId: string; errorCode: string }[]} */
    const errorCodes = []
    for (const admin of admins) {
      try {
        await setUserCustomTitleAndPromote(telegram, groupId, admin.userId, admin.title)
      } catch (error) {
        if (error instanceof ApiError) {
          errorCodes.push({ userId: admin.userId, errorCode: error.code })
        } else {
          logger.error({ error, groupId, admin }, 'Could not update admin')
          throw error
        }
      }
    }

    if (errorCodes.length > 0) {
      res.status(400).json({ error: { code: 'COULD_NOT_UPDATE_ADMINS', context: { errorCodes } } })
    } else {
      res.sendStatus(200)
    }
  })

  return router
}

// https://stackoverflow.com/questions/61022534/telegram-bot-with-add-new-admin-rights-cant-promote-new-admins-or-change-cust
// "To change custom title, user has to be promoted by the bot itself."
async function setUserCustomTitleAndPromote(telegram, groupId, userId, title) {
  try {
    await setUserCustomTitle(telegram, groupId, userId, title)
  } catch (error) {
    if (!error.message.includes('user is not an administrator')) {
      throw error
    }

    try {
      await telegram.promoteChatMember(Number(groupId), Number(userId), {
        can_change_info: true,
        can_pin_messages: true,
      })
    } catch (error) {
      if (error.message.includes('not enough rights')) {
        throw new ApiError({ code: 'CANNOT_ADD_NEW_ADMINS', status: 502 })
      }

      throw error
    }

    await setUserCustomTitle(telegram, groupId, userId, title)
  }
}

async function setUserCustomTitle(telegram, groupId, userId, title) {
  try {
    await telegram.setChatAdministratorCustomTitle(Number(groupId), Number(userId), title)
  } catch (error) {
    if (error.message.includes('ADMIN_RANK_EMOJI_NOT_ALLOWED')) {
      throw new ApiError({ code: 'INVALID_CUSTOM_TITLE', status: 502 })
    }

    if (error.message.includes('RIGHT_FORBIDDEN')) {
      throw new ApiError({ code: 'INSUFFICIENT_PERMISSIONS', status: 502 })
    }

    if (error.message.includes('method is available only for supergroups')) {
      throw new ApiError({ code: 'FOR_SUPERGROUPS_ONLY', status: 502 })
    }

    throw error
  }
}
