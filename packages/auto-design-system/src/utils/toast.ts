/**
 * A simple mock for react-hot-toast
 * This provides a drop-in replacement for the CopyButton component
 */

type ToastOptions = {
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
  duration?: number
}

const toast = {
  success: (message: string, options?: ToastOptions) => {
    console.log(`[Toast Success] ${message}`, options)
    return 'toast-id'
  },
  error: (message: string, options?: ToastOptions) => {
    console.log(`[Toast Error] ${message}`, options)
    return 'toast-id'
  },
  loading: (message: string, options?: ToastOptions) => {
    console.log(`[Toast Loading] ${message}`, options)
    return 'toast-id'
  },
  dismiss: (toastId?: string) => {
    console.log(`[Toast Dismiss] ${toastId || 'all'}`)
  },
}

export default toast
