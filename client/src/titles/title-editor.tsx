import { Button } from '@/components/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/card'
import { FormField, FormItem, FormMessage, FormLabel, Form, FormDescription } from '@/components/form'
import { Input } from '@/components/input'
import { Separator } from '@/components/separator'
import { useUsersQuery } from '@/users/api'
import { User } from '@/users/types'
import { UserName } from '@/users/user-name'
import { cn } from '@/utils/cn'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { FC, Fragment } from 'react'
import { useForm } from 'react-hook-form'
import { useAdminsQuery, useSaveAdminsMutation } from './api'
import { useInitialization } from '@/utils/hooks'
import { useGroupQuery } from '@/groups/api'
import { useRouter } from '@tanstack/react-router'
import { Skeleton } from '@/components/skeleton'
import { createToast, dismissToast } from '@/utils/toast'
import { ApiError } from '@/utils/api'
import { useBotQuery } from '@/auth/hooks'

type FormState = {
  admins: {
    user: User
    title: string
    errorMessage: string
  }[]
}

const defaultValues: FormState = {
  admins: []
}

const errorMessages: Record<string, string | undefined> = {
  CANNOT_ADD_NEW_ADMINS: 'Bot is not an admin or cannot add new admins.',
  INSUFFICIENT_PERMISSIONS: 'Bot has less permissions than user.',
  FOR_SUPERGROUPS_ONLY: 'Custom titles are only available in supergroups.',
  INVALID_CUSTOM_TITLE: 'Invalid custom title, try removing emojis.',
}

export const TitleEditor: FC<{ groupId: string }> = ({ groupId }) => {
  const router = useRouter()

  const { data: bot } = useBotQuery()
  const { data: group } = useGroupQuery(groupId)
  const { data: users } = useUsersQuery({ groupId })
  const { data: admins, refetch, isRefetching } = useAdminsQuery(groupId)
  const saveMutation = useSaveAdminsMutation()

  const form = useForm<FormState>({ defaultValues })

  const initialized = useInitialization(() => {
    if (!admins || !users || !bot) return

    form.reset({
      ...defaultValues,
      admins: users
        .map(user => ({
          user,
          title: admins.find(admin => admin.userId === user.id)?.title ?? '',
          errorMessage: '',
        }))
        .filter(admin => admin.user && admin.user.id !== bot.id)
    })

    return true
  }, [admins, bot, form, users])

  const onSubmit = form.handleSubmit(async (formState) => {
    if (!admins) return

    form.setValue('admins', formState.admins.map(admin => ({
      ...admin,
      errorMessage: '',
    })))

    const toastId = createToast('Saving titles...', { type: 'loading' })

    try {
      const adminsToUpdate = formState.admins
        .filter($admin => {
          const admin = admins.find(a => a.userId === $admin.user.id)
          return admin
            ? admin.editable && admin.title !== $admin.title.trim()
            : $admin.title.trim().length > 0
        })
        .map(admin => ({
          userId: admin.user.id,
          title: admin.title.trim(),
        }))

      if (adminsToUpdate.length > 0) {
        await saveMutation.mutateAsync({
          groupId,
          admins: adminsToUpdate,
        })
      }
    } catch (error) {
      dismissToast(toastId)

      if (error instanceof ApiError && error.code === 'COULD_NOT_UPDATE_ADMINS') {
        const { errorCodes } = error.context as { errorCodes: { userId: string; errorCode: string }[] }
        form.setValue(
          'admins',
          formState.admins.map(admin => {
            const errorCode = errorCodes.find(e => e.userId === admin.user.id)?.errorCode
            return {
              ...admin,
              errorMessage: errorCode ? (errorMessages[errorCode] ?? errorCode) : '',
            }
          })
        )
      } else {
        console.error(error)
      }
    }

    createToast('Titles have been saved', { type: 'success', toastId })

    refetch()
  })

  if (!users || !admins || !group || !initialized) {
    return <Skeleton className='h-[20rem]' />
  }

  return <div className='flex flex-col gap-2'>
    <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline justify-start'
      onClick={() => router.navigate({ to: '/groups' })}>
      <ArrowLeft className='w-4 h-4 self-center shrink-0' />
      <span className='truncate'>{group.title}</span>
    </Button>
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <Card className={cn(
          'shadow-md animation-down-top transition',
          (saveMutation.isPending || isRefetching) && 'grayscale opacity-70 pointer-events-none',
        )}>
          <CardHeader>
            <CardTitle>Edit titles</CardTitle>
          </CardHeader>

          <CardContent className='flex flex-col pt-3 bg-secondary py-3 gap-2'>
            {/* Admins */}
            <FormField
              control={form.control}
              name='admins'
              render={({ field }) => <>
                {field.value.map(($admin, i) => {
                  const admin = admins.find(admin => admin.userId === $admin.user.id)
                  return <Fragment key={$admin.user.id}>
                    {i > 0 && <Separator />}

                    <FormItem className='flex flex-row space-y-0 items-stretch gap-3'>
                      <FormLabel className='py-2 flex-auto overflow-hidden w-32 min-w-0 h-10'>
                        <UserName user={$admin.user} />
                      </FormLabel>

                      <div className='flex flex-row grow transition-[width] w-24 has-[input:focus]:w-96 items-stretch'>
                        <Input type='text'
                          focusOnEnd
                          maxLength={16}
                          value={$admin.title}
                          disabled={admin && !admin.editable}
                          placeholder={admin ? 'admin' : ''}
                          className={cn($admin.errorMessage && 'border-destructive')}
                          onChange={(event) => {
                            form.setValue('admins', field.value.with(i, {
                              ...$admin,
                              title: event.target.value,
                              errorMessage: '',
                            }))
                          }}
                        />

                        <Button size='icon' variant='link'
                          className={cn((!admin || admin.editable) && $admin.title.length > 0 ? 'w-10 pl-3' : 'w-0 pl-0', 'transition-all')}
                          onClick={() => form.setValue('admins', field.value.with(i, {
                            ...$admin,
                            title: '',
                            errorMessage: '',
                          }))}>
                          <Trash2 />
                        </Button>
                      </div>
                    </FormItem>

                    {$admin.errorMessage !== '' && (
                      <FormMessage className='animation-top-down'>{$admin.errorMessage}</FormMessage>
                    )}

                    {!admin && $admin.title.length > 0 && (
                      <FormDescription className='animation-top-down'>Bot will promote this user to admin to set title.</FormDescription>
                    )}

                    {admin && !admin.editable && (
                      <FormDescription>
                        {admin.isCreator
                          ? <>Creator's title cannot be changed.</>
                          : <>Demote this user from admins to set title.</>}
                      </FormDescription>
                    )}
                  </Fragment>
                })}
              </>}
            />
          </CardContent>
          <CardFooter className='flex flex-col items-stretch gap-3 pt-3 rounded-b-md'>
            {/* Save button */}
            <Button type='submit'>
              Save titles
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  </div>
}
