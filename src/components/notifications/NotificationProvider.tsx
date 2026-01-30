'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  NotificationData,
  fetchNotifications,
  checkNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/lib/notifications'

interface NotificationContextType {
  notifications: NotificationData[]
  unreadCount: number
  isLoading: boolean
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

const POLLING_INTERVAL = 60000 // 60 seconds

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      // Check for new notifications first
      await checkNotifications()

      // Then fetch the list
      const data = await fetchNotifications(20, 0, false)
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
    }
  }, [])

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      const notification = notifications.find(n => n.id === id)
      await deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }, [notifications])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await refresh()
      setIsLoading(false)
    }
    load()
  }, [refresh])

  // Polling
  useEffect(() => {
    const interval = setInterval(refresh, POLLING_INTERVAL)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        refresh,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDeleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
