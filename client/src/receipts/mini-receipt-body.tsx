import { User } from "@/users/types";
import { UserName } from "@/users/user-name";
import { formatAmount } from "@/utils/format-amount";
import { FC } from "react";
import { Debt } from "./calculate-receipt";

export const MiniReceiptBody: FC<{
  users: User[]
  debts: Debt[]
  onEdit: () => void
}> = ({ users, debts, onEdit }) => {
  return <div className='flex flex-col gap-1 border rounded-md m-1 p-3 cursor-pointer'
    onClick={onEdit}>
    {debts.map(({ total, debtorId }) => (
      <div key={debtorId} className='flex flex-row gap-2 items-baseline'>
        <div className='overflow-hidden'><UserName user={users.find(u => u.id === debtorId)} /></div>
        <div className='border-b border-input border-dashed grow min-w-5'></div>
        <div className='whitespace-nowrap'>{formatAmount(total)}</div>
      </div>
    ))}
  </div>
}
