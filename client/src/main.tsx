import { Link, NotFoundRoute, RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import { Route as RootRoute } from './routes/__root'
import { Button } from '@/components/button'
import './globals.css'

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
