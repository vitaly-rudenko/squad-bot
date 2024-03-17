import { useMutation, useQuery } from '@tanstack/react-query'
import { useRequiredAuth } from '@/auth/hooks'
import { callApi, authorizationHeaders } from '@/utils/api'
import { Payment } from '@/payments/types'

export const usePaymentsQuery = (options: { page: number; perPage: number }) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['payments', options],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set('page', String(options.page))
      search.set('per_page', String(options.perPage))

      const response = await callApi(`/payments?${search.toString()}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      const json = await response.json() as { items: unknown[]; total: number }
      return { items: json.items.map(deserialize), total: json.total }
    }
  })
}

type CreatePaymentInput = {
  fromUserId: string
  toUserId: string
  amount: number
}

export const useCreatePaymentMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      await callApi('/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authorizationHeaders(authToken),
        },
        body: JSON.stringify(input),
      })
    }
  })
}

export const useDeletePaymentMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (paymentId: string) => {
      await callApi(`/payments/${paymentId}`, {
        method: 'DELETE',
        headers: authorizationHeaders(authToken)
      })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): Payment {
  return {
    id: raw.id,
    amount: raw.amount,
    fromUserId: raw.fromUserId,
    toUserId: raw.toUserId,
    createdAt: new Date(raw.createdAt),
  }
}
