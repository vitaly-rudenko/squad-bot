import { cn } from '@/utils/cn'
import type { FC, ReactNode } from 'react'
import { useRef, useEffect, useState, useMemo } from 'react'

export const Ribbon: FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasMoreLeftPx, setHasMoreLeftPx] = useState(0)
  const [hasMoreRightPx, setHasMoreRightPx] = useState(0)

  const updateScrollStates = () => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    setHasMoreLeftPx(scrollContainer.scrollLeft)
    setHasMoreRightPx(scrollContainer.scrollWidth - scrollContainer.clientWidth - scrollContainer.scrollLeft)
  }

  useEffect(() => {
    updateScrollStates()
  }, [children, scrollRef])

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const handleScroll = () => updateScrollStates()
    const handleWheel = (event: WheelEvent) => {
      if (event.shiftKey) return // Holding Shift already scrolls horizontally
      event.preventDefault() // Prevents the whole page from being scrolled vertically

      scrollContainer.scrollTo({ left: scrollContainer.scrollLeft + event.deltaY })
    }

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false }) // "passive" allows event.preventDefault() to be used
    scrollContainer.addEventListener('scroll', handleScroll)

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel)
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const gradientLeft = useMemo(() => Math.min(1, hasMoreLeftPx / 25) * 5, [hasMoreLeftPx])
  const gradientRight = useMemo(() => 95 + Math.max(0, 1 - hasMoreRightPx / 25) * 5, [hasMoreRightPx])

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex flex-row gap-2 overflow-x-auto hide-scrollbar scroll-smooth',
        className
      )}
      style={{
        maskImage: `
          linear-gradient(to right,
            transparent 0%,
            rgba(0, 0, 0, 1.0) ${gradientLeft}%,
            rgba(0, 0, 0, 1.0) ${gradientRight}%,
            transparent 100%
          )
        `
      }}>
      {children}
    </div>
  )
}
