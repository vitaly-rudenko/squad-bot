export function createWebAppUrlGenerator({ botUsername, webAppName }) {
  return (...commands) => {
    const query = commands.length > 0 ? `?startapp=${commands.join('__')}` : ''
    return `https://t.me/${botUsername}/${webAppName}${query}`
  }
}