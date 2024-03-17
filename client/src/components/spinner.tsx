import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

const Spinner = ({ className, invert }: { className?: string; invert?: boolean }) => {
  return (
    <Loader2
      className={cn(
        'h-8 w-8 animate-spin',
        invert ? 'stroke-secondary/70' : 'stroke-primary/70',
        className
      )}
    />
  )
}

const SpinnerArea = () => {
  return <div className='w-full h-full min-h-96 flex items-center justify-center'>
    <Spinner />
  </div>
}

export { Spinner, SpinnerArea }