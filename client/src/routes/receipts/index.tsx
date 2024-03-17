import { Receipts } from '@/receipts/receipts'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/receipts/')({
  component: ReceiptsComponent,
})

function ReceiptsComponent() {
  return <Receipts />
}
