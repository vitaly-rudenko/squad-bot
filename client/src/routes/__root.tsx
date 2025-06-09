import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Navigation } from '@/navigation/navigation'
import { Toaster } from '@/components/sonner'
import { ThemeProvider } from '@/theme/context'
import { AuthProvider } from '@/auth/context'
import { WebAppProvider } from '@/web-app/context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'
import { cn } from '@/utils/cn'
import { I18nProvider } from '@/i18n/context'

export const Route = createRootRoute({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: typeof search.code === 'string' ? search.code : undefined,
    }
  },
  component: RootComponent,
})

function RootComponent() {
  const queryClient = new QueryClient()
  const [focusedOnInput, setFocusedOnInput] = useState(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const focusInListener = (event: FocusEvent) => {
      if (event.target instanceof HTMLInputElement) {
        clearTimeout(timeoutId)
        setFocusedOnInput(true)
      }
    }

    const focusOutListener = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setFocusedOnInput(false), 50)
    }

    window.document.addEventListener('focusin', focusInListener)
    window.document.addEventListener('focusout', focusOutListener)

    return () => {
      clearTimeout(timeoutId)
      window.document.removeEventListener('focusin', focusInListener)
      window.document.removeEventListener('focusout', focusOutListener)
    }
  }, [])

  return (
    <Suspense>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <WebAppProvider>
              <AuthProvider>
                <div className={cn(
                  'flex flex-col gap-1 px-3 pt-3 pb-6 select-none w-full min-w-[18rem] max-w-[34rem]',
                  focusedOnInput && 'pb-[50vh]',
                )}>
                  <Navigation />
                  <Outlet />
                  <Toaster />
                </div>
              </AuthProvider>
            </WebAppProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </Suspense>
  )
}
