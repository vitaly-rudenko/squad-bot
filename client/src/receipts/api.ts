import { useMutation, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useRequiredAuth } from '@/auth/hooks'
import { authorizationHeaders, callApi } from '@/utils/api'
import { Receipt } from './types'

type FetchReceiptsOutput = {
  items: Receipt[]
  total: number
}

export const useReceiptsQuery = (input: { page: number; perPage: number }, options?: Partial<UseQueryOptions<FetchReceiptsOutput>>) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['receipts', input],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set('page', String(input.page))
      search.set('per_page', String(input.perPage))

      const response = await callApi(`/receipts?${search.toString()}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      const json = await response.json() as { items: unknown[]; total: number }
      return { items: json.items.map(deserialize), total: json.total }
    },
    ...options,
  })
}

export const useReceiptQuery = (input: { receiptId: string }, options: Partial<UseQueryOptions<Receipt>>) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['receipt', input],
    queryFn: async () => {
      const response = await callApi(`/receipts/${input.receiptId}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      return deserialize(await response.json() as unknown)
    },
    ...options,
  })
}

export const useScanQuery = (photo: File, options: Partial<UseQueryOptions<number[]>>) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['scan', photo],
    queryFn: async () => {
      const body = new FormData()
      body.set('photo', photo, photo.name)

      const response = await callApi('/receipts/scan', {
        method: 'POST',
        headers: authorizationHeaders(authToken),
        body,
      })

      return await response.json() as number[]
    },
    ...options,
  })
}

type SaveReceiptInput = {
  receiptId?: string
  description?: string
  payerId: string
  amount: number
  photo: File | boolean
  debts: {
    debtorId: string
    amount: number
  }[]
}

export const useSaveReceiptMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (input: SaveReceiptInput) => {
      await callApi('/receipts', {
        method: 'POST',
        headers: authorizationHeaders(authToken),
        body: createSaveReceiptRequestBody(input),
      })
    }
  })
}

function createSaveReceiptRequestBody(input: SaveReceiptInput) {
  const body = new FormData()
  body.set('payer_id', input.payerId)
  body.set('amount', String(input.amount))
  body.set('debts', JSON.stringify(
    input.debts.reduce<Record<string, string>>((acc, curr) => {
      acc[curr.debtorId] = String(curr.amount)
      return acc
    }, {})
  ))

  if (input.receiptId) {
    body.set('id', input.receiptId)
  }

  if (input.description) {
    body.set('description', input.description)
  }

  if (typeof input.photo === 'boolean') {
    body.set('leave_photo', String(input.photo))
  } else {
    body.set('photo', input.photo, input.photo.name)
  }

  return body
}

export const useDeleteReceiptMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (receiptId: string) => {
      await callApi(`/receipts/${receiptId}`, {
        method: 'DELETE',
        headers: authorizationHeaders(authToken)
      })
    }
  })
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): Receipt {
  return {
    id: raw.id,
    amount: raw.amount,
    payerId: raw.payerId,
    description: raw.description,
    photoFilename: raw.photoFilename,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debts: raw.debts.map((debt: any) => ({
      debtorId: debt.debtorId,
      amount: debt.amount,
    })),
    createdAt: new Date(raw.createdAt),
  }
}
