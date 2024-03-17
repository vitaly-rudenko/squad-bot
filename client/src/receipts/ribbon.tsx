import { cn } from '@/utils/cn'
import type { FC, ReactNode } from 'react'

export const Ribbon: FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => {
  return <div className={cn('flex flex-row gap-2 overflow-x-auto gradient-mask-r-80 pr-14 hide-scrollbar', className)}>
    {children}
  </div>
}
