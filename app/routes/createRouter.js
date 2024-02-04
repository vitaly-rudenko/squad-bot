import crypto from 'crypto'
import Router from 'express-promise-router'
import jwt from 'jsonwebtoken'
import { User } from '../users/User.js'
import { Payment } from '../payments/Payment.js'
import { Receipt } from '../receipts/Receipt.js'
import { ReceiptPhoto } from '../receipts/ReceiptPhoto.js'
import { RollCall } from '../rollcalls/RollCall.js'
import { AlreadyExistsError } from '../errors/AlreadyExistsError.js'
import { ApiError } from '../ApiError.js'
import { saveReceiptSchema } from '../schemas/receipts.js'
import { logger } from '../../logger.js'
import { Group } from '../groups/Group.js'
import multer from 'multer'

/**
 * @param {{
 *   telegram: import('telegraf').Telegram,
 *   botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>,
 *   createRedisCache: ReturnType<import('../utils/createRedisCacheFactory.js').createRedisCacheFactory>,
 *   debtManager: import('../debts/DebtManager.js').DebtManager,
 *   debtsStorage: import('../debts/DebtsPostgresStorage.js').DebtsPostgresStorage,
 *   groupManager: import('../groups/GroupManager.js').GroupManager,
 *   groupStorage: import('../groups/GroupPostgresStorage.js').GroupsPostgresStorage,
 *   membershipManager: import('../memberships/MembershipManager.js').MembershipManager,
 *   membershipStorage: import('../memberships/MembershipPostgresStorage.js').MembershipPostgresStorage,
 *   paymentManager: import('../payments/PaymentManager.js').PaymentManager,
 *   paymentsStorage: import('../payments/PaymentsPostgresStorage.js').PaymentsPostgresStorage,
 *   receiptManager: import('../receipts/ReceiptManager.js').ReceiptManager,
 *   receiptsStorage: import('../receipts/ReceiptsPostgresStorage.js').ReceiptsPostgresStorage,
 *   rollCallsStorage: import('../rollcalls/RollCallsPostgresStorage.js').RollCallsPostgresStorage,
 *   telegramBotToken: string,
 *   tokenSecret: string,
 *   usersStorage: import('../users/UsersPostgresStorage.js').UsersPostgresStorage,
 *   useTestMode: boolean,
 * }} input
 */
