import { useContext } from 'react'
import { AuthContext } from './context'
import { useQuery } from '@tanstack/react-query'
import { authorizationHeaders, callApi } from '@/utils/api'
import { User } from '@/users/types'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context
}

export function useRequiredAuth() {
  const auth = useAuth()
  if (!auth.authToken) {
    throw new Error('Not authenticated')
  }

  return auth
}

export const useBotQuery = () => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    staleTime: Infinity,
    queryKey: ['bot'],
    queryFn: async () => {
      const response = await callApi('/bot', {
        method: 'GET',
        headers: authorizationHeaders(authToken)
      })

      return deserialize(await response.json())
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    username: raw.username,
    locale: raw.locale,
  }
}
