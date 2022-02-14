import './env.js'

import { Telegraf } from 'telegraf'
import express from 'express'
import ejs from 'ejs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import multer from 'multer'

import { Cache } from './app/utils/Cache.js'
import { versionCommand } from './app/flows/version.js'

import { PostgresStorage } from './app/PostgresStorage.js'
import { registerCommand, startCommand } from './app/flows/start.js'
import { usersCommand } from './app/flows/users.js'
import { debtsCommand } from './app/flows/debts.js'
import { receiptsGetCommand } from './app/flows/receipts.js'
import { withUserId } from './app/withUserId.js'
import { withPhaseFactory } from './app/withPhaseFactory.js'
import { UserSessionManager } from './app/utils/UserSessionManager.js'
import { phases } from './app/phases.js'
import { cardsAddCommand, cardsAddNumberMessage, cardsAddBankAction, cardsDeleteCommand, cardsDeleteIdAction, cardsGet, cardsGetIdAction, cardsGetUserIdAction } from './app/flows/cards.js'
import { paymentsGetCommand } from './app/flows/payments.js'
import { renderMoney } from './app/renderMoney.js'
import { withUserFactory } from './app/withUserFactory.js'
import { renderDebtAmount } from './app/renderDebtAmount.js'

if (process.env.USE_NATIVE_ENV !== 'true') {
  console.log('Using .env file')
  dotenv.config()
}

