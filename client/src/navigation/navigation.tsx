import { FC, useEffect, useMemo, useState } from 'react'
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '@/components/navigation-menu'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/button'
import { useAuth } from '@/auth/hooks'
import { Alert } from '@/components/alert-dialog'
import { useWebApp } from '@/web-app/hooks'
import { cn } from '@/utils/cn'
import { Moon, MoonStar, Sun, SunDim } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useI18n } from '@/i18n/hooks'

function getTimeOfTheDay(names: { morning: string; afternoon: string; evening: string; night: string }) {
  const hours = new Date().getHours()

  if (hours >= 6 && hours < 11) {
    return { name: names.morning, icon: SunDim }
  }

  if (hours >= 11 && hours < 17) {
    return { name: names.afternoon, icon: Sun }
  }

  if (hours >= 17 && hours < 22) {
    return { name: names.evening, icon: Moon }
  }

  return { name: names.night, icon: MoonStar }
}

export const Navigation: FC = () => {
  const { t } = useTranslation('navigation')
  const { language, setLanguage } = useI18n()

  const auth = useAuth()
  const { webApp } = useWebApp()
  const [logOutAlertOpen, setLogOutAlertOpen] = useState(false)

  const timeOfTheDay = useMemo(() => getTimeOfTheDay({
    morning: t('morning'),
    afternoon: t('afternoon'),
    evening: t('evening'),
    night: t('night'),
  }), [t])

  const routes = useMemo(() => [
    { name: t('Receipts'), route: '/receipts' },
    { name: t('Payments'), route: '/payments' },
    { name: t('Cards'), route: '/cards' },
    { name: t('Groups'), route: '/groups' },
  ], [t])

  return <>
    <Alert
      title='Log out from your account?'
      confirm='Yes, log out'
      open={logOutAlertOpen}
      onConfirm={() => auth.logOut?.()}
      onCancel={() => setLogOutAlertOpen(false)}
    />

    <NavigationMenu className='flex flex-col'>
      <NavigationMenuList className='flex flex-row gap-1 justify-start'>
        {!!auth.currentUser && (
          <NavigationMenuItem className='grow flex flex-row justify-start'>
            <Button variant='link'
              className={cn('p-0 h-auto flex flex-row gap-1.5 items-baseline hover:no-underline', webApp && 'pointer-events-none')}
              onClick={() => setLogOutAlertOpen(true)}>
              <timeOfTheDay.icon className='w-4 h-4 self-center' />
              <span>{t('Good ')}{timeOfTheDay.name}, {auth.currentUser.name}</span>
            </Button>
          </NavigationMenuItem>
        )}

        <NavigationMenuItem>
          <Button variant='link'
            className='p-0 flex flex-row items-baseline h-auto group-[.active]:underline'
            onClick={() => setLanguage(language === 'en' ? 'uk' : 'en')}>{language === 'uk' ? '🇺🇦 UA (beta)' : '🇬🇧 EN'}</Button>
        </NavigationMenuItem>
      </NavigationMenuList>

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