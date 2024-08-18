// Inspired by https://github.com/podaboutlist/linkfix-for-discord
/** @param {string} url */
export function fixSocialLinkUrl(url) {
  const parsedUrl = new URL(url)

  // Instagram
  if (['instagram.com', 'www.instagram.com'].some(h => parsedUrl.hostname === h)
    && ['/p/', '/reel/', '/stories/'].some(p => parsedUrl.pathname.startsWith(p))) {
    parsedUrl.hostname = 'ddinstagram.com'
    parsedUrl.search = ''
    return parsedUrl.toString()
  }

  // Twitter
  if (['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].some(h => parsedUrl.hostname === h)
    && parsedUrl.pathname.includes('/status/')) {
    parsedUrl.hostname = 'fxtwitter.com'
    parsedUrl.search = ''
    return parsedUrl.toString()
  }

  // Reddit
  if (['reddit.com', 'www.reddit.com'].some(h => parsedUrl.hostname === h)
    && (/^\/r\/\w+\/s\/\w+\/?$/.test(parsedUrl.pathname)
     || /^\/r\/\w+\/comments\/\w+(\/\w+)?\/?$/.test(parsedUrl.pathname))) {
    parsedUrl.hostname = 'vxreddit.com'
    parsedUrl.search = ''
    return parsedUrl.toString()
  }

  return undefined
}
