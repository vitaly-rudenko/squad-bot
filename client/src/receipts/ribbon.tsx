import { cn } from '@/utils/cn'
import type { FC, ReactNode } from 'react'
import { useRef, useEffect } from 'react'

export const Ribbon: FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const handleWheel = (event: WheelEvent) => {
      if (event.shiftKey) return // Holding Shift already scrolls horizontally
      event.preventDefault() // Prevents the whole page from being scrolled vertically

      scrollContainer.scrollTo({ left: scrollContainer.scrollLeft + event.deltaY })
    }

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false }) // "passive" allows event.preventDefault() to be used
    return () => scrollContainer.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex flex-row gap-2 overflow-x-auto gradient-mask-r-80 pr-14 hide-scrollbar scroll-smooth', 
        className
      )}>
      {children}
    </div>
  )
}
