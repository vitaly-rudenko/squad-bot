import { FC, useState } from 'react'
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '@/components/navigation-menu'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/button'
import { useAuth } from '@/auth/hooks'
import { Alert } from '@/components/alert-dialog'
import { useWebApp } from '@/web-app/hooks'
import { cn } from '@/utils/cn'
import { Moon, MoonStar, Sun, SunDim } from 'lucide-react'

const routes = [
  { name: 'Receipts', route: '/receipts' },
  { name: 'Payments', route: '/payments' },
  { name: 'Cards', route: '/cards' },
  { name: 'Groups', route: '/groups' },
] as const

function getTimeOfTheDay() {
  const hours = new Date().getHours()

  if (hours >= 6 && hours < 11) {
    return { name: 'morning', icon: SunDim }
  }

  if (hours >= 11 && hours < 17) {
    return { name: 'afternoon', icon: Sun }
  }

  if (hours >= 17 && hours < 22) {
    return { name: 'evening', icon: Moon }
  }

  return { name: 'night', icon: MoonStar }
}

const timeOfTheDay = getTimeOfTheDay()

export const Navigation: FC = () => {
  const auth = useAuth()
  const { webApp } = useWebApp()
  const [logOutAlertOpen, setLogOutAlertOpen] = useState(false)

  return <>
    <Alert
      title='Log out from your account?'
      confirm='Yes, log out'
      open={logOutAlertOpen}
      onConfirm={() => auth.logOut?.()}
      onCancel={() => setLogOutAlertOpen(false)}
    />

    <NavigationMenu className='flex flex-col'>
      {!!auth.currentUser && (
        <NavigationMenuItem className='grow flex flex-row justify-start'>
          <Button variant='link'
            className={cn('p-0 h-auto flex flex-row gap-1.5 items-baseline hover:no-underline', webApp && 'pointer-events-none')}
            onClick={() => setLogOutAlertOpen(true)}>
            <timeOfTheDay.icon className='w-4 h-4 self-center' />
            <span>Good {timeOfTheDay.name}, {auth.currentUser.name}</span>
          </Button>
        </NavigationMenuItem>
      )}

      <NavigationMenuList className='flex flex-row gap-1 justify-start'>
        {routes.map(route => (
          <NavigationMenuItem key={route.route}>
            <Link to={route.route} className='group'>
              <Button variant='link' className='p-0 py-2 flex flex-row items-baseline h-auto group-[.active]:underline'>{route.name}</Button>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  </>
}