import { useRequiredAuth } from '@/auth/hooks'
import { callApi, authorizationHeaders } from '@/utils/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card } from './types'

type FetchCardsOptions = {
  userId: string
  page: number
  perPage: number
}

export const useCardsQuery = (options: FetchCardsOptions) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['cards', options],
    queryFn: async () => fetchCards(options, authToken),
  })
}

export function useCardsMutation() {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (options: FetchCardsOptions) => fetchCards(options, authToken),
  })
}

async function fetchCards(options: { userId: string; page: number; perPage: number }, authToken: string) {
  const search = new URLSearchParams()
  search.set('user_id', options.userId)
  search.set('page', String(options.page))
  search.set('per_page', String(options.perPage))

  const response = await callApi(`/cards?${search.toString()}`, {
    method: 'GET',
    headers: authorizationHeaders(authToken),
  })

  const json = await response.json() as { items: unknown[]; total: number }
  return { items: json.items.map(deserialize), total: json.total }
}

type CreateCardInput = {
  number: string
  bank: string
}

export const useCreateCardMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (input: CreateCardInput) => {
      await callApi('/cards', {
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

export const useDeleteCardMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (cardId: string) => {
      await callApi(`/cards/${cardId}`, {
        method: 'DELETE',
        headers: authorizationHeaders(authToken)
      })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): Card {
  return {
    id: raw.id,
    userId: raw.userId,
    number: raw.number,
    bank: raw.bank,
  }
}
