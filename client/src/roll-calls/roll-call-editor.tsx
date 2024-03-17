import { superstructResolver } from '@hookform/resolvers/superstruct'
import { Button } from '@/components/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/form'
import { userSchema } from '@/users/types'
import { cn } from '@/utils/cn'
import { FC, Fragment, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Infer, array, boolean, literal, object, string, union } from 'superstruct'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { useUsersQuery } from '@/users/api'
import { UserName } from '@/users/user-name'
import { Checkbox } from '@/components/checkbox'
import { useInitialization } from '@/utils/hooks'
import { useGroupQuery } from '@/groups/api'
import { ArrowLeft, LayoutList, Trash2, X } from 'lucide-react'
import { Separator } from '@/components/separator'
import { useRollCallQuery, useRollCallsQuery, useSaveRollCallMutation } from './api'
import { useRouter } from '@tanstack/react-router'
import { createToast, dismissToast } from '@/utils/toast'
import { Textarea } from '@/components/textarea'
import { optionalTitle, parseMessagePattern } from './utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select'

const formSchema = object({
  messagePattern: string(),
  pingType: union([literal('everyone'), literal('selected'), literal('exclude')]),
  receivers: array(object({
    user: userSchema,
    enabled: boolean(),
  })),
  excludeSender: boolean(),
  pollOptions: union([array(string()), literal(false)]),
})

type FormState = Infer<typeof formSchema>

const defaultValues: FormState = {
  messagePattern: '',
  pingType: 'everyone',
  receivers: [],
  excludeSender: true,
  pollOptions: false,
}

const examples = [
  { pattern: 'ping' },
  { pattern: '@(all|here)', messages: ['@all', '@here'] },
  { pattern: 'Hi[ chat]!', messages: ['Hi!', 'Hi chat!'] },
] as const

