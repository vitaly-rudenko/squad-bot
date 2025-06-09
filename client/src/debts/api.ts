import { useQuery } from '@tanstack/react-query'
import { useRequiredAuth } from '@/auth/hooks'
import { callApi, authorizationHeaders } from '@/utils/api'
import { Debts } from './types'

export const useDebtsQuery = () => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const response = await callApi('/debts', {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      const json = await response.json()
      return deserialize(json)
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): Debts {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outgoingDebts: raw.outgoingDebts.map((debt: any) => ({ userId: debt.userId, amount: debt.amount })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ingoingDebts: raw.ingoingDebts.map((debt: any) => ({ userId: debt.userId, amount: debt.amount })),
  }
}
