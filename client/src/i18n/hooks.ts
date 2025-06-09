import { useContext } from 'react'
import { I18nProviderContext } from './context'

export const useI18n = () => {
  const context = useContext(I18nProviderContext)

  if (context === undefined)
    throw new Error("useI18n must be used within a I18nProvider")

  return context
}
