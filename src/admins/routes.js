import Router from 'express-promise-router'
import { ApiError } from '../common/errors.js'
import { logger } from '../logger.js'
import { array, nonempty, object, size, string, trimmed } from 'superstruct'
import { groupIdSchema, userIdSchema } from '../common/schemas.js'
import { NotAuthorizedError } from '../common/errors.js'
import { registry } from '../registry.js'

export const updateAdminsSchema = object({
  groupId: groupIdSchema,
  admins: nonempty(
    array(object({
      userId: userIdSchema,
      title: size(trimmed(string()), 0, 16),
    }))
  )
})

export function createAdminsRouter() {
  const {
    telegram,
    botInfo,
    membershipStorage,
  } = registry.export()

  const router = Router()

  router.get('/admins', async (req, res) => {
    const groupId = groupIdSchema.create(req.query.group_id)

    if (!(await membershipStorage.exists(req.user.id, groupId))) {
      throw new NotAuthorizedError()
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
        throw new ApiError({
          code: 'CHAT_NOT_FOUND',
          message: 'Chat not found. Does bot have access to the group?',
          status: 502,
        })
      }

      logger.error({ error, groupId }, 'Could not get chat administrators')
      throw error
    }
  })

  router.patch('/admins', async (req, res) => {
    const { groupId, admins } = updateAdminsSchema.create(req.body)

    if (!(await membershipStorage.exists(req.user.id, groupId))) {
      throw new NotAuthorizedError()
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
      throw new ApiError({
        code: 'COULD_NOT_UPDATE_ADMINS',
        context: { errorCodes },
        status: 400
      })
    }

    res.sendStatus(200)
  })

  return router
}

// https://stackoverflow.com/questions/61022534/telegram-bot-with-add-new-admin-rights-cant-promote-new-admins-or-change-cust
// "To change custom title, user has to be promoted by the bot itself."
/**
 * @param {import('telegraf').Telegram} telegram
 * @param {string} groupId
 * @param {string} userId
 * @param {string} title
 */
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

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {string} groupId
 * @param {string} userId
 * @param {string} title
 */
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
