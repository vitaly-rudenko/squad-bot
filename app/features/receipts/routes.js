import multer from 'multer'
import Router from 'express-promise-router'
import { NotFoundError } from '../common/errors.js'
import { ApiError } from '../common/errors.js'
import { registry } from '../../registry.js'
import { sendReceiptDeletedNotification, sendReceiptSavedNotification } from './notifications.js'
import { saveReceiptSchema } from './schemas.js'

export function createReceiptsRouter() {
  const {
    debtsStorage,
    receiptsStorage,
  } = registry.export()

  const router = Router()
  const upload = multer()

  // TODO: split into POST / PATCH
  router.post('/receipts', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > 300_000) { // 300 kb
      throw new ApiError({
        code: 'PHOTO_TOO_LARGE',
        status: 413,
        message: 'Receipt photo is too large',
      })
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
      ? { binary, mime }
      : leavePhoto ? undefined : 'delete'

    let receipt
    if (id) {
      receipt = await receiptsStorage.findById(id)
      if (!receipt) {
        throw new NotFoundError()
      }

      await receiptsStorage.update({
        id,
        payerId,
        amount,
        description,
        createdAt: new Date(),
      }, receiptPhoto)

      await debtsStorage.deleteByReceiptId(id)
    } else {
      receipt = await receiptsStorage.create({
        payerId,
        amount,
        description,
        createdAt: new Date(),
      }, receiptPhoto === 'delete' ? undefined : receiptPhoto)
    }

    for (const debt of debts) {
      await debtsStorage.create({
        receiptId: receipt.id,
        debtorId: debt.debtorId,
        amount: debt.amount,
      })
    }

    await sendReceiptSavedNotification({
      action: id ? 'update' : 'create',
      editorId: req.user.id,
      receipt,
    })

    res.json(
      formatReceipt(
        receipt,
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

    const receipt = await receiptsStorage.findById(receiptId)
    if (!receipt) {
      throw new NotFoundError()
    }

    await debtsStorage.deleteByReceiptId(receiptId)
    await receiptsStorage.deleteById(receiptId)

    await sendReceiptDeletedNotification({ editorId: req.user.id, receipt })

    res.sendStatus(204)
  })

  return router
}

export function createPublicReceiptsRouter() {
  const { receiptsStorage } = registry.export()

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
 * @param {import('./types').Receipt} receipt
 * @param {import('../debts/types').Debt[]} debts
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
