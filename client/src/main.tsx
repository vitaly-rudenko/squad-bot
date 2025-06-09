import * as Sentry from '@sentry/react'
import { Link, NotFoundRoute, RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import { Route as RootRoute } from './routes/__root'
import { Button } from '@/components/button'
import './i18n/i18n'
import './globals.css'

Sentry.init({
  dsn: 'https://c19e2274848860ddce13b7109e7edec9@o4509468471721984.ingest.de.sentry.io/4509468473163856',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/vitaly-rudenko\.github\.io/,
    /^https:\/\/vitaly-rudenko.com/,
    /^https:\/\/api\.vitaly-rudenko.com/,
    /^https:\/\/squadbot\.vitaly-rudenko.com/,
    /^https:\/\/squad-bot\.vitaly-rudenko.com/,
  ],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0 // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
})

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
  notFoundRoute: new NotFoundRoute({
    getParentRoute: () => RootRoute,
    component: () => {
      return <div className='animation-down-top flex flex-col gap-3'>
        <div className='flex flex-row justify-between items-baseline font-medium text-xl'>
          <div>Whoops, page not found!</div>
        </div>

        <Link to='/'>
          <Button>Go home</Button>
        </Link>
      </div>
    },
  })
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
