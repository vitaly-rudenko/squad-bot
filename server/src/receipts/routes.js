import multer from 'multer'
import Router from 'express-promise-router'
import { NotFoundError } from '../common/errors.js'
import { ApiError } from '../common/errors.js'
import { registry } from '../registry.js'
import { sendReceiptDeletedNotification, sendReceiptSavedNotification } from './notifications.js'
import { photoSchema, saveReceiptSchema } from './schemas.js'
import { optional } from 'superstruct'
import { deletePhoto, generateRandomPhotoFilename, savePhoto } from './filesystem.js'
import { MAX_DEBTS_PER_RECEIPT } from '../debts/constants.js'
import { paginationSchema } from '../common/schemas.js'
import { paginationToLimitOffset } from '../common/utils.js'
import { validateReceiptIntegrity } from './utils.js'
import { scan } from './scan.js'
import { logger } from '../common/logger.js'
import { DAY_MS, WEEK_MS, createRateLimiterMiddleware } from '../common/rate-limiter.js'
import { env } from '../env.js'

const MAX_FILE_SIZE_BYTES = 400_000

export function createReceiptsRouter() {
  const {
    debtsStorage,
    receiptsStorage,
  } = registry.export()

  const router = Router()
  const upload = multer({
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
  })

  // TODO: update debts in the same transaction as the receipt
  // TODO: handle photos as streams, perhaps in a separate endpoint
  // TODO: split into POST / PATCH?
  router.post('/receipts', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > MAX_FILE_SIZE_BYTES) { // 300 kb
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
      debts: debtsWithoutReceiptId,
      leave_photo: leavePhoto,
    } = saveReceiptSchema.create(req.body)

    await validateReceiptIntegrity({ payerId, amount, debts: debtsWithoutReceiptId }, req.user.id)

    const photo = optional(photoSchema).create(req.file)

    if (leavePhoto && (photo || !id)) {
      throw new ApiError({
        code: 'LEAVE_PHOTO_CONFLICT',
        status: 400,
        message: 'Cannot leave photo and upload a new one at the same time or when creating a new receipt',
      })
    }

    const photoFilename = photo ? generateRandomPhotoFilename(photo.mimetype) : undefined

    /** @type {import('./types').Receipt} */
    let receipt
    if (id) {
      receipt = /** @type {import('./types').Receipt} */ (await receiptsStorage.findById(id))
      if (!receipt) {
        throw new NotFoundError()
      }

      if (receipt.photoFilename && (photo || !leavePhoto)) {
        await deletePhoto(receipt.photoFilename)
      }

      receipt = await receiptsStorage.update({
        id,
        payerId,
        amount,
        description,
        photoFilename: leavePhoto ? receipt.photoFilename : photoFilename,
      })

      await debtsStorage.deleteByReceiptId(id)
    } else {
      receipt = await receiptsStorage.create({
        payerId,
        amount,
        description,
        photoFilename,
        createdAt: new Date(),
      })
    }

    const debts = debtsWithoutReceiptId.map(debt => ({
      receiptId: receipt.id,
      debtorId: debt.debtorId,
      amount: debt.amount,
    }))

    await debtsStorage.store(debts)

    if (photo && photoFilename) {
      await savePhoto(photoFilename, photo)
    }

    await sendReceiptSavedNotification({
      action: id ? 'update' : 'create',
      editorId: req.user.id,
      receipt,
      debts,
    })

    res.json(formatReceipt(receipt, debts))
  })

  router.get('/receipts', async (req, res) => {
    const { limit, offset } = paginationToLimitOffset(paginationSchema.create(req.query))

    const { items, total } = await receiptsStorage.find({ participantUserIds: [req.user.id], limit, offset })
    const debts = items.length > 0
      ? await debtsStorage.find({
        receiptIds: items.map(r => r.id),
        limit: items.length * MAX_DEBTS_PER_RECEIPT,
      })
      : []

    res.json({
      items: items.map((receipt) => formatReceipt(receipt, debts)),
      total,
    })
  })

  router.get('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    const { items: [receipt] } = await receiptsStorage.find({
      ids: [receiptId],
      participantUserIds: [req.user.id],
      limit: 1,
    })

    if (!receipt) {
      throw new NotFoundError()
    }

    const debts = await debtsStorage.find({ receiptIds: [receiptId], limit: MAX_DEBTS_PER_RECEIPT })

    res.json(formatReceipt(receipt, debts))
  })

  router.delete('/receipts/:receiptId', async (req, res) => {
    const receiptId = req.params.receiptId
    const { items: [receipt] } = await receiptsStorage.find({
      ids: [receiptId],
      participantUserIds: [req.user.id],
      limit: 1,
    })

    if (!receipt) {
      throw new NotFoundError()
    }

    const debts = await debtsStorage.find({ receiptIds: [receiptId], limit: MAX_DEBTS_PER_RECEIPT })

    if (receipt.photoFilename) {
      await deletePhoto(receipt.photoFilename)
    }

    await debtsStorage.deleteByReceiptId(receiptId)
    await receiptsStorage.deleteById(receiptId)

    await sendReceiptDeletedNotification({
      editorId: req.user.id,
      receipt,
      debts,
    })

    res.sendStatus(204)
  })

  if (!env.USE_TEST_MODE) {
    router.use(createRateLimiterMiddleware({
      keyPrefix: 'scan',
      points: 100,
      durationMs: DAY_MS,
      calculatePoints: async (userId) => {
        const { items: [oldestReceipt] } = await receiptsStorage.find({
          participantUserIds: [userId],
          ascending: true,
          limit: 1,
        })

        const createdAt = oldestReceipt ? oldestReceipt.createdAt.getTime() : Date.now()
        const diff = Date.now() - createdAt

        if (diff >= 4 * WEEK_MS) return 1 // 100 per day
        if (diff >= 2 * WEEK_MS) return 2 // 50 per day
        if (diff >= WEEK_MS) return 4 // 25 per day
        return 25 // 4 per day
      }
    }))
  }

  router.post('/receipts/scan', upload.single('photo'), async (req, res) => {
    if (req.file && req.file.size > MAX_FILE_SIZE_BYTES) { // 300 kb
      throw new ApiError({
        code: 'PHOTO_TOO_LARGE',
        status: 413,
        message: 'Receipt photo is too large',
      })
    }

    const photo = photoSchema.create(req.file)

    try {
      const amounts = await scan(photo)
      res.json(amounts)
    } catch (err) {
      logger.warn({ err }, 'Could not scan photo')
      throw new ApiError({
        code: 'SCAN_FAILED',
        status: 502,
        message: 'Could not scan photo',
      })
    }
  })

  return router
}

/**
 * @param {import('./types').Receipt} receipt
 * @param {import('../debts/types').Debt[]} debts
 * @returns {import('./types').ReceiptWithDebts}
 */
function formatReceipt(receipt, debts) {
  return {
    id: receipt.id,
    createdAt: receipt.createdAt,
    payerId: receipt.payerId,
    amount: receipt.amount,
    description: receipt.description,
    photoFilename: receipt.photoFilename,
    debts: debts
      .filter(debt => debt.receiptId === receipt.id)
      .map(debt => ({
        debtorId: debt.debtorId,
        amount: debt.amount,
      }))
  }
}
