import fs from 'fs'
import path from 'path'

const packageJsonPath = path.join(process.cwd(), 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf-8' }))

export function versionCommand() {
  return async (context) => {
    await context.reply([
      `Version: ${packageJson.version}`,
      `Bot ID: ${context.botInfo.id}`,
      `User ID: ${context.from.id}`,
      `Chat ID: ${context.chat.id} (${context.chat.type})`,
    ].join('\n'))
  }
}
