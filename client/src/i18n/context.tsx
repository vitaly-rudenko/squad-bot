import { createContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type I18nProviderProps = {
  children: React.ReactNode
  storageKey?: string
}

type I18nProviderState = {
  language: string
  setLanguage: (language: string) => void
}

const initialState: I18nProviderState = {
  language: 'en',
  setLanguage: () => null,
}

export const I18nProviderContext = createContext<I18nProviderState>(initialState)

export function I18nProvider({
  children,
  storageKey = 'language',
  ...props
}: I18nProviderProps) {
  const { i18n } = useTranslation('navigation')

  const [language, setLanguage] = useState<string>(
    () => (localStorage.getItem(storageKey) as string) || 'en'
  )

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [i18n, language])

  const value = {
    language,
    setLanguage: (language: string) => {
      localStorage.setItem(storageKey, language)
      setLanguage(language)
    }
  }

  return (
    <I18nProviderContext.Provider {...props} value={value}>
      {children}
    </I18nProviderContext.Provider>
  )
}
