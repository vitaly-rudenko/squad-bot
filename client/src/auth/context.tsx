import { jwtDecode } from 'jwt-decode'
import { type, assert } from 'superstruct'
import { FC, ReactNode, createContext, useCallback, useEffect, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useWebApp } from '@/web-app/hooks'
import { Spinner } from '@/components/spinner'
import { authenticate } from './api'
import { User, userSchema } from '@/users/types'
import { clearSession } from './clear-session'

type Auth = {
  authToken: string
  currentUser: User
  logOut: () => unknown
} | {
  authToken: undefined
  currentUser: undefined
  logOut: undefined
}

const AuthTokenPayload = type({
  user: userSchema
})

export const AuthContext = createContext<Auth | undefined>(undefined)

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { webApp } = useWebApp()
  const [initialized, setInitialized] = useState(false)
  const [authToken, setAuthToken] = useState<string>()
  const [currentUser, setCurrentUser] = useState<User>()
  const { code } = useSearch({ strict: false })

  useEffect(() => {
    (async () => {
      let authToken = localStorage.getItem('auth_token') || undefined

      if (!authToken) {
        if (webApp?.initData) {
          console.debug('Exchanging web app init data with auth token')
          try {
            authToken = await authenticate({ webAppInitData: webApp?.initData })
          } catch (error) {
            console.warn(error)
          }
        } else if (code) {
          console.debug('Exchanging code with auth token')
          try {
            authToken = await authenticate({ code })
          } catch (error) {
            console.warn(error)
          }
        }
      }

      if (authToken) {
        try {
          const payload = jwtDecode(authToken)
          assert(payload, AuthTokenPayload)

          localStorage.setItem('auth_token', authToken)
          setAuthToken(authToken)
          setCurrentUser(payload.user)
        } catch (error) {
          console.warn('Invalid auth token, could not parse user:', authToken, error)
        }
      }

      setInitialized(true)
    })()
  }, [code, webApp?.initData])

  const logOut = useCallback(async () => {
    clearSession()
    setAuthToken(undefined)
    setCurrentUser(undefined)
  }, [])

  const value: Auth = (authToken && currentUser) ? {
    authToken,
    currentUser,
    logOut,
  } : {
    authToken: undefined,
    currentUser: undefined,
    logOut: undefined,
  }

  if (!initialized) {
    return <Spinner className='absolute left-1/2 top-1/2 -ml-4 -mt-4' />
  }

  return <AuthContext.Provider value={value}>
    {value.authToken ? children : <div className='p-3 text-destructive select-none'>Not logged in</div>}
  </AuthContext.Provider>
}
