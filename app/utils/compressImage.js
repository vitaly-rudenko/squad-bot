import sharp from 'sharp'
import heicConvert from 'heic-convert'

export async function compressImage(input) {
  try {
    return await sharp(input)
      .sharpen({ sigma: 0.5 })
      .resize({
        width: 1024,
        height: 1024,
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFormat('jpeg', { mozjpeg: true })
      .toBuffer()
  } catch (error) {
    if (error.message.includes('heif: Unsupported feature: Unsupported codec')) {
      const convertedInput = await heicConvert({
        buffer: input,
        format: 'PNG',
        quality: 1,
      })

      return compressImage(convertedInput)
    }

    throw error
  }
}
