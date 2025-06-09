import { SpinnerArea } from '@/components/spinner'
import { PaymentEditor } from '@/payments/payment-editor'
import { useUserQuery } from '@/users/api'
import { createFileRoute } from '@tanstack/react-router'
import { coerce, number, optional, string, type } from 'superstruct'

const searchSchema = type({
  amount: optional(coerce(number(), string(), (value) => Number(value))),
  to_user_id: optional(coerce(string(), number(), (value) => String(value))),
  from_user_id: optional(coerce(string(), number(), (value) => String(value))),
})

export const Route = createFileRoute('/payments/$paymentId')({
  component: PaymentComponent,
  validateSearch: (search) => searchSchema.create(search),
})

function PaymentComponent() {
  const search = Route.useSearch()
  const toUser = useUserQuery(search.to_user_id)
  const fromUser = useUserQuery(search.from_user_id)

  if (search.to_user_id && !toUser) {
    return <SpinnerArea />
  }

  if (search.from_user_id && !fromUser) {
    return <SpinnerArea />
  }

  return <PaymentEditor toUser={toUser} fromUser={fromUser} amount={search.amount} />
}