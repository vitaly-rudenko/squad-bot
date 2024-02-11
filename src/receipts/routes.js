import fs from 'fs/promises'
import multer from 'multer'
import Router from 'express-promise-router'
import { NotFoundError } from '../common/errors.js'
import { ApiError } from '../common/errors.js'
import { registry } from '../registry.js'
import { sendReceiptDeletedNotification, sendReceiptSavedNotification } from './notifications.js'
import { photoSchema, saveReceiptSchema } from './schemas.js'
import { optional, refine, size, string } from 'superstruct'
import { deletePhoto, generateRandomPhotoFilename, savePhoto } from './filesystem.js'
import path from 'path'

export function createReceiptsRouter() {
  const {
    debtsStorage,
    receiptsStorage,
  } = registry.export()

  const router = Router()
  const upload = multer({
    limits: {
      fileSize: 300_000, // 300 kb
    },
  })

  // TODO: update debts in the same transaction as the receipt
  // TODO: handle photos as streams, perhaps in a separate endpoint
  // TODO: split into POST / PATCH?
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
      debts: debtsWithoutReceiptId,
      leave_photo: leavePhoto,
    } = saveReceiptSchema.create(req.body)

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

      await receiptsStorage.update({
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
    })

    res.json(formatReceipt(receipt, debts))
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

    if (receipt.photoFilename) {
      await deletePhoto(receipt.photoFilename)
    }

    await debtsStorage.deleteByReceiptId(receiptId)
    await receiptsStorage.deleteById(receiptId)

    await sendReceiptDeletedNotification({ editorId: req.user.id, receipt })

    res.sendStatus(204)
  })

  return router
}

export function createPublicReceiptsRouter() {
  const router = Router()

  const photoFilenameRegex = /^[a-zA-Z0-9]{8,32}\.(jpg|png)$/
  const photoFilenameSchema = refine(size(string(), 8, 64), 'photoFilename', (value) => photoFilenameRegex.test(value))

  router.get('/photos/:photoFilename', async (req, res) => {
    let photoPath
    try {
      photoPath = path.resolve('files', 'photos', photoFilenameSchema.create(req.params.photoFilename))
    } catch (error) {
      throw new NotFoundError()
    }

    try {
      await fs.access(photoPath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundError()
      }

      throw error
    }

    // TODO: maybe file access check can be moved here?
    res
      .contentType(photoPath.endsWith('.jpg') ? 'image/jpeg' : 'image/png')
      .sendFile(photoPath)
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
    photoFilename: receipt.photoFilename,
    debts: debts
      .filter(debt => debt.receiptId === receipt.id)
      .map(debt => ({
        debtorId: debt.debtorId,
        amount: debt.amount,
      }))
  }
}
