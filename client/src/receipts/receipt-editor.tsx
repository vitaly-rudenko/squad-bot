import { useRequiredAuth } from '@/auth/hooks'
import { Alert } from '@/components/alert-dialog'
import { Button } from '@/components/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/card'
import { Checkbox } from '@/components/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/form'
import { Input } from '@/components/input'
import { PoweredByMagic } from '@/components/powered-by-magic'
import { Separator } from '@/components/separator'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/utils/cn'
import { ReceiptPhotoViewer } from '@/receipts/receipt-photo-viewer'
import { UserCombobox } from '@/users/user-combobox'
import { UserName } from '@/users/user-name'
import { useRecentUsers } from '@/users/hooks'
import { User } from '@/users/types'
import { fileToDataUrl } from '@/utils/file-to-data-url'
import { formatAmount } from '@/utils/format-amount'
import { isMagicalAmount, sanitizeMagicAmount } from '@/utils/magic'
import { AlertCircle, Coins, Divide, EyeOff, Image, ImageOff, UserIcon, Users } from 'lucide-react'
import { ElementRef, FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDeleteReceiptMutation, useReceiptQuery, useSaveReceiptMutation, useScanQuery } from './api'
import { calculateReceipt } from './calculate-receipt'
import { getReceiptPhotoUrl } from './get-receipt-photo-url'
import { useRouter } from '@tanstack/react-router'
import { ToastId, createToast, dismissToast } from '@/utils/toast'
import { processImages, rotateImage } from '@/utils/images'
import { useInitialization } from '@/utils/hooks'
import { Spinner } from '@/components/spinner'
import { useUsersQuery } from '@/users/api'
import { ApiError } from '@/utils/api'
import { Calculations } from './calculations'
import { AmountSuggestions } from './amount-suggestions'
import { DescriptionSuggestions } from './description-suggestions'

type FormState = {
  amount: string
  payer: User | ''
  description: string
  tipAmount: string | undefined
  tipPayer: User | ''
  sharedExpenses: string | undefined
  photo: File | boolean
  debts: {
    user: User
    amount: string
    enabled: boolean
  }[]
}

const defaultValues: FormState = {
  amount: '',
  payer: '',
  description: '',
  tipAmount: undefined,
  tipPayer: '',
  sharedExpenses: undefined,
  photo: false,
  debts: [],
}

const RECENT_USERS_LIMIT = 5
const ENABLED_USERS_LIMIT = 10
const MAX_AMOUNT = 100_000_00

