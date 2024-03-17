import { API_URL } from '@/utils/api'

export function getReceiptPhotoUrl(photoFilename: string): string {
  return `${API_URL}/photos/${photoFilename}`
}
