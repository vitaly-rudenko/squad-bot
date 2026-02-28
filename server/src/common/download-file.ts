import { createWriteStream } from 'fs'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'

export async function downloadFile(input: { url: URL; path: string }) {
  const response = await fetch(input.url)
  if (String(response.status)[0] !== '2') {
    throw new Error(`Failed to download file due to invalid status code: ${response.status} (url: ${input.url})`)
  }
  if (!response.body) {
    throw new Error(`Failed to download file due to empty response body (url: ${input.url})`)
  }

  const file = Readable.from(response.body)
  const writeStream = createWriteStream(input.path)
  file.pipe(writeStream)

  await Promise.all([
    //
    finished(file, { cleanup: true }),
    finished(writeStream, { cleanup: true }),
  ])
}
