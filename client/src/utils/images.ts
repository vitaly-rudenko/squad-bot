import type Jimp from 'jimp'

export async function processImages(
  images: File[],
  onProgress?: (stage: { index: number, stage: 'converting' | 'compressing' } | 'combining' | 'compressing') => unknown
): Promise<File> {
  const results: File[] = []

  for (const [index, image] of images.entries()) {
    let result = image

    if (result.type === 'image/heic') {
      onProgress?.({ index, stage: 'converting' })
      result = await convertHeicToJpeg(result)
    }

    onProgress?.({ index, stage: 'compressing' })
    result = await compressImage(result)

    results.push(result)
  }

  if (results.length === 1) {
    return results[0]
  }

  onProgress?.('combining')
  const combined = await combineImages(results)

  onProgress?.('compressing')
  return compressImage(combined, true)
}

export async function rotateImage(
  image: File,
  rotation: number,
  onProgress?: (stage: 'reading' | 'rotating' | 'compressing') => unknown
): Promise<File> {
  await import('jimp/browser/lib/jimp')

  onProgress?.('reading')
  const jimp = await window.Jimp.read(await image.arrayBuffer() as Buffer)

  onProgress?.('rotating')
  const buffer = await jimp
    .rotate(rotation === 90 ? 270 : rotation === 270 ? 90 : rotation)
    .quality(100)
    .getBufferAsync(window.Jimp.MIME_JPEG)

  onProgress?.('compressing')
  return compressImage(fileFromBuffer(buffer))
}

async function convertHeicToJpeg(image: File) {
  const { default: runConvertHeic } = await import('heic-convert/browser')

  const buffer = await runConvertHeic({
    buffer: new Uint8Array(await image.arrayBuffer()),
    format: 'JPEG',
    quality: 1,
  })

  return fileFromBuffer(buffer)
}

async function compressImage(image: File, doubleSize: boolean = false): Promise<File> {
  const { default: runCompressImage } = await import('browser-image-compression')

  return runCompressImage(image, {
    fileType: 'image/jpeg',
    maxWidthOrHeight: doubleSize ? 2560 : 1920,
    maxSizeMB: doubleSize ? 0.385 : 0.285,
  })
}

async function combineImages(images: File[]): Promise<File> {
  await import('jimp/browser/lib/jimp')

  const jimps: Jimp[] = []
  for (const image of images) {
    const compressed = await compressImage(image)
    const buffer = await compressed.arrayBuffer()
    jimps.push(await window.Jimp.read(buffer as Buffer))
  }

  const combinedJimp = new window.Jimp(
    jimps.reduce((acc, curr) => acc + curr.getWidth(), 0),
    jimps.reduce((acc, curr) => Math.max(acc, curr.getHeight()), 0),
  )

  let x = 0
  for (const jimp of jimps) {
    combinedJimp.composite(jimp, x, 0)
    x += jimp.getWidth()
  }

  const buffer = await combinedJimp.getBufferAsync(window.Jimp.MIME_JPEG)

  return fileFromBuffer(buffer)
}

function fileFromBuffer(buffer: ArrayBufferLike) {
  return new File(
    [new Blob([buffer], { type: 'image/jpeg' })],
    'image.jpeg',
    { type: 'image/jpeg' }
  )
}