export const ReceiptEditor: FC<{ receiptId?: string }> = ({ receiptId }) => {
  const router = useRouter()

  const { currentUser } = useRequiredAuth()
  const recentUsers = useRecentUsers()

  const { data: receipt } = useReceiptQuery({
    receiptId: receiptId ?? '' },
    { enabled: receiptId !== undefined },
  )
  const { data: users } = useUsersQuery(
    { userIds: receipt ? [receipt.payerId, ...receipt.debts.map(d => d.debtorId)] : [] },
    { enabled: receipt !== undefined },
  )

  const saveMutation = useSaveReceiptMutation()

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const deleteMutation = useDeleteReceiptMutation()

  const photoInputRef = useRef<ElementRef<'input'>>(null)
  const [photoSrc, setPhotoSrc] = useState<string>()
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [photoPreviewLoaded, setPhotoPreviewLoaded] = useState(false)
  const [photoDeleteAlertOpen, setPhotoDeleteAlertOpen] = useState(false)

  const form = useForm<FormState>({ defaultValues })
  const [$amount, $tipAmount, $payer, $debts, $sharedExpenses, $photo] = form
    .watch(['amount', 'tipAmount', 'payer', 'debts', 'sharedExpenses', 'photo'])

  const { data: amountSuggestions, ...scanQuery } = useScanQuery(
    // @ts-expect-error Photo can be a boolean or undefined
    $photo,
    { enabled: !receiptId && $photo !== undefined && typeof $photo !== 'boolean', retry: false }
  )

  const enabledUsers = useMemo(() => $debts.filter(d => d.enabled).map(d => d.user), [$debts])
  const calculated = useMemo(() => calculateReceipt({
    amount: $amount,
    ...$tipAmount && { tipAmount: $tipAmount },
    sharedExpenses: $sharedExpenses,
    debts: $debts.filter(u => u.enabled).map(u => ({ debtorId: u.user.id, amount: u.amount })),
  }), [$amount, $sharedExpenses, $tipAmount, $debts])

  const validAmount = calculated.amount?.error ? undefined : calculated.amount
  const validSharedExpenses = calculated.sharedExpenses?.error ? undefined : calculated.sharedExpenses
  const validTipAmount = calculated.tipAmount?.error ? undefined : calculated.tipAmount
  const amountToSplitEvenly = calculated.amountMismatch ?? calculated.backfillAmount ?? 0
  const criticalAmountMismatch = (calculated.amountMismatch !== undefined && (calculated.amountMismatch < 0 || $sharedExpenses !== undefined))
    ? calculated.amountMismatch
    : undefined

  const isValid = useMemo(() => (
    $payer !== '' && (validTipAmount === undefined || validTipAmount.total < MAX_AMOUNT) &&
    !calculated.error && calculated.debts.length >= 2 && calculated.total > 0 &&
    calculated.amount.value <= MAX_AMOUNT
  ), [calculated, $payer, validTipAmount])

  const submit = form.handleSubmit(async (formState) => {
    if (calculated.error || formState.payer === '') return

    let toastId = createToast('Saving the receipt...', { type: 'loading' })

    try {
      await saveMutation.mutateAsync({
        receiptId,
        payerId: formState.payer.id,
        amount: calculated.amount.value,
        photo: formState.photo,
        description: formState.description,
        debts:  calculated.debts.map(debt => ({
          debtorId: debt.debtorId,
          amount: debt.total,
        })),
      })

      if (validTipAmount) {
        toastId = createToast(`Saving the tip...`, { type: 'loading', toastId })

        await saveMutation.mutateAsync({
          payerId: formState.tipPayer !== '' ? formState.tipPayer.id : formState.payer.id,
          amount: validTipAmount.total,
          description: formState.description ? `${formState.description} (tip)` : 'Tip',
          photo: false,
          debts: calculated.debts.map(debt => ({
            debtorId: debt.debtorId,
            amount: debt.tip ?? 0,
          })),
        })
      }

      createToast(`A ₴${formatAmount(calculated.total)} receipt has been saved`, {
        type: 'success',
        description: formState.description,
        toastId,
      })

      await router.navigate({ to: '/receipts' })
    } catch (error) {
      console.error(error)
      dismissToast(toastId)
    }
  })

  const handlePhotoSelect = useCallback(async (photos: File[]) => {
    setPhotoViewerOpen(false)

    if (photos.length === 0) {
      form.setValue('photo', false)
      return
    }

    if (photos.length > 3) {
      createToast('You can select up to 3 photos at once', { type: 'error' })
      form.setValue('photo', false)
      return
    }

    let toastId: ToastId | undefined

    try {
      const photo = await processImages(photos, (stage) => {
        if (stage === 'combining') {
          toastId = createToast('Combining the photos...', { type: 'loading', toastId })
        } else if (stage === 'compressing') {
          toastId = createToast('Compressing the photo...', { type: 'loading', toastId })
        } else if ('index' in stage) {
          const title = stage.stage === 'converting' ? 'Converting HEIC...' : 'Compressing the photo...'
          const progress = photos.length > 1 ? ` (${stage.index}/${photos.length})` : ''

          toastId = createToast(`${title}${progress}`, { type: 'loading', toastId })
        }
      })

      toastId = createToast('Photo has been processed', { type: 'success', toastId })

      form.setValue('photo', photo)
    } catch (error) {
      console.warn(error)
      toastId = createToast('Could not process the photo', {
        type: 'error',
        description: error instanceof Error ? error.message : undefined,
        toastId,
      })
    }
  }, [form])

  const rotatePhoto = useCallback(async (rotation: number) => {
    if (typeof $photo === 'boolean' || rotation === 0) {
      return
    }

    let toastId: ToastId | undefined

    try {
      const photo = await rotateImage($photo, rotation, (stage) => {
        if (stage === 'reading') {
          toastId = createToast('Reading the photo...', { type: 'loading', toastId })
        } else if (stage === 'rotating') {
          toastId = createToast('Rotating the photo...', { type: 'loading', toastId })
        } else if (stage === 'compressing') {
          toastId = createToast('Compressing the photo...', { type: 'loading', toastId })
        }
      })

      toastId = createToast('Photo has been rotated', { type: 'success', toastId })

      form.setValue('photo', photo)
    } catch (error) {
      console.warn(error)
      toastId = createToast('Could not rotate the photo', {
        type: 'error',
        description: error instanceof Error ? error.message : undefined,
        toastId,
      })
    }
  }, [$photo, form]);

  const selectPhoto = useCallback(() => {
    photoInputRef.current?.click()
  }, [])

  const handlePhotoInteraction = useCallback(() => {
    if ($photo) {
      setPhotoViewerOpen(true)
    } else {
      selectPhoto()
    }
  }, [$photo, selectPhoto])

  const deletePhoto = useCallback(() => {
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }

    form.setValue('photo', false)
    setPhotoDeleteAlertOpen(false)
  }, [form])

  const initialized = useInitialization(() => {
    if (!recentUsers) return

    if (receiptId) {
      if (!receipt || !users) return

      form.reset({
        ...defaultValues,
        amount: formatAmount(receipt.amount),
        payer: users.find(u => u.id === receipt.payerId) ?? '',
        description: receipt.description ?? '',
        photo: Boolean(receipt.photoFilename),
        debts: receipt.debts
          .map(debt => ({
            user: users.find(u => u.id === debt.debtorId)!,
            amount: debt.amount ? formatAmount(debt.amount) : '',
            enabled: true,
          }))
          .filter(d => d.user),
      })
    } else {
      form.reset({
        ...defaultValues,
        payer: currentUser,
        debts: recentUsers
          .slice(0, RECENT_USERS_LIMIT)
          .map((user, i) => ({
            user,
            amount: '',
            enabled: i <= 1,
          }))
      })
    }

    return true
  }, [currentUser, form, receipt, receiptId, recentUsers, users])

  useEffect(() => {
    setPhotoSrc(undefined)
    setPhotoPreviewLoaded(false)
    setPhotoViewerOpen(false)

    if (typeof $photo === 'boolean') {
      if ($photo && receipt?.photoFilename) {
        setPhotoSrc(getReceiptPhotoUrl(receipt.photoFilename))
      } else {
        setPhotoSrc(undefined)
      }
    } else {
      fileToDataUrl($photo).then(setPhotoSrc)
    }
  }, [$photo, receipt?.photoFilename])

  useEffect(() => {
    if ($payer === '' && enabledUsers.length > 0) {
      form.setValue('payer', enabledUsers.at(0) ?? '')
    }
  }, [$payer, enabledUsers, form])

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      createToast('Receipt has been deleted', { type: 'success' })
      router.navigate({ to: '/receipts' })
    }
  }, [deleteMutation.isSuccess, router])

  if (!initialized) {
    return <Skeleton className='h-[32rem] animation-down-top' />
  }

  return <>
    <ReceiptPhotoViewer
      photoSrc={photoSrc}
      open={photoViewerOpen}
      onClose={(rotation) => {
        setPhotoViewerOpen(false)
        rotatePhoto(rotation)
      }}
      onDelete={() => setPhotoDeleteAlertOpen(true)}
      onReplace={selectPhoto}
    />

    <Alert
      title='Delete photo?'
      confirm='Yes, delete it'
      open={photoDeleteAlertOpen}
      onConfirm={() => deletePhoto()}
      onCancel={() => setPhotoDeleteAlertOpen(false)}
    />

    <Alert
      title='Delete receipt?'
      confirm='Yes, delete it'
      disabled={deleteMutation.isPending}
      open={deleteAlertOpen}
      onConfirm={() => receiptId && deleteMutation.mutate(receiptId)}
      onCancel={() => setDeleteAlertOpen(false)}
    />

    <Form {...form}>
      <form onSubmit={submit}>
        <Card className={cn(
          'relative shadow-md animation-down-top transition',
          !(saveMutation.isIdle || saveMutation.isError) && 'grayscale opacity-70 pointer-events-none',
          criticalAmountMismatch && 'border-destructive'
        )}>
          {/* Photo */}
          <div className='absolute -top-2 -right-1 w-[5.5rem] h-[5.5rem]'>
            <input ref={photoInputRef} type='file' className='hidden' accept='image/png, image/jpeg, image/heic'
              multiple
              onChange={(event) => handlePhotoSelect([...event.target.files ?? []])} />
            <FormField
              control={form.control}
              name='photo'
              render={({ field }) => <>
                <Button
                  size='icon' variant={field.value ? 'default' : 'outline'}
                  className={cn(
                    'p-1 w-full h-full shadow-lg rotate-6 overflow-hidden fix-antialias',
                    field.value && 'hover:bg-primary',
                  )}
                  onClick={handlePhotoInteraction}>
                  {field.value ? <>
                    {!photoPreviewLoaded && (photoSrc ? <Spinner invert /> : <Image />)}
                    {photoSrc && <img
                      className={cn('animation-appear w-full h-full rounded-sm object-cover', !photoPreviewLoaded && 'hidden')}
                      onLoad={() => setPhotoPreviewLoaded(true)} src={photoSrc} />}
                  </> : <ImageOff />}
                </Button>
              </>}
            />
          </div>

          <CardHeader>
            <CardTitle>{receiptId ? 'Edit the receipt' : 'Record a receipt'}</CardTitle>

            {scanQuery.error instanceof ApiError && scanQuery.error.status === 429 && (
              <FormDescription className='w-[70%]'>Suggestions are not available at the moment.</FormDescription>
            )}
          </CardHeader>

          <CardContent className='flex flex-col gap-3 pb-3'>
            {/* Description */}
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => <>
                <FormItem className='flex flex-col'>
                  <FormLabel>Description</FormLabel>
                  <Input type='text' placeholder='(no description)' value={field.value} maxLength={64}
                    onChange={(event) => form.setValue('description', event.target.value)}/>
                </FormItem>

                <DescriptionSuggestions
                  description={field.value}
                  setDescription={(description) => form.setValue('description', description)}
                />
              </>}
            />

            {/* Amount */}
            <div className='flex flex-col gap-1'>
              <div className='flex flex-row gap-3'>
                <FormField
                  control={form.control}
                  name='payer'
                  render={({ field }) => (
                    <FormItem className='flex flex-col flex-auto w-32 min-w-0'>
                      <FormLabel>Payer</FormLabel>
                      <UserCombobox
                        users={enabledUsers}
                        selectedUser={field.value || undefined}
                        placeholder='Select payer'
                        onSelect={user => form.setValue('payer', user ?? '')}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='amount'
                  render={({ field }) => (
                    <FormItem className='flex flex-col flex-auto w-20'>
                      <FormLabel>Amount</FormLabel>
                      <Input type='text' value={field.value}
                        className={cn(field.value !== '' && calculated.amount?.error && 'border-destructive')}
                        onChange={(event) => form.setValue('amount', sanitizeMagicAmount(event.target.value))} />
                    </FormItem>
                  )}
                />
              </div>

              {/* Amount suggestions */}
              {amountSuggestions !== undefined && amountSuggestions.length > 0 && (
                <AmountSuggestions
                  variant='secondary'
                  suggestions={amountSuggestions}
                  amount={$amount}
                  onChange={(amount) => form.setValue('amount', amount)}
                />
              )}

              {validAmount && <Calculations input={{ amount: validAmount }} />}
            </div>
          </CardContent>
          <CardContent className='flex flex-col pt-3 bg-secondary py-3 gap-2'>
            {/* Debts */}
            <FormField
              control={form.control}
              name='debts'
              render={({ field }) => <>
                {field.value.map(($debt, i) => {
                  const debt = calculated.debts.find(d => d.debtorId === $debt.user.id)
                  const isValid = debt && !debt.error
                  const isError = debt && debt.error && $debt.amount !== ''

                  return <Fragment key={$debt.user.id}>
                    <div className='flex flex-col gap-1'>
                      <FormItem className='flex flex-row gap-3 space-y-0 items-stretch'>
                        <div className='flex flex-row flex-auto items-center w-32 min-w-0 h-10'>
                          <FormControl>
                            <Checkbox checked={$debt.enabled}
                              disabled={!$debt.enabled && enabledUsers.length >= ENABLED_USERS_LIMIT}
                              onCheckedChange={(checked) => {
                                form.setValue('debts', field.value.with(i, {
                                  ...$debt,
                                  ...checked !== true && { amount: '' },
                                  enabled: checked === true,
                                }))
                              }} />
                          </FormControl>
                          <FormLabel className='p-2 cursor-pointer overflow-hidden'>
                            <UserName user={$debt.user} />
                          </FormLabel>
                        </div>

                        {$debt.enabled && <FormControl>
                          <div className={cn(
                            'flex flex-col justify-center flex-auto relative w-20 transition-[width] animation-right-left',
                            isMagicalAmount($debt.amount) ? 'has-[:focus]:w-64' : '',
                          )}>
                            <Input type='text' focusOnEnd
                                className={cn(isError && 'border-destructive')}
                                placeholder={isValid ? formatAmount(debt.total) : ''} value={$debt.amount}
                                onChange={(event) => {
                                  form.setValue('debts', field.value.with(i, {
                                    ...$debt,
                                    amount: sanitizeMagicAmount(event.target.value)
                                  }))
                                }} />
                            {isValid && debt.automatic && <PoweredByMagic />}
                          </div>
                        </FormControl>}
                      </FormItem>

                      {/* Amount suggestions */}
                      {$debt.enabled && amountSuggestions !== undefined && amountSuggestions.length > 0 && (
                        <AmountSuggestions
                          variant='outline'
                          suggestions={amountSuggestions}
                          amount={$debt.amount}
                          onChange={(amount) => form.setValue('debts', field.value.with(i, { ...$debt, amount }))}
                        />
                      )}

                      {isValid && <Calculations input={{ debt }} />}
                    </div>

                    <Separator />
                  </Fragment>
                })}
              </>}
            />

            <UserCombobox
              onSelect={user => user && form.setValue('debts', [...$debts, { user: user, amount: '', enabled: true }])}
              exclude={$debts.map(d => d.user)}
              placeholder={<div className='flex flex-row items-center gap-2'><UserIcon className='w-4 h-4'/><span>Add user</span></div>}
              variant='link'
              disabled={enabledUsers.length >= ENABLED_USERS_LIMIT}
            />
          </CardContent>
          <CardContent className='flex flex-col py-3 gap-2'>
            {/* Shared expenses */}
            {$sharedExpenses === undefined && <>
              {amountToSplitEvenly && (
                <Button variant='link' className='flex flex-row items-center justify-start gap-2 p-0' onClick={() => form.setValue('sharedExpenses', '')}>
                  <Divide className='w-4 h-4'/>
                    <span>Split remaining <span className={cn(calculated.amountMismatch && 'text-destructive')}>₴{formatAmount(amountToSplitEvenly)}</span> evenly</span>
                </Button>
              )}

              <Button variant='link' className='flex flex-row items-center justify-start gap-2 p-0' onClick={() => form.setValue('sharedExpenses', '')}>
                <Users className='w-4 h-4'/><span>Add shared expenses</span>
              </Button>
            </>}

            {$sharedExpenses !== undefined && <FormField control={form.control} name='sharedExpenses' render={({ field }) => <>
              <div className='flex flex-col gap-1'>
                <FormItem className='flex flex-row gap-3 space-y-0 items-stretch h-10'>
                  <div className='flex flex-row flex-auto items-center w-32 min-w-0'>
                    <FormControl className='flex-none'>
                      <Checkbox
                        checked={field.value !== undefined}
                        onCheckedChange={(checked) => form.setValue('sharedExpenses', checked === true ? '' : undefined)}
                      />
                    </FormControl>
                    <FormLabel className='flex flex-row items-center gap-1 flex-auto overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer pl-2 py-3'>
                      <span className='truncate'>Shared expenses</span>
                    </FormLabel>
                  </div>

                  {field.value !== undefined && <FormControl>
                    <div className={cn(
                      'flex flex-col justify-center flex-auto w-20 transition-[width] relative animation-right-left',
                      isMagicalAmount($sharedExpenses) ? 'has-[:focus]:w-64' : '',
                    )}>
                      <Input type='text' value={field.value}
                          placeholder={validSharedExpenses ? formatAmount(validSharedExpenses.total) : ''}
                          className={cn(calculated.sharedExpenses?.error && 'border-destructive')}
                          onChange={(event) => {
                            form.setValue('sharedExpenses', sanitizeMagicAmount(event.target.value))
                          }} />
                      {validSharedExpenses?.automatic && <PoweredByMagic />}
                    </div>
                  </FormControl>}
                </FormItem>

                {/* Amount suggestions */}
                {amountSuggestions !== undefined && amountSuggestions.length > 0 && (
                  <AmountSuggestions
                    variant='secondary'
                    suggestions={amountSuggestions}
                    amount={$sharedExpenses}
                    onChange={(amount) => form.setValue('sharedExpenses', amount)}
                  />
                )}

                {validSharedExpenses && <Calculations input={{ sharedExpenses: validSharedExpenses }} />}
              </div>
            </>}/>}

            {/* Tip amount */}
            {!receiptId && <>
              {($sharedExpenses !== undefined || $tipAmount !== undefined) && <Separator />}

              {$tipAmount === undefined && (
                <Button variant='link' className='flex flex-row items-center justify-start p-0 gap-2' onClick={() => form.setValue('tipAmount', '')}>
                  <Coins className='w-4 h-4'/><span>Add tip</span>
                </Button>
              )}

              {$tipAmount !== undefined && <div className='flex flex-col gap-1 pt-3'>
                <div className='flex flex-row gap-3'>
                  <FormField
                    control={form.control}
                    name='tipPayer'
                    render={({ field }) => (
                      <FormItem className='flex flex-col flex-auto w-32 min-w-0'>
                        <FormLabel>Tip payer</FormLabel>
                        <UserCombobox
                          deselectable
                          users={enabledUsers}
                          selectedUser={field.value || undefined}
                          placeholder={$payer ? <UserName user={$payer} /> : 'Select tip payer'}
                          onSelect={user => form.setValue('tipPayer', user ?? '')}
                        />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='tipAmount'
                    render={({ field }) => (
                      <FormItem className='flex flex-col flex-auto w-20'>
                        <div className='flex flex-row justify-between items-center'>
                          <FormLabel>Tip amount</FormLabel>
                          <Button variant='link' className='p-0 min-h-0 h-auto grow justify-end' onClick={() => {
                            form.setValue('tipAmount', undefined)
                            form.setValue('tipPayer', '')
                          }}>
                            <EyeOff className='w-4 h-4' />
                          </Button>
                        </div>
                        <Input type='text' value={field.value}
                          className={cn(calculated.debts.length > 0 && calculated.tipAmount?.error && 'border-destructive')}
                          onChange={(event) => form.setValue('tipAmount', sanitizeMagicAmount(event.target.value))} />
                      </FormItem>
                    )}
                  />
                </div>

                {validTipAmount && <Calculations input={{ tipAmount: validTipAmount }} />}
              </div>}
            </>}
          </CardContent>
          <CardFooter className='flex flex-col items-stretch bg-secondary gap-3 pt-3 rounded-b-md'>
            {/* Amount mismatch */}
            {criticalAmountMismatch && (
              <div className='flex flex-row items-center justify-between gap-3 text-destructive'>
                <div className='flex flex-row items-center gap-2 flex-auto'>
                  <AlertCircle className='w-4 h-4' />
                  <span>{criticalAmountMismatch > 0 ? 'Remaining' : 'Amount mismatch'}</span>
                </div>

                <div className='flex-none'>
                  {formatAmount(criticalAmountMismatch)}
                </div>
              </div>
            )}

            {saveMutation.error && <div className='flex flex-row items-center gap-2 flex-auto text-destructive'>
              <AlertCircle className='w-4 h-4' />
              <span>{saveMutation.error.message}</span>
            </div>}

            {/* Save button */}
            <Button type='submit' disabled={!isValid}>
              {calculated.total
                ? <>Save ₴{formatAmount(calculated.total)} receipt</>
                : <>Save receipt</>}
            </Button>

            {receiptId && (
              <Button variant='destructive' onClick={() => setDeleteAlertOpen(true)}>
                Delete the receipt
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  </>
}
