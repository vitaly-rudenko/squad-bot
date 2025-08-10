import { superstructResolver } from '@hookform/resolvers/superstruct'
import { Button } from '@/components/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/form'
import { cn } from '@/utils/cn'
import { FC, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Infer, object, string } from 'superstruct'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { useInitialization } from '@/utils/hooks'
import { useGroupQuery } from '@/groups/api'
import { ArrowLeft } from 'lucide-react'
import { useLinkQuery, useLinksQuery, useSaveLinkMutation } from './api'
import { useRouter } from '@tanstack/react-router'
import { createToast, dismissToast } from '@/utils/toast'

const formSchema = object({
  label: string(),
  url: string(),
})

type FormState = Infer<typeof formSchema>

const defaultValues: FormState = {
  label: '',
  url: '',
}

export const LinkEditor: FC<{
  groupId: string
  linkId?: string
}> = ({ groupId, linkId }) => {
  const router = useRouter()

  const { data: group } = useGroupQuery(groupId)
  const saveMutation = useSaveLinkMutation()

  const { data: links } = useLinksQuery({ groupId, page: 1, perPage: 1 })
  const { data: link } = useLinkQuery(
    linkId ?? '',
    { enabled: linkId !== undefined },
  )

  const form = useForm<FormState>({
    resolver: superstructResolver(formSchema),
    defaultValues,
  })

  const [$label, $url] = form.watch(['label', 'url'])

  const valid = useMemo(() => (
    $label.trim().length > 0 &&
    $url.trim().length > 0 &&
    isValidUrl($url.trim())
  ), [$label, $url])

  const initialized = useInitialization(() => {
    if (!group) return

    if (linkId) {
      if (!link) return

      form.reset({
        label: link.label,
        url: link.url,
      })
    } else {
      form.reset(defaultValues)
    }

    return true
  }, [form, group, link, linkId])

  const onSubmit = useCallback(async (formState: FormState) => {
    if (!links || (linkId && !link)) return

    const toastId = createToast('Saving the link...', { type: 'loading' })

    try {
      await saveMutation.mutateAsync({
        id: Number(linkId),
        groupId,
        label: formState.label.trim(),
        url: formState.url.trim(),
      })

      createToast(`The link has been saved`, { type: 'success', toastId })

      await router.navigate({ to: '/groups/$groupId/links', params: { groupId } })
    } catch (error) {
      console.error(error)
      dismissToast(toastId)
    }
  }, [groupId, link, linkId, links, router, saveMutation])

  if (!group || !initialized) {
    return <Skeleton className='h-[32rem] animation-down-top' />
  }

  return <div className='flex flex-col gap-2'>
    <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline justify-start'
      onClick={() => router.navigate({ to: '/groups/$groupId/links', params: { groupId } })}>
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
              {linkId ? 'Edit the link' : 'Add a link'}
            </CardTitle>
          </CardHeader>

          <CardContent className='flex flex-col gap-3 pb-3'>
            {/* Label */}
            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Label'
                      maxLength={64}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL */}
            <FormField
              control={form.control}
              name='url'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='https://example.com'
                      maxLength={2048}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className='flex flex-col items-stretch bg-secondary gap-3 pt-3'>
            {/* Save button */}
            <Button type='submit' disabled={!valid}>Save link</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  </div>
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
