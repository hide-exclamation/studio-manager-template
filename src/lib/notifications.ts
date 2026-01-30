import { NotificationType } from '@prisma/client'

export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  relatedId: string | null
  relatedType: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationResponse {
  notifications: NotificationData[]
  total: number
  unreadCount: number
}

// Map notification types to icons (lucide icon names)
export const notificationIcons: Record<NotificationType, string> = {
  INVOICE_OVERDUE: 'AlertTriangle',
  INVOICE_REMINDER: 'Clock',
  QUOTE_EXPIRED: 'CalendarX',
  QUOTE_VIEWED: 'Eye',
  QUOTE_ACCEPTED: 'CheckCircle',
  TASK_DUE_SOON: 'CalendarClock',
  PROJECT_PAUSED: 'Pause',
  HOUR_BANK_LOW: 'Timer',
}

// Map notification types to colors
export const notificationColors: Record<NotificationType, string> = {
  INVOICE_OVERDUE: 'var(--color-status-error)',
  INVOICE_REMINDER: 'var(--color-status-warning)',
  QUOTE_EXPIRED: 'var(--color-status-warning)',
  QUOTE_VIEWED: 'var(--color-status-info)',
  QUOTE_ACCEPTED: 'var(--color-status-success)',
  TASK_DUE_SOON: 'var(--color-accent-lavender)',
  PROJECT_PAUSED: 'var(--color-text-muted)',
  HOUR_BANK_LOW: 'var(--color-status-warning)',
}

// Fetch notifications from API
export async function fetchNotifications(
  limit = 20,
  offset = 0,
  unreadOnly = false
): Promise<NotificationResponse> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      unreadOnly: unreadOnly.toString(),
    })

    const response = await fetch(`/api/notifications?${params}`)

    // Return empty response on any error
    if (!response.ok) {
      console.warn('Notifications API error:', response.status)
      return { notifications: [], total: 0, unreadCount: 0 }
    }

    return response.json()
  } catch (error) {
    console.warn('Failed to fetch notifications:', error)
    return { notifications: [], total: 0, unreadCount: 0 }
  }
}

// Check and generate new notifications
export async function checkNotifications(): Promise<{ created: number }> {
  try {
    const response = await fetch('/api/notifications/check', {
      method: 'POST',
    })

    // Skip silently on any error
    if (!response.ok) {
      return { created: 0 }
    }

    return response.json()
  } catch (error) {
    console.warn('Failed to check notifications:', error)
    return { created: 0 }
  }
}

// Mark a notification as read
export async function markAsRead(id: string): Promise<NotificationData> {
  const response = await fetch(`/api/notifications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRead: true }),
  })
  if (!response.ok) {
    throw new Error('Failed to mark notification as read')
  }
  return response.json()
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<{ count: number }> {
  const response = await fetch('/api/notifications/read-all', {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read')
  }
  return response.json()
}

// Delete a notification
export async function deleteNotification(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete notification')
  }
}

// Create a notification (for real-time events like QUOTE_VIEWED)
export async function createNotification(data: {
  type: NotificationType
  title: string
  message: string
  link?: string
  relatedId?: string
  relatedType?: string
}): Promise<NotificationData> {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error('Failed to create notification')
  }
  return response.json()
}
