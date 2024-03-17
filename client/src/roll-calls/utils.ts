export const optionalTitle = '[ {title:text}]'

export function parseMessagePattern(messagePattern: string) {
  if (messagePattern.endsWith(optionalTitle)) {
    return messagePattern.slice(0, -optionalTitle.length)
  }

  return messagePattern
}
