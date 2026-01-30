'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  Receipt,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  BookMarked,
  BarChart3,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { DEFAULTS } from '@/lib/settings'

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Projets', href: '/projets', icon: FolderKanban },
  { name: 'Taches', href: '/taches', icon: CheckSquare },
  { name: 'Devis', href: '/devis', icon: FileText },
  { name: 'Factures', href: '/factures', icon: Receipt },
  { name: 'Depenses', href: '/depenses', icon: Wallet },
  { name: 'Statistiques', href: '/statistiques', icon: BarChart3 },
  { name: 'Bibliotheque', href: '/parametres/bibliotheque', icon: BookMarked },
  { name: 'Parametres', href: '/parametres', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [companyName, setCompanyName] = useState(DEFAULTS.companyName)
  const [companyShortName, setCompanyShortName] = useState(DEFAULTS.companyShortName)

  useEffect(() => {
    // Fetch company info for sidebar display
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.companyName) {
          setCompanyName(data.companyName)
          setCompanyShortName(data.companyShortName || data.companyName.substring(0, 2).toUpperCase())
        }
      })
      .catch(() => {
        // Use defaults if fetch fails
      })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 ease-out z-50',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border-light)'
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center px-5 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-light)' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-xl font-normal"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {collapsed ? companyShortName : companyName}
          </span>
          {!collapsed && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--color-accent-lavender)',
                color: 'var(--color-text-primary)'
              }}
            >
              Studio
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={clsx(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                    collapsed && 'justify-center',
                    isActive
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon
                    size={20}
                    strokeWidth={1.5}
                    className={clsx(
                      'transition-transform duration-200',
                      !isActive && 'group-hover:scale-110'
                    )}
                  />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: '1px solid var(--color-border-light)' }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-2',
            'text-[var(--color-text-secondary)] transition-all duration-200',
            'hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight size={20} strokeWidth={1.5} />
          ) : (
            <>
              <ChevronLeft size={20} strokeWidth={1.5} />
              <span>Réduire</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
            'text-[var(--color-text-secondary)] transition-all duration-200',
            'hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--color-status-error)]',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={20} strokeWidth={1.5} />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
