import { Payments } from '@/payments/payments'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/payments/')({
  component: PaymentsComponent,
})

function PaymentsComponent() {
  return <Payments />
}
