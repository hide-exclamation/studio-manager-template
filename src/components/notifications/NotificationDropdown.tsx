'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, Bell } from 'lucide-react'
import { useNotifications } from './NotificationProvider'
import { NotificationItem } from './NotificationItem'

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[480px] rounded-xl shadow-lg overflow-hidden z-50"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <h3
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Notifications
                {unreadCount > 0 && (
                  <span
                    className="ml-2 px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: 'var(--color-accent-rose)',
                      color: 'white',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-black/5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <CheckCheck size={14} />
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[380px] p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div
                    className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--color-border-medium)', borderTopColor: 'transparent' }}
                  />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <Bell size={24} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Aucune notification
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onClose={onClose}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