export const RollCallEditor: FC<{
  groupId: string
  rollCallId?: string
}> = ({ groupId, rollCallId }) => {
  const router = useRouter()

  const { data: group } = useGroupQuery(groupId)
  const { data: users } = useUsersQuery({ groupId })
  const saveMutation = useSaveRollCallMutation()

  const { data: rollCalls } = useRollCallsQuery({ groupId, page: 1, perPage: 1 })
  const { data: rollCall } = useRollCallQuery(
    rollCallId ?? '',
    { enabled: rollCallId !== undefined },
  )

  const form = useForm<FormState>({
    resolver: superstructResolver(formSchema),
    defaultValues,
  })

  const [$messagePattern, $receivers, $pollOptions, $pingType] = form
    .watch(['messagePattern', 'receivers', 'pollOptions', 'pingType'])

  const messagePattern = useMemo(() => {
    const sanitizedMessagePattern = $messagePattern.trim()
    if (sanitizedMessagePattern.length === 0) return ''

    return `${sanitizedMessagePattern}${optionalTitle}`
  }, [$messagePattern])

  const valid = useMemo(() => (
    $messagePattern.trim().length > 0 &&
    $receivers.some(r => r.enabled) &&
    ($pollOptions === false || $pollOptions.length >= 2)
  ), [$messagePattern, $pollOptions, $receivers])

  const initialized = useInitialization(() => {
    if (!group || !users) return

    if (rollCallId) {
      if (!rollCall) return

      const messagePattern = parseMessagePattern(rollCall.messagePattern)
      const userIds = rollCall.usersPattern === '*' ? users.map(u => u.id) : rollCall.usersPattern.split(',')

      form.reset({
        ...defaultValues,
        messagePattern,
        pingType: rollCall.usersPattern === '*' ? 'everyone' : 'selected',
        excludeSender: rollCall.excludeSender,
        pollOptions: rollCall.pollOptions.length === 0 ? false : rollCall.pollOptions,
        receivers: users.map(user => ({
          user,
          enabled: userIds.includes(user.id),
        }))
      })
    } else {
      form.reset({
        ...defaultValues,
        receivers: users.map(user => ({
          user,
          enabled: true,
        })),
      })
    }

    return true
  }, [form, group, rollCall, rollCallId, users])

  const onSubmit = useCallback(async (formState: FormState) => {
    if (!rollCalls || (rollCallId && !rollCall)) return

    const toastId = createToast('Saving the roll call...', { type: 'loading' })

    try {
      await saveMutation.mutateAsync({
        id: Number(rollCallId),
        groupId,
        messagePattern,
        usersPattern: formState.receivers.every(r => r.enabled)
          ? '*'
          : formState.receivers.filter(r => r.enabled === (formState.pingType !== 'exclude')).map(r => r.user.id).join(','),
        excludeSender: formState.excludeSender,
        pollOptions: formState.pollOptions || [],
        sortOrder: rollCall?.sortOrder ?? (rollCalls.items.at(0)?.sortOrder ?? 0) + 1,
      })

      createToast(`The roll call has been saved`, { type: 'success', toastId })

      await router.navigate({ to: '/groups/$groupId/roll-calls', params: { groupId } })
    } catch (error) {
      console.error(error)
      dismissToast(toastId)
    }
  }, [groupId, messagePattern, rollCall, rollCallId, rollCalls, router, saveMutation])

  const handlePingTypeChange = useCallback((pingType: FormState['pingType']) => {
    form.setValue('pingType', pingType)
    form.setValue('receivers', $receivers.map(r => ({ ...r, enabled: pingType === 'everyone' || pingType === 'selected' })))
  }, [$receivers, form])

  if (!group || !initialized) {
    return <Skeleton className='h-[32rem] animation-down-top' />
  }

  return <div className='flex flex-col gap-2'>
    <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline justify-start'
      onClick={() => router.navigate({ to: '/groups/$groupId/roll-calls', params: { groupId } })}>
      <ArrowLeft className='w-4 h-4 self-center shrink-0' />
      <span className='truncate'>{group.title}</span>
    </Button>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className={cn(
          'shadow-md overflow-hidden animation-down-top transition',
          !saveMutation.isIdle && 'grayscale opacity-70 pointer-events-none',
        )}>
          <CardHeader>
            <CardTitle className='leading-normal truncate'>
              {rollCallId ? 'Edit the roll call' : 'Create a roll call'}
            </CardTitle>
          </CardHeader>

          <CardContent className='flex flex-col gap-3 pb-3'>
            {/* Message pattern */}
            <FormField
              control={form.control}
              name='messagePattern'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Trigger message pattern</FormLabel>
                  <Textarea
                    placeholder='@channel'
                    maxLength={256}
                    className={cn(
                      'resize-none transition-[height] min-h-0 h-10',
                      field.value.length > 32 && 'h-20',
                    )}
                    {...field}
                  />
                </FormItem>
              )}
            />

            {/* Examples */}
            {!rollCallId && <FormDescription>
              Examples:<br/>
              {examples.map((example) => (
                <Fragment key={example.pattern} >
                  <Example
                    example={example}
                    onClick={() => {
                      if ($messagePattern !== '' && examples.every(e => e.pattern !== $messagePattern)) return
                      form.setValue('messagePattern', example.pattern)
                    }}
                  />
                  <br/>
                </Fragment>
              ))}
            </FormDescription>}
          </CardContent>

          <CardContent className='flex flex-col pt-3 bg-secondary py-3 gap-2'>
            {/* Ping type */}
            <FormField
              control={form.control}
              name='pingType'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <Select onValueChange={handlePingTypeChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder='Ping type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='everyone'>Ping everyone</SelectItem>
                      <SelectItem value='selected'>Ping selected</SelectItem>
                      <SelectItem value='exclude'>Ping everyone except selected</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Receivers */}
            <FormField
              control={form.control}
              name='receivers'
              render={({ field }) => <>
                {$pingType !== 'everyone' && field.value.map((user, index) => (
                  <FormItem className='flex flex-row flex-auto items-center min-w-0 h-10 space-y-0 animation-top-down' key={user.user.id}>
                    <FormControl>
                      <Checkbox
                        checked={user.enabled}
                        onCheckedChange={(checked) => {
                          form.setValue('receivers', field.value.with(index, {
                            ...user,
                            enabled: checked === true,
                          }))
                        }}
                      />
                    </FormControl>

                    <FormLabel className='p-2 cursor-pointer overflow-hidden'>
                      <UserName user={user.user} />
                    </FormLabel>
                  </FormItem>
                ))}
              </>}
            />
          </CardContent>

          <CardContent className='flex flex-col py-3 gap-2'>
            {/* Exclude sender */}
            <FormField
              control={form.control}
              name='excludeSender'
              render={({ field }) => <>
                <FormItem className='flex flex-row gap-3 space-y-0 items-stretch'>
                  <div className='flex flex-row flex-auto items-center w-32 min-w-0 h-10'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className='p-2 cursor-pointer overflow-hidden'>Exclude sender from the notification</FormLabel>
                  </div>
                </FormItem>
            </>} />

            {/* Poll options */}
            <FormField
              control={form.control}
              name='pollOptions'
              render={({ field }) => <>
                {field.value === false && (
                  <Button variant='link' className='flex flex-row items-center justify-start gap-2 p-0' onClick={() => form.setValue('pollOptions', [])}>
                    <LayoutList className='w-4 h-4'/><span>Add poll</span>
                  </Button>
                )}

                {field.value !== false && <>
                  <Separator />
                  <div className='flex flex-row justify-between items-center animation-appear pt-3'>
                    <FormLabel>Poll options</FormLabel>
                    <Button variant='link' className='p-0 min-h-0 h-auto grow justify-end'
                      onClick={() => form.setValue('pollOptions', false)}>
                      <X className='w-4 h-4' />
                    </Button>
                  </div>
                </>}

                {field.value !== false && [...field.value, ''].map((option, index) => (
                  <FormItem className='flex flex-col animation-top-down' key={index}>
                    <div className='flex flex-row gap-1'>
                      <Input
                        type='text'
                        placeholder={index < 2 ? `Option ${index + 1}` : 'Additional option (optional)'}
                        maxLength={32}
                        value={option}
                        onChange={(event) => {
                          if (field.value === false) return
                          form.setValue(
                            'pollOptions',
                            sanitizePollOptions(option === ''
                              ? [...field.value, event.target.value]
                              : field.value.with(index, event.target.value)),
                          )
                        }}
                      />

                      {option !== '' && index >= 2 && (
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={() => {
                            if (field.value === false) return
                            form.setValue('pollOptions', sanitizePollOptions(field.value.with(index, '')))
                          }}
                        ><Trash2 /></Button>
                      )}
                    </div>
                  </FormItem>
                ))}
            </>} />
          </CardContent>

          <CardFooter className='flex flex-col items-stretch bg-secondary gap-3 pt-3'>
            {/* Save button */}
            <Button type='submit' disabled={!valid}>Save roll call</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  </div>
}

const Example: FC<{
  example: (typeof examples)[number]
  onClick: () => unknown
}> = ({ example, onClick }) => {
  return <span className='cursor-pointer' onClick={onClick}>
    - <span className='font-mono text-primary px-1 rounded-sm bg-primary/10'>{example.pattern}</span>
    {('messages' in example) && (<>
      {' → '}{example.messages.map((message, i) => <Fragment key={message}>
        {i > 0 && ', '}<span className='font-mono text-primary px-1 rounded-sm bg-primary/10'>{message}</span>
      </Fragment>)}
    </>)}
  </span>
}

function sanitizePollOptions(options: string[]) {
  return options.filter(o => o.trim().length > 0)
}
