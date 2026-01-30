'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  const variantStyles = {
    danger: {
      icon: 'var(--color-status-error)',
      iconBg: 'rgba(239, 68, 68, 0.1)',
    },
    warning: {
      icon: 'var(--color-status-warning)',
      iconBg: 'rgba(234, 179, 8, 0.1)',
    },
    info: {
      icon: 'var(--color-status-info)',
      iconBg: 'rgba(59, 130, 246, 0.1)',
    },
  }

  const currentVariant = state?.variant || 'warning'

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={handleCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
              className="w-full max-w-md rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: variantStyles[currentVariant].iconBg }}
                  >
                    <AlertTriangle
                      size={20}
                      style={{ color: variantStyles[currentVariant].icon }}
                    />
                  </div>
                  <div className="flex-1">
                    {state.title && (
                      <h3
                        className="text-lg font-medium mb-1"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {state.title}
                      </h3>
                    )}
                    <p
                      className="text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {state.message}
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-1 rounded-lg transition-colors hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex justify-end gap-3 px-6 py-4"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderTop: '1px solid var(--color-border-light)',
                }}
              >
                <Button variant="secondary" onClick={handleCancel}>
                  {state.cancelText || 'Annuler'}
                </Button>
                <Button
                  variant={currentVariant === 'danger' ? 'danger' : 'primary'}
                  onClick={handleConfirm}
                >
                  {state.confirmText || 'Confirmer'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}
