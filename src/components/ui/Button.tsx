'use client'

import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import styles from './Button.module.css'

type BaseButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseButtonProps {}

export interface LinkButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>, BaseButtonProps {
  href: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin" />
        ) : icon && iconPosition === 'left' ? (
          icon
        ) : null}

        {children}

        {!loading && icon && iconPosition === 'right' ? icon : null}
      </button>
    )
  }
)

Button.displayName = 'Button'

// LinkButton - A button that renders as a link
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      children,
      href,
      ...props
    },
    ref
  ) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          className
        )}
        {...props}
      >
        {icon && iconPosition === 'left' ? icon : null}
        {children}
        {icon && iconPosition === 'right' ? icon : null}
      </Link>
    )
  }
)

LinkButton.displayName = 'LinkButton'

// IconButton - A square button for icon-only actions
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  label: string // Required for accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      label,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          styles.iconButton,
          styles[`icon${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
          styles[`icon${size.charAt(0).toUpperCase() + size.slice(1)}`],
          className
        )}
        disabled={disabled}
        aria-label={label}
        title={label}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
