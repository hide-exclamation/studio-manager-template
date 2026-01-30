'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Clock,
  CalendarX,
  Eye,
  CheckCircle,
  CalendarClock,
  Pause,
  Timer,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { NotificationType } from '@prisma/client'
import { NotificationData, notificationColors } from '@/lib/notifications'

const iconMap: Record<NotificationType, React.ElementType> = {
  INVOICE_OVERDUE: AlertTriangle,
  INVOICE_REMINDER: Clock,
  QUOTE_EXPIRED: CalendarX,
  QUOTE_VIEWED: Eye,
  QUOTE_ACCEPTED: CheckCircle,
  TASK_DUE_SOON: CalendarClock,
  PROJECT_PAUSED: Pause,
  HOUR_BANK_LOW: Timer,
}

interface NotificationItemProps {
  notification: NotificationData
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClose,
}: NotificationItemProps) {
  const router = useRouter()
  const Icon = iconMap[notification.type] || AlertTriangle
  const color = notificationColors[notification.type] || 'var(--color-text-muted)'

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(notification.id)
  }

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: fr,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={handleClick}
      className="group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
      style={{
        backgroundColor: notification.isRead ? 'transparent' : 'rgba(var(--color-accent-lavender-rgb), 0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.isRead
          ? 'transparent'
          : 'rgba(var(--color-accent-lavender-rgb), 0.08)'
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={16} style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {notification.title}
          </span>
          {!notification.isRead && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--color-accent-rose)' }}
            />
          )}
        </div>
        <p
          className="text-xs mt-0.5 line-clamp-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {notification.message}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {timeAgo}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
