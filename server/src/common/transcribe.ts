import * as fs from 'node:fs'
import OpenAI from 'openai'

export async function transcribe3(input: {
  inputPath: string
  apiKey: string
}): Promise<{ text: string; durationMs: number }> {
  const startedAt = Date.now()

  const openai = new OpenAI({ apiKey: input.apiKey })

  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(input.inputPath),
    model: 'gpt-4o-transcribe',
    response_format: 'text',
  })

  return { text: String(response), durationMs: Date.now() - startedAt }
}
