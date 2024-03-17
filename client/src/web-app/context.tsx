import { FC, ReactNode, createContext, useEffect, useMemo } from 'react'
import { parseStartParam } from './parse-start-param'
import { Command } from './types'

type ProvidedWebApp = {
  command: Command | undefined
  webApp: typeof Telegram.WebApp | undefined
}

export const WebAppContext = createContext<ProvidedWebApp | undefined>(undefined)

export const WebAppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const webApp = useMemo<typeof Telegram.WebApp | undefined>(() => window.Telegram?.WebApp, [])

  useEffect(() => {
    if (!webApp?.initData) return
    webApp.ready()
    webApp.expand()
  }, [webApp])

  const value: ProvidedWebApp = webApp?.initData ? {
    webApp,
    command: parseStartParam(webApp.initDataUnsafe?.start_param),
  } : {
    webApp: undefined,
    command: undefined,
  }

  return <WebAppContext.Provider value={value}>{children}</WebAppContext.Provider>
}

