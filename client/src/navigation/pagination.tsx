import { Pagination as PaginationRoot, PaginationContent, PaginationItem, PaginationLink } from '@/components/pagination'
import { cn } from '@/utils/cn'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Pagination: FC<{
  totalPages: number
  page: number
  setPage: (page: number) => void
  hideByDefault?: true
}> = ({ page, setPage, totalPages, hideByDefault }) => {
  const { t } = useTranslation('navigation')

  const [wasPageChanged, setWasPageChanged] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [page])

  const suggestions = (
    page === 1 ? [1, 2, 3]
      : page === totalPages ? [totalPages - 2, totalPages - 1, totalPages]
      : [page - 1, page, page + 1]
  ).filter(s => s >= 1 && s <= totalPages)

  useEffect(() => {
    if (page !== 1) {
      setWasPageChanged(true)
    }
  }, [page])

  if (totalPages === 1 || (hideByDefault && !wasPageChanged)) return null

  return <PaginationRoot>
    <PaginationContent>
      <PaginationItem className={cn(page === 1 && 'text-primary/70')}>
        <PaginationLink className='flex flex-row gap-2 w-auto' onClick={() => setPage(1)}>
          <ChevronsLeft className='w-4 h-4 shrink-0' />
          <span>{t('First')}</span>
        </PaginationLink>
      </PaginationItem>
      {suggestions.map(suggestion => (
        <PaginationItem key={suggestion}>
          <PaginationLink key={suggestion} isActive={page === suggestion} onClick={() => setPage(suggestion)}>{suggestion}</PaginationLink>
        </PaginationItem>
      ))}
      <PaginationItem className={cn(page === totalPages && 'text-primary/70')}>
        <PaginationLink className='flex flex-row gap-2 w-auto' onClick={() => setPage(totalPages)}>
          <span>{t('Last')}</span>
          <ChevronsRight className='w-4 h-4 shrink-0' />
        </PaginationLink>
      </PaginationItem>
    </PaginationContent>
  </PaginationRoot>
}