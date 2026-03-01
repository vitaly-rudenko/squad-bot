import { exec } from 'node:child_process'

export async function oggToWav(input: { inputPath: string; outputPath: string }) {
  await new Promise<void>((resolve, reject) => {
    exec(
      `ffmpeg \
       -i "${input.inputPath}" \
       -ar 16000 \
       -ac 1 \
       -c:a pcm_s16le \
       "${input.outputPath}"`,
      err => (err ? reject(err) : resolve()),
    )
  })
}
