import { useContext } from 'react'
import { WebAppContext } from './context'

export function useWebApp() {
  const context = useContext(WebAppContext)
  if (!context) {
    throw new Error('useWebApp must be used within an WebAppProvider');
  }

  return context
}
