import { superstructResolver } from '@hookform/resolvers/superstruct'
import { Button } from '@/components/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/card'
import { Form, FormDescription, FormField, FormItem, FormLabel } from '@/components/form'
import { cn } from '@/utils/cn'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Infer, literal, object, size, string, union } from 'superstruct'
import { Skeleton } from '@/components/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select'
import { Input } from '@/components/input'
import type cardValidator from 'card-validator'
import { useCreateCardMutation } from './api'
import { createToast, dismissToast } from '@/utils/toast'
import { useRouter } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { formatCardNumber } from './utils'
import { ApiError } from '@/utils/api'
import { useDebounce } from '@uidotdev/usehooks'

const formSchema = object({
  number: size(string(), 16),
  bank: union([literal('monobank'), literal('privatbank')]),
})

type FormState = Infer<typeof formSchema>

const defaultValues: FormState = {
  number: '',
  bank: 'monobank',
}

export const CardEditor: FC = () => {
  const router = useRouter()

  // TODO: this is a hacky fix to avoid clicking on "Add card" button when the bank is selected because touch event passes through
  const [bankSelectOpen, setBankSelectOpen] = useState(false)
  const bankSelectOpenDebounced = useDebounce(bankSelectOpen, 100)

  const [validateCard, setValidateCard] = useState<typeof cardValidator>()
  const createMutation = useCreateCardMutation()

  const form = useForm<FormState>({
    resolver: superstructResolver(formSchema),
    defaultValues,
  })

  const [$number, $bank] = form.watch(['number', 'bank'])

  const validation = useMemo(() => validateCard?.number($number), [$number, validateCard])
  const valid = useMemo(() => validateCard?.number($number).isValid ?? false, [$number, validateCard])

  useEffect(() => {
    (async () => {
      setValidateCard((await import('card-validator')))
    })()
  }, [])

  const onSubmit = useCallback(async (formState: FormState) => {
    const toastId = createToast('Adding the card...', { type: 'loading' })

    try {
      await createMutation.mutateAsync({
        number: formState.number,
        bank: formState.bank,
      })

      createToast(`The card has been saved`, { type: 'success', toastId })

      await router.navigate({ to: '/cards' })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ALREADY_EXISTS') {
        createMutation.reset()
        createToast('You have already added this card', { type: 'error', toastId })
        return
      }

      console.error(error)
      dismissToast(toastId)
    }
  }, [createMutation, router])

  if (!validateCard) {
    return <Skeleton className='h-[16rem] animation-down-top' />
  }

  return <div className='flex flex-col gap-2'>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className={cn(
          'shadow-md overflow-hidden animation-down-top transition',
          !createMutation.isIdle && 'grayscale opacity-70 pointer-events-none',
        )}>
          <CardHeader>
            <CardTitle className='leading-normal truncate'>Add a card</CardTitle>
          </CardHeader>

          <CardContent className='flex flex-col gap-3 pb-3'>
            {/* Card number */}
            <FormField
              control={form.control}
              name='number'
              render={({ field }) => (<>
                <FormItem className='flex flex-col'>
                  <FormLabel>Card number</FormLabel>
                  <div className='flex flex-row grow'>
                    <Input focusOnEnd
                      type='tel'
                      inputMode='tel'
                      placeholder=''
                      className={cn('peer', (validation?.isPotentiallyValid === false || (!valid && field.value.length === 16)) && 'border-destructive')}
                      {...field}
                      onChange={(event) => form.setValue('number', sanitizeCardNumber(event.target.value))}
                    />
                    <Button size='icon' variant='link'
                      className={cn(
                        'w-0 transition-all',
                        field.value.length > 0 && 'pl-3 w-10',
                      )}
                      onClick={() => form.setValue('number', '')}>
                      <Trash2 />
                    </Button>
                  </div>
                </FormItem>
                {field.value.length > 0 && <FormDescription className='animation-down-top'>
                  {formatCardNumber(field.value)}{validation?.card?.niceType && <span className='animation-appear'> ({validation.card.niceType})</span>}
                </FormDescription>}
              </>)}
            />

            {/* Bank */}
            <FormField
              control={form.control}
              name='bank'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <Select onValueChange={field.onChange} defaultValue={field.value} open={bankSelectOpen} onOpenChange={setBankSelectOpen}>
                    <SelectTrigger>
                      <SelectValue placeholder='Bank' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='monobank'>Monobank</SelectItem>
                      <SelectItem value='privatbank'>Privatbank</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className='flex flex-col items-stretch bg-secondary gap-3 pt-3'>
            {/* Save button */}
            <Button type='submit' disabled={!valid || bankSelectOpenDebounced}>Add {$bank === 'privatbank' ? 'Privatbank' : 'Monobank'} card</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  </div>
}

function sanitizeCardNumber(input: string) {
  return input.replaceAll(/\D+/g, '').slice(0, 16)
}
