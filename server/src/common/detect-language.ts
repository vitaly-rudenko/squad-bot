import { spawn } from 'node:child_process'

export async function detectLanguage(input: {
  inputPath: string
  modelPath: string
}): Promise<{ language: string | undefined }> {
  return new Promise((resolve, _reject) => {
    let language: string | undefined

    const child = spawn(
      'whisper-cli',
      [
        //
        ['-f', input.inputPath],
        ['-m', input.modelPath],
        '-dl',
      ].flat(),
    )

    child.stderr.on('data', (chunk: Buffer) => {
      const match = chunk.toString('utf-8').match(/auto-detected language: (\w+)/)
      if (match) {
        language = match[1]
      }
    })

    child.on('error', (...args) => {
      console.log('error', args)
    })

    child.once('close', () => {
      resolve({ language })
    })

    // TODO: error handling / reject
  })
}
