import { toast, type ExternalToast } from 'sonner'

export type ToastId = ReturnType<typeof createToast>
export type ToastType = Exclude<keyof typeof toast, 'custom' | 'promise'>

export const createToast = (title: string, options?: ExternalToast & { toastId?: number | string; type?: ToastType }) => {
  const method = options?.type ? toast[options.type] : toast

  try {
    if (options?.type === 'error' || options?.type === 'warning' || options?.type === 'success') {
      if (window.Telegram?.WebApp?.initData) {
        window.Telegram?.WebApp.HapticFeedback.notificationOccurred(options.type)
      }
    }
  } catch { /* noop */ }

  return method(title, {
    id: options?.toastId,
    description: undefined,
    ...options,
  })
}

export const dismissToast = (toastId: ToastId | undefined) => {
  return toast.dismiss(toastId)
}
