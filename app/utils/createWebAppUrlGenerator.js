/**
 * @param {{ botUsername: string; webAppName: string }} input
 * @returns {import('./types').GenerateWebAppUrl}
 */
export function createWebAppUrlGenerator({ botUsername, webAppName }) {
  return (command) => {
    const query = command ? `?startapp=${command}` : ''
    return `https://t.me/${botUsername}/${webAppName}${query}`
  }
}