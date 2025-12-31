import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { User } from "@/users/types";
import { UserName } from "@/users/user-name";
import { cn } from "@/utils/cn";
import { formatAmount } from "@/utils/format-amount";
import { Image, ImageOff } from "lucide-react";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";

export const MiniReceiptHeader: FC<{
  payer: User
  amount: number
  photoSrc: string | undefined
  onEdit: () => void
  onPhotoInteraction: () => void
}> = ({ payer, amount, photoSrc, onEdit, onPhotoInteraction }) => {
  const { t } = useTranslation('receipt-editor')
  const [photoPreviewLoaded, setPhotoPreviewLoaded] = useState(false)

  return <div className="flex flex-row gap-3 py-1 h-14 items-center border rounded-md m-1">
    <div className="pl-3 flex flex-row gap-2 items-center grow cursor-pointer h-full overflow-hidden"
      onClick={onEdit}>
      <div><span className="font-medium">{formatAmount(amount, 'UAH')}</span></div>
      <div className='flex flex-row gap-1 items-baseline overflow-hidden whitespace-nowrap'>
        <span>{t('Paid by')}</span>
        <span className='overflow-hidden font-medium'><UserName user={payer} /></span>
      </div>
    </div>
    <div className="mr-1 grow min-w-12 h-full">
      <Button
        size='icon' variant={photoSrc ? 'default' : 'outline'}
        className={cn(
          'p-0.5 w-full h-full overflow-hidden',
          photoSrc && 'hover:bg-primary',
        )}
        onClick={onPhotoInteraction}>
        {photoSrc ? <>
          {!photoPreviewLoaded && (photoSrc ? <Spinner invert /> : <Image />)}
          {!!photoSrc && (
            <img
              className={cn('animation-appear w-full h-full rounded-sm object-cover', !photoPreviewLoaded && 'hidden')}
              onLoad={() => setPhotoPreviewLoaded(true)} src={photoSrc} />
          )}
        </> : <ImageOff />}
      </Button>
    </div>
  </div >
}
