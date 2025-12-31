import { ChevronsUpDown } from 'lucide-react'
import { useDebounce } from '@uidotdev/usehooks'
import { FC, ReactNode, useEffect, useMemo, useState } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover'
import { UserName } from './user-name'
import { User } from '@/users/types'
import { useUsersQuery } from './api'
import { keepPreviousData } from '@tanstack/react-query'
import { useRecentUsers } from './hooks'
import { useRequiredAuth } from '@/auth/hooks'
import { MIN_QUERY_LENGTH } from './constants'
import { useTranslation } from 'react-i18next'
import { requireNonNullable } from '@/utils/require-non-nullable'

export const UserCombobox: FC<{
  variant?: | 'combobox' | 'link'
  placeholder: ReactNode
  prioritize?: User[]
  exclude?: User[]
  selectedUser?: User
  deselectable?: true
  disabled?: boolean
  onSelect: (user: User | undefined) => unknown
}> = ({ variant = 'combobox', placeholder, selectedUser, deselectable, prioritize, exclude, disabled, onSelect }) => {
  const { t } = useTranslation('user-combobox')
  const { currentUser } = useRequiredAuth()
  const recentUsers = useRecentUsers()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 500)

  const isQueryValid = query.length >= MIN_QUERY_LENGTH
  const isUsingRemoteSearch = debouncedQuery.length >= MIN_QUERY_LENGTH

  const usersQuery = useUsersQuery({ query: debouncedQuery }, {
    enabled: isUsingRemoteSearch,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  })

  const source = useMemo(
    () => {

      const orderedUsers = [
        ...selectedUser ? [selectedUser] : [],
        ...prioritize ?? [],
        ...recentUsers ?? [],
        ...isUsingRemoteSearch ? usersQuery.data ?? [] : [],
        currentUser,
      ].filter(u => !exclude?.some(e => u.id === e.id))

      const uniqueUserIds = new Set(orderedUsers.map(u => u.id))
      const deduplicatedUsers = Array.from(uniqueUserIds).map(id => requireNonNullable(orderedUsers.find(u => u.id === id)))

      return deduplicatedUsers
    },
    [currentUser, prioritize, exclude, isUsingRemoteSearch, recentUsers, selectedUser, usersQuery.data]
  )

  const searchResults = useMemo(() => source.filter(user => isUserMatching(user, query)), [query, source])
  const isSearching = isQueryValid && (usersQuery.isFetching || query !== debouncedQuery)

  useEffect(() => {
    if (open) {
      setQuery('')
    }
  }, [open])

  return <Popover open={!!open && !disabled} onOpenChange={open => setOpen(open)}>
    <PopoverTrigger asChild>
      <Button
        disabled={disabled}
        variant={variant === 'combobox' ? 'outline' : 'link'}
        role='combobox'
        className={cn(
          variant === 'link' ? 'justify-start p-0' : 'justify-between pl-3 pr-2',
          !selectedUser && variant === 'combobox' && 'text-muted-foreground'
        )}
      >
        <div className='overflow-hidden'>
          {selectedUser
            ? <UserName user={selectedUser} />
            : <>{placeholder}</>}
        </div>
        {variant === 'combobox' && <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />}
      </Button>
    </PopoverTrigger>
    <PopoverContent onOpenAutoFocus={event => event.preventDefault()} className='p-0 m-5'>
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={(value) => value.startsWith('@') ? setQuery(value.slice(1)) : setQuery(value)}
          placeholder={t('Search users...')}
        />
        <CommandEmpty>{isSearching ? t('Searching...') : t('User not found.')}</CommandEmpty>
        <CommandGroup className='max-h-[30vh] overflow-y-auto'>
          {searchResults.map(user => (
            <CommandItem
              key={user.id}
              value={user.username ? `${user.name} (@${user.username})` : user.name}
              onSelect={() => {
                if (user.id === selectedUser?.id) {
                  if (deselectable) {
                    onSelect(undefined)
                  }
                } else {
                  onSelect(user)
                }

                setOpen(false)
              }}
            >
              <div className='overflow-hidden'>
                <UserName user={user} />
              </div>
            </CommandItem>
          ))}

          {!isQueryValid && <CommandItem>{t('Type at least 3 characters to search')}</CommandItem>}
          {searchResults.length > 0 && !!isSearching && <CommandItem>{t('Searching...')}</CommandItem>}
        </CommandGroup>
      </Command>
    </PopoverContent>
  </Popover>
}

function isUserMatching(user: User, query: string): boolean {
  const lowerCasedQuery = query.toLowerCase()

  return (
    query.length === 0 ||
    user.name.toLowerCase().includes(lowerCasedQuery) ||
    user.username?.toLowerCase().includes(lowerCasedQuery) ||
    false
  )
}