(async () => {
  const upload = multer()

  const storage = new PostgresStorage(process.env.DATABASE_URL)
  await storage.connect()

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

  const debugChatId = process.env.DEBUG_CHAT_ID
  const bot = new Telegraf(telegramBotToken)

  bot.telegram.setMyCommands([
    { command: 'debts', description: 'Посчитать долги' },
    { command: 'receipts', description: 'Добавить/посмотреть чеки' },
    { command: 'payments', description: 'Добавить/посмотреть платежи' },
    { command: 'cards', description: 'Посмотреть банковские карты пользователя' },
    { command: 'addcard', description: 'Добавить банковскую карту' },
    { command: 'deletecard', description: 'Удалить банковскую карту' },
    { command: 'start', description: 'Зарегистрироваться' },
    { command: 'register', description: 'Зарегистрироваться' },
    { command: 'users', description: 'Список пользователей' },
    { command: 'version', description: 'Версия' },
  ])

  process.on('unhandledRejection', async (error) => {
    await logError(error)
  })

  async function logError(error) {
    console.error('Unexpected error:', error)

    try {
      await bot.telegram.sendMessage(
        debugChatId,
        `❗️Unexpected error at ${new Date().toISOString()}❗️\n${error.name}: ${error.message}\n\nStack:\n${error.stack}`
      )
    } catch (error) {
      console.warn('Could not post log to debug chat:', error)
    }
  }

  async function getDebtsByUserId(userId) {
    const ingoingDebts = await storage.getIngoingDebts(userId)
    const outgoingDebts = await storage.getOutgoingDebts(userId)
    const ingoingPayments = await storage.getIngoingPayments(userId)
    const outgoingPayments = await storage.getOutgoingPayments(userId)

    const unfinishedReceiptIds = [...new Set([
      ...ingoingDebts.flatMap(d => d.uncertainReceiptIds),
      ...outgoingDebts.flatMap(d => d.uncertainReceiptIds),
    ])]

    const debtMap = {}
    const uncertainMap = {}
    const addPayment = (fromUserId, toUserId, amount) => {
      const debtUserId = fromUserId === userId ? toUserId : fromUserId

      if (!debtMap[debtUserId]) {
        debtMap[debtUserId] = 0
      }

      if (fromUserId === userId) {
        debtMap[debtUserId] -= amount
      } else {
        debtMap[debtUserId] += amount
      }
    }

    for (const debt of ingoingDebts) {
      addPayment(userId, debt.userId, debt.amount)
      if (debt.uncertainReceiptIds.length > 0) {
        uncertainMap[debt.userId + '_' + userId] = true
      }
    }

    for (const debt of outgoingDebts) {
      addPayment(debt.userId, userId, debt.amount)
      if (debt.uncertainReceiptIds.length > 0) {
        uncertainMap[userId + '_' + debt.userId] = true
      }
    }

    for (const payment of ingoingPayments)
      addPayment(payment.userId, userId, payment.amount)
    for (const payment of outgoingPayments)
      addPayment(userId, payment.userId, payment.amount)

    const debts = Object.entries(debtMap)
      .map(([userId, amount]) => ({ userId, amount }))

    return {
      ingoingDebts: debts
        .map(debt => ({ ...debt, ...uncertainMap[debt.userId + '_' + userId] && { isUncertain: true } }))
        .filter(debt => debt.amount < 0 || debt.isUncertain)
        .map(debt => ({ ...debt, amount: Math.max(0, -debt.amount) })),
      outgoingDebts: debts
        .map(debt => ({ ...debt, ...uncertainMap[userId + '_' + debt.userId] && { isUncertain: true } }))
        .filter(debt => debt.amount > 0 || debt.isUncertain)
        .map(debt => ({ ...debt, amount: Math.max(0, debt.amount) })),
      ...unfinishedReceiptIds.length > 0 && { unfinishedReceiptIds },
    }
  }

  const userSessionManager = new UserSessionManager()
  const withPhase = withPhaseFactory(userSessionManager)
  const withUser = withUserFactory(storage)

  bot.use(withUserId())

  bot.command('version', versionCommand())
  bot.command('start', startCommand({ storage }))
  bot.command('register', registerCommand({ storage }))

  bot.command('users', withUser(), usersCommand({ storage }))
  bot.command('debts', withUser(), debtsCommand({ storage, getDebtsByUserId }))
  bot.command('receipts', withUser(), receiptsGetCommand())
  bot.command('payments', withUser(), paymentsGetCommand())

  bot.command('addcard', withUser(), cardsAddCommand({ userSessionManager }))
  bot.action(/cards:add:bank:(.+)/, withUser(), withPhase(phases.addCard.bank, cardsAddBankAction({ userSessionManager })))

  bot.command('deletecard', withUser(), cardsDeleteCommand({ storage, userSessionManager }))
  bot.action(/cards:delete:id:(.+)/, withUser(), withPhase(phases.deleteCard.id, cardsDeleteIdAction({ storage, userSessionManager })))

  bot.command('cards', withUser(), cardsGet({ storage, userSessionManager }))
  bot.action(/cards:get:user-id:(.+)/, withUser(), withPhase(phases.getCard.userId, cardsGetUserIdAction({ storage, userSessionManager })))
  bot.action(/cards:get:id:(.+)/, withUser(), withPhase(phases.getCard.id, cardsGetIdAction({ storage, userSessionManager })))

  bot.on('message',
    withUser({ ignore: true }),
    async (context, next) => {
      if ('text' in context.message && context.message.text.startsWith('/')) return;
      await next();
    },
    // Cards
    withPhase(phases.addCard.number, cardsAddNumberMessage({ storage, userSessionManager }))
  )

  bot.catch((error) => logError(error))

  async function storeReceipt(editorId, { id = undefined, payerId, amount, description = null, photo = null, mime = null, debts }) {
    const isNew = !Boolean(id)
    if (id) {
      await storage.updateReceipt({
        id,
        payerId,
        amount,
        description,
        photo,
        mime,
      })

      await storage.deleteDebtsByReceiptId(id)
    } else {
      id = await storage.createReceipt({
        payerId,
        amount,
        description,
        photo,
        mime,
      })
    }

    for (const debt of debts) {
      const { debtorId, amount } = debt

      await storage.createDebt({
        receiptId: id,
        amount,
        debtorId,
      })
    }

    const editor = await storage.findUserById(editorId)
    const payer = await storage.findUserById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(d => d.debtorId)])]
    const users = await storage.findUsersByIds(userIds)
    const notificationDescription = description ? `"${description}"` : 'без описания'

    for (const user of users) {
      if (!user.isComplete) continue;
      const debt = debts.find(d => d.debtorId === user.id)

      const notification = `
✏️🧾 Пользователь ${editor.name} (@${editor.username}) ${isNew ? 'добавил' : 'отредактировал'} чек ${notificationDescription} на сумму ${renderMoney(amount)} грн.
👤 Плательщик: ${payer.name} (@${payer.username})
💵 Твой долг в этом чеке: ${renderDebtAmount(debt)} грн.
💸 Проверить долги: /debts
🧾 Посмотреть чеки: /receipts
      `

      try {
        await sendNotification(user.id, notification)
      } catch (error) {
        logError(error)
      }
    }

    return id
  }

  async function storePayment(editorId, { fromUserId, toUserId, amount }) {
    const id = await storage.createPayment({ fromUserId, toUserId, amount })

    const editor = await storage.findUserById(editorId)
    const sender = await storage.findUserById(fromUserId)
    const receiver = await storage.findUserById(toUserId)

    const notification = `
➡️ Пользователь ${editor.name} (@${editor.username}) создал платеж на сумму ${renderMoney(amount)} грн.
👤 Отправитель: ${sender.name} (@${sender.username})
👤 Получатель: ${receiver.name} (@${receiver.username})
💸 Проверить долги: /debts
🧾 Посмотреть платежи: /payments
    `

    if (sender.isComplete) {
      await sendNotification(sender.id, notification)
    }

    if (receiver.isComplete) {
      await sendNotification(receiver.id, notification)
    }

    return id
  }

  async function deleteReceipt(editorId, receiptId) {
    const receipt = await storage.findReceiptById(receiptId)

    await storage.deleteDebtsByReceiptId(receiptId)
    await storage.deleteReceiptById(receiptId)

    const editor = await storage.findUserById(editorId)
    const payer = await storage.findUserById(receipt.payerId)
    const userIds = [...new Set([receipt.payerId, ...receipt.debts.map(d => d.debtorId)])]
    const users = await storage.findUsersByIds(userIds)
    const notificationDescription = receipt.description ? `"${receipt.description}"` : 'без описания'

    const notification = `
❌ ✏️🧾 Пользователь ${editor.name} (@${editor.username}) удалил чек ${notificationDescription} на сумму ${renderMoney(receipt.amount)} грн.
👤 Плательщик: ${payer.name} (@${payer.username})
💸 Проверить долги: /debts
🧾 Посмотреть чеки: /receipts
    `

    for (const user of users) {
      if (!user.isComplete) continue;

      try {
        await sendNotification(user.id, notification)
      } catch (error) {
        logError(error)
      }
    }
  }

  async function deletePayment(editorId, paymentId) {
    const payment = await storage.findPaymentById(paymentId)
    
    const editor = await storage.findUserById(editorId)
    const sender = await storage.findUserById(payment.fromUserId)
    const receiver = await storage.findUserById(payment.toUserId)

    await storage.deletePaymentById(paymentId)

    const notification = `
❌ ➡️ Пользователь ${editor.name} (@${editor.username}) удалил платеж на сумму ${renderMoney(payment.amount)} грн.
👤 Отправитель: ${sender.name} (@${sender.username})
👤 Получатель: ${receiver.name} (@${receiver.username})
💸 Проверить долги: /debts
🧾 Посмотреть платежи: /payments
    `

    if (sender.isComplete) {
      await sendNotification(sender.id, notification)
    }

    if (receiver.isComplete) {
      await sendNotification(receiver.id, notification)
    }
  }

  async function sendNotification(userId, message) {
    await bot.telegram.sendMessage(userId, message.trim())
  }

  const app = express()
  app.use(express.json())
  app.use("/static", express.static("./public"))
  app.engine("html", ejs.renderFile)
  app.set("view engine", "html")

  app.get('/', async (req, res) => {
    res.render('receipt')
  })

  app.get('/authpage', async (req, res) => {
    res.render('auth')
  })
  
  app.get('/paymentview', async (req, res) => {
    res.render('payment')
  })
  
  app.get('/paymentslist', async (req, res) => {
    res.render('payments_list')
  })
  
  app.get('/receiptslist', async (req, res) => {
    res.render('receipts_list')
  })

  // --- Telegram

  const handledBotUpdates = new Cache(60_000)

  app.post(`/bot${telegramBotToken}`, async (req, res, next) => {
    const updateId = req.body['update_id']
    if (!updateId) {
      console.log('Invalid update:', req.body)
      res.sendStatus(500)
      return
    }

    if (handledBotUpdates.has(updateId)) {
      console.log('Update is already handled:', req.body)
      res.sendStatus(200)
      return
    }

    handledBotUpdates.set(updateId)
    console.log('Update received:', req.body)

    try {
      await bot.handleUpdate(req.body, res)
    } catch (error) {
      next(error)
    }
  })

  // --- API

  const temporaryAuthTokenCache = new Cache(60_000)

  app.get('/auth-token', async (req, res, next) => {
    const temporaryAuthToken = req.query['temporary_auth_token']
    if (temporaryAuthTokenCache.has(temporaryAuthToken)) {
      res.status(400).json({ error: { code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE' } })
      return
    }

    let userId
    try {
      ({ userId } = jwt.verify(temporaryAuthToken, process.env.TOKEN_SECRET))
      if (!userId) {
        throw new Error('Temporary token does not contain user ID')
      }
    } catch (error) {
      res.status(400).json({ error: { code: 'INVALID_TEMPORARY_AUTH_TOKEN' } })
      return
    }

    const user = await storage.findUserById(userId)
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND' } })
      return
    }

    res.json(jwt.sign({ user: {
      id: user.id,
      name: user.name,
      username: user.username,
    } }, process.env.TOKEN_SECRET))
    temporaryAuthTokenCache.set(temporaryAuthToken)
  })

  app.get('/receipts/:receiptId/photo', async (req, res) => {
    const receiptId = req.params.receiptId
    const receiptPhoto = await storage.getReceiptPhoto(receiptId)

    if (receiptPhoto) {
      res.contentType(receiptPhoto.mime).send(receiptPhoto.photo).end()
    } else {
      res.sendStatus(404)
    }
  })

  app.use((req, res, next) => {
    const token = req.headers['authorization']?.slice(7) // 'Bearer ' length

    if (token) {
      try {
        const { user } = jwt.verify(token, process.env.TOKEN_SECRET)
        if (!user.id || !user.username || !user.name) {
          throw new Error('Token does not contain user ID, username and name')
        }
        req.user = user
        next()
      } catch (error) {
        res.status(401).json({ error: { code: 'INVALID_AUTH_TOKEN', message: error.message } })
      }
    } else {
      res.status(401).json({ error: { code: 'AUTH_TOKEN_NOT_PROVIDED' } })
    }
  })

  app.post('/users', async (req, res) => {
    const { id, username, name } = req.user
    const user = { id, username, name }

    try {
      await storage.createUser(user)
      res.json(user)
    } catch (error) {
      res.sendStatus(409)
    }
  })

  app.get('/users', async (req, res) => {
    const users = await storage.findUsers()
    res.json(users)
  })

  app.post('/receipts', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > 10_000_000) { // 10 mb
      res.sendStatus(413)
      return
    }

    let id = req.body.id ?? null

    const payerId = req.body.payer_id
    let photo = req.file?.buffer ?? null
    let mime = req.file?.mimetype ?? null
    const description = req.body.description ?? null
    const amount = Number(req.body.amount)
    const debts = Object.entries(JSON.parse(req.body.debts))
      .map(([debtorId, amount]) => ({
        debtorId,
        amount: (amount !== null && Number.isInteger(Number(amount)) && Number(amount) > 0) ? Number(amount) : null,
      }))

    if (id && req.body.leave_photo === 'true' && (!photo || !mime)) {
      const receiptPhoto = await storage.getReceiptPhoto(id)
      if (receiptPhoto) {
        photo = receiptPhoto.photo
        mime = receiptPhoto.mime
      }
    }

    id = await storeReceipt(req.user.id, {
      id,
      payerId,
      photo,
      mime,
      description,
      amount,
      debts,
    })

    const receipt = await storage.findReceiptById(id)
    res.json(receipt)
  })

  app.get('/receipts', async (req, res) => {
    const receipts = await storage.findReceiptsByParticipantUserId(req.user.id)
    res.json(receipts)
  })

  app.get('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    const receipt = await storage.findReceiptById(receiptId)

    if (!receipt) {
      return res.sendStatus(404)
    }

    res.json(receipt)
  })

  app.delete('/receipts/:receiptId', async (req, res) => {
    await deleteReceipt(req.user.id, req.params.receiptId)
    res.sendStatus(204)
  })

  app.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body
    const id = await storePayment(req.user.id, { fromUserId, toUserId, amount })
    const payment = await storage.findPaymentById(id)
    res.json(payment)
  })

  app.delete('/payments/:paymentId', async (req, res) => {
    await deletePayment(req.user.id, req.params.paymentId)
    res.sendStatus(204)
  })

  app.get('/payments', async (req, res) => {
    const fromUserId = req.query['from_user_id']
    const toUserId = req.query['to_user_id']
    const payments = await storage.findPayments({ fromUserId, toUserId })
    res.json(payments)
  })

  app.get('/debts/:userId', async (req, res) => {
    const debts = await getDebtsByUserId(req.params.userId)
    res.json(debts)
  })

  const port = Number(process.env.PORT) || 3001

  await new Promise(resolve => app.listen(port, () => resolve()))

  await bot.telegram.deleteWebhook()

  const domain = process.env.DOMAIN
  const webhookUrl = `${domain}/bot${telegramBotToken}`

  console.log('Setting webhook to', webhookUrl)
  while (true) {
    try {
      await bot.telegram.setWebhook(webhookUrl, { allowed_updates: ['message', 'callback_query'] })
      break;
    } catch (error) {
      console.log('Could not set webhook, retrying...', error.message)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(
    `Webhook 0.0.0.0:${port} is listening at ${webhookUrl}:`,
    await bot.telegram.getWebhookInfo()
  )
})()
