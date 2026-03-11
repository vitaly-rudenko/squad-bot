export function splitIntoParagraphs(text: string, targetLength = 800): string {
  const sentences = text.split('. ')
  if (sentences.length <= 1) return text

  const paragraphs: string[] = []
  let current = ''

  for (let i = 0; i < sentences.length; i++) {
    current += sentences[i]
    if (i < sentences.length - 1) {
      current += '.'
      if (current.length >= targetLength) {
        paragraphs.push(current.trim())
        current = ''
      } else {
        current += ' '
      }
    }
  }

  if (current.trim()) {
    paragraphs.push(current.trim())
  }

  return paragraphs.join('\n\n')
}
