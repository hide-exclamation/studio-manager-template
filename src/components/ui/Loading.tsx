'use client'

import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  }

  return (
    <Loader2
      size={sizeMap[size]}
      className={clsx('animate-spin', className)}
      style={{ color: 'var(--color-text-muted)' }}
    />
  )
}

interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message = 'Chargement...' }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-primary)]/80 backdrop-blur-sm z-10">
      <Spinner size="lg" />
      {message && (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">{message}</p>
      )}
    </div>
  )
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseStyles = clsx(
    'animate-pulse bg-[var(--color-bg-tertiary)]',
    variant === 'text' && 'rounded h-4',
    variant === 'circular' && 'rounded-full',
    variant === 'rectangular' && 'rounded-lg'
  )

  return (
    <div
      className={clsx(baseStyles, className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
      }}
    >
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="80%" height={12} />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex gap-4"
        style={{ borderBottom: '1px solid var(--color-border-light)' }}
      >
        <Skeleton width="20%" height={14} />
        <Skeleton width="30%" height={14} />
        <Skeleton width="15%" height={14} />
        <Skeleton width="15%" height={14} />
        <Skeleton width="10%" height={14} />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="px-5 py-4 flex items-center gap-4"
          style={{ borderBottom: i < rows - 1 ? '1px solid var(--color-border-light)' : undefined }}
        >
          <Skeleton width="20%" height={12} />
          <Skeleton width="30%" height={12} />
          <Skeleton width="15%" height={12} />
          <Skeleton width="15%" height={12} />
          <Skeleton width="10%" height={12} />
        </div>
      ))}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton width={200} height={28} />
        <Skeleton width={300} height={16} />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <SkeletonTable rows={5} />
    </div>
  )
}
