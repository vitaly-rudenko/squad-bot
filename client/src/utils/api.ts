import { clearSession } from '@/auth/clear-session'
import { ToastId, createToast } from '@/utils/toast'
import { type, string, optional, assert, unknown } from 'superstruct'

// TODO: move to env
export const API_URL = window.location.host === 'vitaly-rudenko.github.io'
  ? 'https://squad-bot.vitaly-rudenko.com'
  : `${window.location.protocol}//192.168.0.119:3000`

const TIMEOUT_MS = 30_000

export class ApiError {
  constructor(
    readonly request: { endpoint: string; init?: RequestInit },
    readonly response: Response,
    readonly status: number,
    readonly code?: string,
    readonly message?: string,
    readonly context?: unknown,
  ) {}
}

const errorSchema = type({
  error: type({
    code: string(),
    message: optional(string()),
    context: optional(unknown()),
  }),
})

export function authorizationHeaders(authToken: string) {
  if (!authToken) {
    throw new Error(`Invalid auth token: ${authToken}`)
  }

  return { 'Authorization': `Bearer ${authToken}` }
}

let toastId: ToastId | undefined

export async function callApi(endpoint: string, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...init,
    })

    if (!response.ok) {
      let body
      try {
        body = await response.json()
        assert(body, errorSchema)
      } catch (error) {
        console.warn('Could not parse error response body:', { endpoint, init, response }, error)
        throw new ApiError(
          { endpoint, init },
          response,
          response.status
        )
      }

      throw new ApiError(
        { endpoint, init },
        response,
        response.status,
        body.error.code,
        body.error.message,
        body.error.context,
      )
    }

    return response
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status >= 500 && error.status <= 599) {
        toastId = createToast('Request failed due to a server error', {
          toastId,
          type: 'error',
          description: description(error.code, error.message),
        })
      } else if (error.status === 401) {
        toastId = createToast('Authentication failed, reloading...', {
          toastId,
          type: 'error',
          description: description(error.code, error.message),
        })

        clearSession()
        setTimeout(() => window.location.reload(), 2000)
      }
    } else if (error instanceof TypeError) {
      toastId = createToast('Request failed, please check your internet connection', {
          toastId,
          type: 'error',
          description: description(
          error.name !== 'TypeError' && error.name,
          error.message !== 'Failed to fetch' && error.message !== 'Load failed' && error.message,
        )
      })
    } else if (error instanceof Error && error.name === 'TimeoutError') {
      toastId = createToast('Request timed out, please try again', { toastId, type: 'error' })
    } else {
      toastId = createToast('Whoops, an unknown error happened!', { toastId, type: 'error' })
    }

    console.warn('API request failed:', { endpoint, init }, error)
    throw error
  }
}

function description(name?: string | false, message?: string | false) {
  return [name, message].filter(Boolean).join(': ') || undefined
}
