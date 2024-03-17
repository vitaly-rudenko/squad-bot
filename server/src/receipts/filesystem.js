import fs from 'fs/promises'
import path from 'path'
import { customAlphabet } from 'nanoid'
import { alphanumeric } from 'nanoid-dictionary'
import { AlreadyExistsError } from '../common/errors.js'

const generatePhotoId = customAlphabet(alphanumeric, 16)

/** @param {'image/jpeg' | 'image/png'} mimetype */
export function generateRandomPhotoFilename(mimetype) {
  return `${generatePhotoId()}.${mimetype === 'image/jpeg' ? 'jpg' : 'png'}`
}

/**
 * @param {string} photoFilename
 * @param {import('./types').Photo} photo
 */
export async function savePhoto(photoFilename, photo) {
  try {
    await fs.writeFile(getPhotoPath(photoFilename), photo.buffer)
    return photoFilename
  } catch (error) {
    // TODO: test
    if (error.code === 'EEXIST') {
      throw new AlreadyExistsError()
    }

    throw error
  }
}

/** @param {string} photoFilename */
export async function deletePhoto(photoFilename) {
  try {
    await fs.unlink(getPhotoPath(photoFilename))
  } catch (error) {
    // TODO: test
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

/** @param {string} [photoFilename] */
export function getPhotoPath(photoFilename) {
  if (!photoFilename) throw new Error('Photo filename is required')
  return path.resolve('files', 'photos', photoFilename)
}
