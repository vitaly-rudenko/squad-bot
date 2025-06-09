export function formatDateTime(date: Date, options?: { expand?: boolean; language?: string }) {
  const locale = options?.language === 'uk' ? 'uk-UA' : 'en-GB'

  if (options?.expand) {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date)
}