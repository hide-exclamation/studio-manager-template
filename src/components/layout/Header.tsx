'use client'

import { Search } from 'lucide-react'
import { NotificationBell } from '@/components/notifications'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="h-16 flex items-center justify-between px-6 shrink-0"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)'
      }}
    >
      {/* Title */}
      <div>
        <h1
          className="text-xl"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)'
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Search size={20} strokeWidth={1.5} />
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm ml-2"
          style={{
            backgroundColor: 'var(--color-accent-lavender)',
            color: 'var(--color-text-primary)'
          }}
        >
          A
        </div>
      </div>
    </header>
  )
}
