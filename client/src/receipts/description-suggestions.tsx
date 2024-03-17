import { Badge } from '@/components/badge'
import { Ribbon } from './ribbon'
import { isDefined } from '@/utils/is-defined'
import { type FC, useMemo } from 'react'
import { useReceiptsQuery } from './api'
import { parseDescription } from './utils'

const MAX_DESCRIPTION_SUGGESTIONS = 25

export const DescriptionSuggestions: FC<{
  description: string
  setDescription: (description: string) => unknown
}> = ({ description, setDescription }) => {
  const { data: receipts } = useReceiptsQuery({ page: 1, perPage: 100 })
  const descriptionSuggestions = useMemo(() => {
    if (!receipts) return []

    const suggestions = receipts.items
      .map(r => parseDescription(r.description))
      .filter(pd => !pd.isTip)
      .map(pd => pd.description?.trim())
      .filter(isDefined)

    const suggestionMap = new Map()
    for (const [i, suggestion] of suggestions.entries()) {
      const entry = suggestionMap.get(suggestion)
      if (entry) {
        entry.count++
      } else {
        suggestionMap.set(suggestion, { i, count: 1 })
      }
    }

    return [...suggestionMap.entries()]
      .sort((a, b) => a[1].i - b[1].i)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([suggestion]) => suggestion)
      .slice(0, MAX_DESCRIPTION_SUGGESTIONS)
  }, [receipts])

  return <Ribbon>
    {descriptionSuggestions.map((suggestion, i) => (
      <Badge key={i}
        className='cursor-pointer grow justify-center animation-down-top h-7 px-4'
        variant={description === suggestion ? 'default' : 'secondary'}
        onClick={() => setDescription(description === suggestion ? '' : suggestion)}>
        <span className='truncate max-w-32'>{suggestion}</span>
      </Badge>
    ))}
  </Ribbon>
}