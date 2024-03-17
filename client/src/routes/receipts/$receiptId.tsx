import { ReceiptEditor } from '@/receipts/receipt-editor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/receipts/$receiptId')({
  component: ReceiptComponent,
})

function ReceiptComponent() {
  const params = Route.useParams()

  return <ReceiptEditor receiptId={params.receiptId === 'new' ? undefined : params.receiptId} />
}