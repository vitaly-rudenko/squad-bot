import { exec } from 'node:child_process'

export async function oggToWav(input: { inputPath: string; outputPath: string; speed: number }) {
  await new Promise<void>((resolve, reject) => {
    exec(
      `ffmpeg \
       -i "${input.inputPath}" \
       -ar 16000 \
       -ac 1 \
       ${input.speed !== 1 ? `-af "atempo=${input.speed}"` : ''} \
       -c:a pcm_s16le \
       "${input.outputPath}"`,
      err => (err ? reject(err) : resolve()),
    )
  })
}
