import { User } from "@/users/types";
import { UserName } from "@/users/user-name";
import { cn } from "@/utils/cn";
import { formatAmount } from "@/utils/format-amount";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export const MiniReceiptHeader: FC<{
  payer: User
  amount: number
  description: string
  onEdit: () => void
}> = ({ payer, amount, description, onEdit }) => {
  const { t } = useTranslation('receipt-editor')

  return <div className="border rounded-md m-1 pr-20 overflow-hidden">
    <div className="h-full w-full cursor-pointer flex flex-col pl-3 py-3" onClick={onEdit}>
      <div className="flex flex-row gap-2">
        <div className="font-medium">{formatAmount(amount, 'UAH')}</div>
        <div className='flex flex-row gap-1 items-baseline overflow-hidden whitespace-nowrap'>
          <span>{t('Paid by')}</span>
          <span className='overflow-hidden font-medium'><UserName user={payer} /></span>
        </div>
      </div>

      <div className={cn("whitespace-nowrap truncate text-primary/70")}>
        {description || t('(no description)')}
      </div>
    </div>
  </div >
}
