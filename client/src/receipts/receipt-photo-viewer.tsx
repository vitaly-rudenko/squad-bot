import { Button } from '@/components/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/dialog'
import { Spinner } from '@/components/spinner'
import { cn } from '@/utils/cn'
import { RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { ElementRef, FC, useCallback, useEffect, useState } from 'react'

export const ReceiptPhotoViewer: FC<{
  open: boolean
  photoSrc?: string
  onClose: (rotation: number) => unknown
  onDelete?: () => unknown
  onReplace?: () => unknown
}> = ({ open, photoSrc, onClose, onDelete, onReplace }) => {
  const [img, setImg] = useState<ElementRef<'img'> | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [zoom, setZoom] = useState(0)
  const [totalRotation, setTotalRotation] = useState(0)
  const rotation = (totalRotation % 360 + 360) % 360

  const rotate = useCallback((degrees: number) => {
    setTotalRotation(totalRotation + degrees)
  }, [totalRotation])

  useEffect(() => {
    setLoaded(false)
    setZoom(0)
    setTotalRotation(0)
  }, [img])

  const handleClose = useCallback(() => {
    onClose(rotation)
  }, [onClose, rotation])

  return <Dialog open={open} onOpenChange={() => handleClose()}>
    <DialogContent className='flex flex-col p-3 max-h-[80vh] min-h-32'>
      {!loaded && <div className='absolute top-0 left-0 w-full h-full flex flex-row justify-center items-center'>
        <Spinner />
      </div>}

      <div
        className={cn(
          'overflow-auto hide-scrollbar animation-appear rounded-md transition-all duration-500 max-h-[80vh] border border-secondary',
          rotation % 180 !== 0 && 'max-h-[calc(100vw-1.75rem)]',
          !loaded && 'collapse',
        )}
        style={{ transform: `rotate(${totalRotation}deg)` }}>
        {!!photoSrc && (
          <img
            className={cn(
              'transition-[width] duration-500 max-w-none w-[100%]',
              zoom === 1 && 'w-[150%]',
              zoom === 2 && 'w-[200%]',
            )}
            ref={ref => setImg(ref)}
            onLoad={() => setLoaded(true)}
            src={photoSrc}
          />
        )}
      </div>

      {!!loaded && <>
        <div className='backdrop-blur flex flex-col z-3 absolute top-5 right-5 text-white bg-black/30 rounded-md opacity-70 animation-appear'>
          <Button variant='ghost' size='icon' onClick={() => rotate(90)}>
            <RotateCw />
          </Button>
          <Button variant='ghost' size='icon' onClick={() => setZoom((zoom + 1) % 3)}>
            {zoom === 2 ? <ZoomOut /> : <ZoomIn />}
          </Button>
          {(zoom !== 0 || rotation !== 0) && (
            <Button variant='ghost' size='icon' onClick={() => {
              setZoom(0)
              setTotalRotation(totalRotation - rotation)
            }}>
              <X />
            </Button>
          )}
        </div>

        <DialogFooter className='z-2 animation-appear'>
          {!!onReplace && <Button variant='secondary' onClick={onReplace}>Replace</Button>}
          {!!onDelete && <Button variant='destructive' onClick={onDelete}>Delete</Button>}
          <Button variant='default' className='w-20' onClick={handleClose}>Close</Button>
        </DialogFooter>
      </>}
    </DialogContent>
  </Dialog>
}