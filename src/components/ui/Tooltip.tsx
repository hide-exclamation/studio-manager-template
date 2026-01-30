'use client'

import { ReactNode, useState } from 'react'

type TooltipProps = {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, position = 'bottom' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  const positionStyles = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '6px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '6px' },
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute z-50 px-2 py-1 text-xs font-medium rounded whitespace-nowrap pointer-events-none"
          style={{
            backgroundColor: 'var(--color-bg-dark)',
            color: 'var(--color-text-inverse)',
            ...positionStyles[position],
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
