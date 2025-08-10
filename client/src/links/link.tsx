import { FC, useState } from 'react'
import { Link as LinkType } from './types'
import { Card, CardHeader, CardFooter } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/utils/cn'
import { Separator } from '@/components/separator'
import { Button } from '@/components/button'
import { Link2 } from 'lucide-react'

export const Link: FC<{
  link: LinkType
  onEdit: () => unknown
  onDelete: () => unknown
}> = ({ link, onEdit, onDelete }) => {
  const [activated, setActivated] = useState(false)

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  return <Card className={cn(
    'overflow-hidden transition hover:shadow-lg',
    activated ? 'shadow-lg' : 'shadow-md',
  )}>
    <div className={cn('flex flex-col grow', !activated && 'cursor-pointer')} onClick={() => setActivated(!activated)}>
      {/* Header */}
      <CardHeader>
        <div className='flex flex-col gap-2'>
          <div className='overflow-hidden flex flex-row gap-1.5 items-baseline'>
            <span className='font-medium break-all'>{link.label}</span>
          </div>

          <Separator />

          <div className='flex flex-row items-baseline gap-1.5'>
            <Link2 className='w-4 h-4 self-center shrink-0' />
            <span className='text-primary/70'>{getDomainFromUrl(link.url)}</span>
          </div>
        </div>
      </CardHeader>
    </div>

    {/* Action buttons */}
    <div className={cn(
      'transition-[height]',
      activated ? 'h-10' : 'h-0'
    )}>
      <Separator />
      <CardFooter className='flex flex-row items-stretch p-0 h-full'>
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' onClick={handleLinkClick}>
          Open
        </Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' onClick={onEdit}>
          Edit
        </Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2 text-destructive' variant='link' onClick={onDelete}>
          Delete
        </Button>
      </CardFooter>
    </div>
  </Card>
}

export const LinkSkeleton: FC = () => {
  return <Skeleton className='h-[7rem] animation-appear' />
}
