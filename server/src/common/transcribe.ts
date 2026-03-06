import { spawn } from 'node:child_process'

export type Part = {
  text: string
  startsAt: number
  endsAt: number
}

export async function transcribe(input: {
  inputPath: string
  modelPath: string
  parallelize: boolean
  onPart: (part: Part, parts: Part[]) => void
}): Promise<{ parts: Part[]; durationMs: number }> {
  return new Promise((resolve, _reject) => {
    let parts: Part[] = []
    let startedAt = Date.now()
    let done = false

    const child = spawn(
      'python3',
      ['/app/transcribe.py', input.modelPath, input.inputPath, String(input.parallelize ? 2 : 1)],
    )

    child.stdout.on('data', async (chunk: Buffer) => {
      if (done) throw new Error('Whisper process is closed, but stdout was received')

      const lines = chunk.toString('utf-8').split('\n')

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const match = trimmed.match(/^\[(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)$/)
        if (!match) {
          console.warn('Line not matching transcription format:', trimmed)
          continue
        }

        const text = match[3].trim()
        if (!text) continue

        const part: Part = {
          text,
          startsAt: parseTimestamp(match[1]),
          endsAt: parseTimestamp(match[2]),
        }

        parts.push(part)
        input.onPart(part, [...parts])
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      console.log('stderr', chunk.toString('utf-8'))
    })

    child.on('error', (...args) => {
      console.log('error', args)
    })

    child.once('close', async () => {
      done = true
      resolve({ parts, durationMs: Date.now() - startedAt })
    })

    // TODO: error handling / reject
  })
}

function parseTimestamp(ts: string): number {
  const [h, m, s] = ts.split(':')
  return (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000
}
