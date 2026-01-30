'use client'

import { ReactNode, useEffect } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { NotificationProvider } from '@/components/notifications'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent fail - SW registration is not critical
      })
    }
  }, [])

  return (
    <ToastProvider>
      <ConfirmProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
