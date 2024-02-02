export function createWebAppUrlGenerator({ botUsername, webAppName }) {
  return ({ command }) => {
    return `https://t.me/${botUsername}/${webAppName}${command ? `?startapp=${command}` : ''}`
  }
}