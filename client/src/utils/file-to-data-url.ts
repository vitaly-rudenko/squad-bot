export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.addEventListener('error', reject)
    fileReader.addEventListener('load', () => {
      if (typeof fileReader.result === 'string') {
        resolve(fileReader.result)
      } else {
        reject(new Error(`Invalid data URL: ${fileReader.result}`))
      }
    })

    fileReader.readAsDataURL(file)
  })
}