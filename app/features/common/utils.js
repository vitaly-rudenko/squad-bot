import path from 'path'
import fs from 'fs'

/** @returns {string} */
export function getAppVersion() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf-8' }))
    return packageJson?.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
