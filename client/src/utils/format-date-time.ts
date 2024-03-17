export function formatDateTime(date: Date, options?: { expand?: boolean }) {
  if (options?.expand) {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: "numeric",
    month: "short",
  }).format(date)
}