import { useRequiredAuth } from '@/auth/hooks'
import { Button } from '@/components/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/card'
import { Form, FormField, FormItem } from '@/components/form'
import { Input } from '@/components/input'
import { PoweredByMagic } from '@/components/powered-by-magic'
import { Separator } from '@/components/separator'
import { Skeleton } from '@/components/skeleton'
import { UserCombobox } from '@/users/user-combobox'
import { formatAmount } from '@/utils/format-amount'
import { isDefined } from '@/utils/is-defined'
import { isMagicalAmount, parseMagicalAmount, sanitizeMagicAmount } from '@/utils/magic'
import { ArrowDown, Banknote } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useMemo, type FC, useEffect } from 'react'
import { useCreatePaymentMutation } from './api'
import { cn } from '@/utils/cn'
import { useRouter } from '@tanstack/react-router'
import { useRecentUsers } from '@/users/hooks'
import { createToast } from '@/utils/toast'
import { useInitialization } from '@/utils/hooks'
import { useCardsMutation } from '@/cards/api'
import { Card as CardComponent, CardSkeleton } from '@/cards/card'
import type { User } from '@/users/types'
import { isValidAmount } from '@/utils/is-valid-amount'

type FormState = {
  fromUser: User | ''
  toUser: User | ''
  amount: string
}

const defaultValues: FormState = {
  fromUser: '',
  toUser: '',
  amount: ''
}

export const PaymentEditor: FC<{
  toUser?: User
  amount?: number
}> = (props) => {
  const router = useRouter()

  const { currentUser } = useRequiredAuth()
  const recentUsers = useRecentUsers()

  const createMutation = useCreatePaymentMutation()
  const { data: cards, mutate: mutateCards, reset: resetCards, ...cardsMutation } = useCardsMutation()

  const form = useForm<FormState>({ defaultValues })
  const [$amount, $fromUser, $toUser] = form.watch(['amount', 'fromUser', 'toUser'])

  const suggestedAmount = undefined as number | undefined

  const enteredAmount = useMemo(() => parseMagicalAmount($amount, undefined), [$amount])
  const enteredAmountError = useMemo(() => $amount !== '' && !isDefined(enteredAmount), [$amount, enteredAmount])
  const amount = useMemo(() => enteredAmount ?? suggestedAmount, [enteredAmount, suggestedAmount])

  const valid = useMemo(() => (
    isValidAmount(amount) && amount > 0 &&
    $fromUser !== '' && $toUser !== '' &&
    $fromUser.id !== $toUser.id
  ), [$fromUser, $toUser, amount])

  const submit = form.handleSubmit(async (form) => {
    if (!isDefined(amount) || form.fromUser === '' || form.toUser === '') return

    const toastId = createToast('Saving the payment...', { type: 'loading' })

    await createMutation.mutateAsync({
      fromUserId: form.fromUser.id,
      toUserId: form.toUser.id,
      amount,
    })

    createToast(`A ₴${formatAmount(amount)} payment has been saved`, { type: 'success', toastId })

    await router.navigate({ to: '/payments' })
  })

  const initialized = useInitialization(() => {
    if (!recentUsers) return

    const recentUser = recentUsers.filter(u => u.id !== currentUser.id).at(0)

    form.reset({
      ...defaultValues,
      fromUser: currentUser,
      ...recentUser && { toUser: recentUser },
      ...props.toUser && { toUser: props.toUser },
      ...props.amount && { amount: formatAmount(props.amount) },
    })

    return true
  }, [currentUser, form, props.amount, props.toUser, recentUsers])

  useEffect(() => {
    if (!recentUsers || !$toUser || $toUser.id === currentUser.id) {
      resetCards()
      return
    }

    mutateCards({ userId: $toUser.id, page: 1, perPage: 15 })
  }, [$toUser, resetCards, mutateCards, currentUser.id, recentUsers])

  if (!recentUsers || !initialized) {
    return <Skeleton className='h-[18rem] animation-down-top' />
  }

  const showCards = $toUser !== '' && $toUser.id !== currentUser.id && !cardsMutation.isIdle

  return <Form {...form}>
    <form onSubmit={submit}>
      <Card className={cn(
        'relative shadow-md overflow-hidden animation-down-top transition',
        !createMutation.isIdle && 'grayscale opacity-70 pointer-events-none',
      )}>
        <CardHeader>
          <CardTitle>Record a payment</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pb-3'>
          {/* Sender */}
          <FormField
            control={form.control}
            name='fromUser'
            render={({ field }) => (
              <FormItem className='flex flex-col flex-auto min-w-0'>
                <UserCombobox
                  selectedUser={field.value || undefined}
                  placeholder='Select sender'
                  onSelect={user => {
                    form.setValue('toUser', user?.id === currentUser.id ? $fromUser : currentUser)
                    form.setValue('fromUser', user ?? '')
                  }} />
              </FormItem>
            )}
          />

          {/* Amount */}
          <div className='flex flex-row gap-3 items-center'>
            <div className='flex flex-col cursor-pointer' onClick={() => {
              form.setValue('fromUser', $toUser)
              form.setValue('toUser', $fromUser)
            }}>
              <Banknote className='w-6 h-6' />
              <ArrowDown className='w-6 h-6' />
            </div>

            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => (
                <FormItem className='flex flex-col flex-auto'>
                  <div className='flex flex-col justify-center relative'>
                    <Input type='text' value={field.value} placeholder={isDefined(suggestedAmount) ? formatAmount(suggestedAmount) : 'Enter amount'}
                      className={cn(field.value !== '' && enteredAmountError && 'border-destructive')}
                      onChange={(event) => form.setValue('amount', sanitizeMagicAmount(event.target.value))} />
                    {(isMagicalAmount($amount) || (isDefined(suggestedAmount) && field.value === '')) && <PoweredByMagic />}
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Receiver */}
          <FormField
            control={form.control}
            name='toUser'
            render={({ field }) => (
              <FormItem className='flex flex-col flex-auto min-w-0'>
                <UserCombobox
                  selectedUser={field.value || undefined}
                  placeholder='Select receiver'
                  onSelect={user => {
                    form.setValue('fromUser', user?.id === currentUser.id ? $toUser : currentUser)
                    form.setValue('toUser', user ?? '')
                  }} />
              </FormItem>
            )}
          />
        </CardContent>
        <Separator />
        <CardFooter className='flex flex-col items-stretch bg-secondary gap-3 pt-3'>
          {/* Save button */}
          <Button type='submit' disabled={!valid || !createMutation.isIdle}>
            {isDefined(amount) && amount > 0
              ? <>Save ₴{formatAmount(amount)} payment</>
              : <>Save payment</>}
          </Button>
        </CardFooter>
      </Card>

      {showCards && (
        <div className='flex flex-col gap-2 pt-3 transition animation-down-top'>
          <div className='text-xl'>{$toUser.name}'s cards</div>
          {cards ? <>
            {cards.total === 0 && (
              <div>User hasn't added any cards yet.</div>
            )}
            {cards.items.map((card) => (
              <CardComponent key={card.id} card={card} />
            ))}
          </> : cardsMutation.isPending ? <CardSkeleton /> : null}
        </div>
      )}
    </form>
  </Form>
}
