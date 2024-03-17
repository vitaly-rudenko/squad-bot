import { isDefined } from '@/utils/is-defined'

const tipMarkers = ['🍵', 'tip', '(tip)', 'чай', '(чай)', 'чаевые', '(чаевые)', 'чайові', '(чайові)']

export function parseDescription(input?: string | undefined): { description: string | undefined; isTip: boolean } {
  if (!input) {
    return {
      isTip: false,
      description: undefined,
    }
  }

  const lowercased = input.toLowerCase()
  const tipMarker = tipMarkers.find(m => lowercased.startsWith(m) || lowercased.endsWith(m))
  const isTip = isDefined(tipMarker)

  return isTip ? {
    isTip: true,
    description: (
      lowercased.startsWith(tipMarker)
        ? input.slice(tipMarker.length)
        : input.slice(0, -tipMarker.length)
    ).trim() || undefined,
  } : {
    isTip: false,
    description: input,
  }
}
