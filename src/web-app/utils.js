/** @param {import('../types.js').Deps<'botInfo' | 'webAppName'>} deps */
export function createWebAppUrlGenerator({ botInfo, webAppName }) {
  /** @param {string} [command] */
  return (command) => {
    const query = command ? `?startapp=${command}` : ''
    return `https://t.me/${botInfo.username}/${webAppName}${query}`
  }
}

/**
 * @param {{
 *   toUserId: string
 *   amount: number
 * }} input
 */
export function generatePayCommand({ toUserId, amount }) {
  return `pay-${toUserId}-${amount}`
}