export function createRouter({
  telegram,
  botInfo,
  createRedisCache,
  debtManager,
  debtsStorage,
  groupManager,
  groupStorage,
  membershipManager,
  membershipStorage,
  paymentManager,
  paymentsStorage,
  receiptManager,
  receiptsStorage,
  rollCallsStorage,
  telegramBotToken,
  tokenSecret,
  usersStorage,
  useTestMode,
}) {
  const router = Router()
  const upload = multer()

  const temporaryAuthTokenCache = createRedisCache('tokens', useTestMode ? 60_000 : 5 * 60_000)

  router.get('/authenticate', async (req, res) => {
    const temporaryAuthToken = req.query['token']
    if (typeof temporaryAuthToken !== 'string' || !(await temporaryAuthTokenCache.set(temporaryAuthToken))) {
      res.status(400).json({ error: { code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE' } })
      return
    }

    let userId
    try {
      const parsed = jwt.verify(temporaryAuthToken, tokenSecret)
      if (typeof parsed === 'string' || !parsed.userId) {
        throw new Error('Temporary token does not contain user ID')
      }
      userId = parsed.userId
    } catch (error) {
      res.status(400).json({ error: { code: 'INVALID_TEMPORARY_AUTH_TOKEN' } })
      return
    }

    const user = await usersStorage.findById(userId)
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND' } })
      return
    }

    res.json(jwt.sign({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
      }
    }, tokenSecret))
  })

  router.post('/authenticate-web-app', async (req, res, next) => {
    try {
      const { initData } = req.body

      if (typeof initData !== 'string') {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR' } })
        return
      }

      if (!checkWebAppSignature(telegramBotToken, initData)) {
        res.status(400).json({ error: { code: 'INVALID_SIGNATURE' } })
        return
      }

      const parsedInitData = new URLSearchParams(initData)
      const telegramUser = JSON.parse(parsedInitData.get('user') ?? '')
      const userId = String(telegramUser.id)

      const user = await usersStorage.findById(userId)
      if (!user) {
        res.status(404).json({ error: { code: 'USER_NOT_FOUND' } })
        return
      }

      res.json(jwt.sign({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
        }
      }, tokenSecret))
    } catch (error) {
      console.warn(error)
      next(error)
    }
  })

  router.get('/receipts/:receiptId/photo', async (req, res) => {
    const receiptId = req.params.receiptId
    const receiptPhoto = await receiptsStorage.getReceiptPhoto(receiptId)

    if (receiptPhoto) {
      res.contentType(receiptPhoto.mime).send(receiptPhoto.binary).end()
    } else {
      res.sendStatus(404)
    }
  })

  if (useTestMode) {
    router.post('/memberships', async (req, res) => {
      const { userId, groupId, title } = req.body

      await membershipManager.hardLink(userId, groupId)
      await groupManager.store(
        new Group({
          id: groupId,
          title,
        })
      )

      res.json('ok')
    })
  }

  router.use((req, res, next) => {
    const token = req.headers['authorization']?.slice(7) // 'Bearer ' length

    if (token) {
      try {
        const parsed = jwt.verify(token, tokenSecret)
        if (typeof parsed === 'string' || !parsed.user || !parsed.user.id || !parsed.user.username || !parsed.user.name) {
          throw new Error('Token does not contain user ID, username and name')
        }
        req.user = parsed.user
        next()
      } catch (error) {
        res.status(401).json({ error: { code: 'INVALID_AUTH_TOKEN', message: error.message } })
      }
    } else {
      res.status(401).json({ error: { code: 'AUTH_TOKEN_NOT_PROVIDED' } })
    }
  })

  router.post('/users', async (req, res) => {
    const { id, username, name } = req.user

    try {
      const user = new User({ id, name, username })
      await usersStorage.create(user)

      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
      })
    } catch (error) {
      res.sendStatus(409)
    }
  })

  router.get('/users', async (req, res) => {
    const groupId = req.query.group_id
    if (groupId) {
      const userIds = await membershipStorage.findUserIdsByGroupId(groupId)
      const users = await usersStorage.findByIds(userIds)
      res.json(users)
      return
    }

    const users = await usersStorage.findAll()
    res.json(users)
  })

  router.get('/bot', async (_, res) => {
    res.json({
      id: String(botInfo.id),
      name: botInfo.first_name,
      username: botInfo.username,
    })
  })

  router.post('/receipts', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > 300_000) { // 300 kb
      res.sendStatus(413)
      return
    }

    const {
      id,
      payer_id: payerId,
      description,
      amount,
      debts,
      leave_photo: leavePhoto,
    } = saveReceiptSchema.create(req.body)

    const binary = req.file?.buffer
    const mime = req.file?.mimetype

    const receiptPhoto = (binary && mime)
      ? new ReceiptPhoto({ binary, mime })
      : leavePhoto ? undefined : 'delete'

    const receipt = new Receipt({
      id,
      payerId,
      amount,
      description,
      hasPhoto: receiptPhoto !== undefined && receiptPhoto !== 'delete'
    })

    const storedReceipt = await receiptManager.store({ debts, receipt, receiptPhoto }, { editorId: req.user.id })

    res.json(
      formatReceipt(
        storedReceipt,
        await debtsStorage.findByReceiptId(receipt.id)
      )
    )
  })

  router.get('/receipts', async (req, res) => {
    const receipts = await receiptsStorage.findByParticipantUserId(req.user.id)
    const debts = await debtsStorage.findByReceiptIds(receipts.map(r => r.id))

    res.json(receipts.map((receipt) => formatReceipt(receipt, debts)))
  })

  router.get('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    const receipt = await receiptsStorage.findById(receiptId)

    if (!receipt) {
      return res.sendStatus(404)
    }

    const debts = await debtsStorage.findByReceiptId(receiptId)

    res.json(formatReceipt(receipt, debts))
  })

  router.delete('/receipts/:receiptId', async (req, res) => {
    await receiptManager.delete(req.params.receiptId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  router.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body
    const payment = new Payment({ fromUserId, toUserId, amount })
    const storedPayment = await paymentManager.store(payment, { editorId: req.user.id })
    res.json(storedPayment)
  })

  router.delete('/payments/:paymentId', async (req, res) => {
    await paymentManager.delete(req.params.paymentId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  router.get('/payments', async (req, res) => {
    const payments = await paymentsStorage.findByParticipantUserId(req.user.id)
    res.json(payments)
  })

  router.get('/debts', async (req, res) => {
    const { ingoingDebts, outgoingDebts } = await debtManager.aggregateByUserId(req.user.id)

    res.json({
      ingoingDebts: ingoingDebts.map(debt => ({
        userId: debt.fromUserId,
        amount: debt.amount,
      })),
      outgoingDebts: outgoingDebts.map(debt => ({
        userId: debt.toUserId,
        amount: debt.amount,
      })),
    })
  })

  router.post('/rollcalls', async (req, res, next) => {
    const groupId = req.body.groupId

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    const messagePattern = req.body.messagePattern
    const usersPattern = req.body.usersPattern
    const excludeSender = req.body.excludeSender
    const pollOptions = req.body.pollOptions
    const sortOrder = req.body.sortOrder

    try {
      const storedRollCall = await rollCallsStorage.create(
        new RollCall({
          groupId,
          excludeSender,
          messagePattern,
          usersPattern,
          pollOptions,
          sortOrder,
        })
      )

      res.json(storedRollCall)
    } catch (error) {
      if (error instanceof AlreadyExistsError) {
        res.sendStatus(409)
      } else {
        next(error)
      }
    }
  })

  router.patch('/rollcalls/:id', async (req, res) => {
    const rollCallId = req.params.id

    const rollCall = await rollCallsStorage.findById(rollCallId)
    if (!rollCall) {
      res.sendStatus(404)
      return
    }

    const groupId = rollCall.groupId

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    const messagePattern = req.body.messagePattern
    const usersPattern = req.body.usersPattern
    const excludeSender = req.body.excludeSender
    const pollOptions = req.body.pollOptions
    const sortOrder = req.body.sortOrder

    const updatedRollCall = await rollCallsStorage.update(
      rollCallId,
      {
        excludeSender,
        messagePattern,
        usersPattern,
        pollOptions,
        sortOrder,
      }
    )

    res.json(updatedRollCall)
  })

  router.get('/rollcalls', async (req, res) => {
    const groupId = req.query['group_id']
    if (typeof groupId !== 'string') {
      res.sendStatus(400)
      return
    }

    const rollCalls = await rollCallsStorage.findByGroupId(groupId)
    res.json(rollCalls)
  })

  router.delete('/rollcalls/:rollCallId', async (req, res) => {
    const rollCall = await rollCallsStorage.findById(req.params.rollCallId)
    if (!rollCall) {
      res.sendStatus(404)
      return
    }

    if (!(await membershipManager.isHardLinked(req.user.id, rollCall.groupId))) {
      res.sendStatus(403)
      return
    }

    await rollCallsStorage.deleteById(req.params.rollCallId)
    res.sendStatus(204)
  })

  router.get('/groups', async (req, res) => {
    res.json(await groupStorage.findByMemberUserId(req.user.id))
  })

  router.get('/admins', async (req, res) => {
    const groupId = req.query.group_id
    if (typeof groupId !== 'string') {
      res.sendStatus(400)
      return
    }

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    try {
      const admins = await telegram.getChatAdministrators(Number(groupId))

      res.json(admins.map(admin => ({
        userId: String(admin.user.id),
        title: admin.custom_title || '',
        isCreator: admin.status === 'creator',
        isCurrentBot: admin.user.id === botInfo.id,
        editable: admin.status !== 'creator' && admin.can_be_edited,
      })))
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
    const { groupId, admins } = req.body
    if (
      typeof groupId !== 'string' ||
      !Array.isArray(admins) ||
      admins.some(admin =>
        typeof admin.userId !== 'string' ||
        typeof admin.title !== 'string'
      )
    ) {
      res.sendStatus(400)
      return
    }

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

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

// https://stackoverflow.com/a/72985407
// function checkWebAppSignature(botToken, initData) {
//   const query = new URLSearchParams(initData)
//   const hash = query.get('hash')
//   if (!hash) return false
//   query.delete('hash')

//   const sorted = [...query.entries()].sort(([key1], [key2]) => key1.localeCompare(key2))
//   const dataCheckString = sorted.map(([key, value]) => `${key}=${value}`).join('\n')

//   const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest('hex')
//   const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

//   return computedHash === hash
// }

// https://gist.github.com/konstantin24121/49da5d8023532d66cc4db1136435a885?permalink_comment_id=4574538#gistcomment-4574538
function checkWebAppSignature(botToken, initData) {
  const urlParams = new URLSearchParams(initData)

  const hash = urlParams.get('hash')
  urlParams.delete('hash')
  urlParams.sort()

  let dataCheckString = ''
  for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`
  }
  dataCheckString = dataCheckString.slice(0, -1)

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken)
  const calculatedHash = crypto.createHmac('sha256', secret.digest()).update(dataCheckString).digest('hex')

  return calculatedHash === hash
}

/**
 * @param {import('../receipts/Receipt.js').Receipt} receipt
 * @param {import('../debts/Debt.js').Debt[]} debts
 */
function formatReceipt(receipt, debts) {
  return {
    id: receipt.id,
    createdAt: receipt.createdAt,
    payerId: receipt.payerId,
    amount: receipt.amount,
    description: receipt.description,
    hasPhoto: receipt.hasPhoto,
    debts: debts
      .filter(debt => debt.receiptId === receipt.id)
      .map(debt => ({
        debtorId: debt.debtorId,
        amount: debt.amount,
      }))
  }
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
