'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuHeight = 100 // Estimated menu height
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      // Determine vertical placement
      const placement = spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'top' : 'bottom'

      // Calculate position
      const top = placement === 'bottom' ? rect.bottom + 4 : rect.top - 4
      const left = align === 'right' ? rect.right : rect.left

      setPosition({ top, left, placement })
    }
  }, [isOpen, align])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <>
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: position.placement === 'bottom' ? -8 : 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: position.placement === 'bottom' ? -8 : 8 }}
              transition={{ duration: 0.15, ease: [0.19, 1, 0.22, 1] }}
              className="fixed z-50 min-w-[160px] py-1 rounded-lg shadow-lg"
              style={{
                top: position.placement === 'bottom' ? position.top : 'auto',
                bottom: position.placement === 'top' ? window.innerHeight - position.top : 'auto',
                left: align === 'right' ? 'auto' : position.left,
                right: align === 'right' ? window.innerWidth - position.left : 'auto',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
              }}
              onClick={() => setIsOpen(false)}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'danger'
  icon?: ReactNode
}

export function DropdownItem({ children, onClick, variant = 'default', icon }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-tertiary)]"
      style={{
        color: variant === 'danger' ? 'var(--color-status-error)' : 'var(--color-text-primary)',
      }}
    >
      {icon}
      {children}
    </button>
  )
}
