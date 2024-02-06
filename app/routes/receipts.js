import multer from 'multer'
import Router from 'express-promise-router'
import { Receipt } from '../receipts/Receipt.js'
import { ReceiptPhoto } from '../receipts/ReceiptPhoto.js'
import { object, string, coerce, array, optional, size, trimmed } from 'superstruct'
import { amountSchema, stringifiedBooleanSchema, userIdSchema } from '../features/common/schemas.js'
import { NotFoundError } from '../features/common/errors.js'

export const debtSchema = object({
  debtorId: userIdSchema,
  amount: amountSchema,
})

export const debtsSchema = coerce(
  array(debtSchema),
  string(),
  (value) => (
    Object.entries(JSON.parse(value))
      .map(([debtorId, amount]) => ({ debtorId, amount }))
  )
)

export const saveReceiptSchema = object({
  id: optional(string()),
  payer_id: string(),
  description: optional(size(trimmed(string()), 1, 64)),
  amount: amountSchema,
  debts: size(debtsSchema, 1, 10),
  leave_photo: optional(stringifiedBooleanSchema),
})


/**
 * @param {{
 *   debtsStorage: import('../debts/DebtsPostgresStorage.js').DebtsPostgresStorage,
 *   receiptManager: import('../receipts/ReceiptManager.js').ReceiptManager,
 *   receiptsStorage: import('../receipts/ReceiptsPostgresStorage.js').ReceiptsPostgresStorage,
 * }} input
 */
export function createRouter({
  debtsStorage,
  receiptManager,
  receiptsStorage,
}) {
  const router = Router()
  const upload = multer()

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

    const storedReceipt = await receiptManager.store(
      { debts, receipt, receiptPhoto },
      { editorId: req.user.id },
    )

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
      throw new NotFoundError()
    }

    const debts = await debtsStorage.findByReceiptId(receiptId)

    res.json(formatReceipt(receipt, debts))
  })

  router.delete('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    await receiptManager.delete(receiptId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  return router
}

/**
 * @param {{
 *   receiptsStorage: import('../receipts/ReceiptsPostgresStorage.js').ReceiptsPostgresStorage,
 * }} input
 */
export function createPublicRouter({ receiptsStorage }) {
  const router = Router()

  router.get('/receipts/:receiptId/photo', async (req, res) => {
    const receiptId = req.params.receiptId

    const receiptPhoto = await receiptsStorage.getReceiptPhoto(receiptId)
    if (!receiptPhoto) {
      throw new NotFoundError()
    }

    res.contentType(receiptPhoto.mime).send(receiptPhoto.binary).end()
  })

  return router
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
