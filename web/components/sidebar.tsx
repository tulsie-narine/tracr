'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { config } from '@/lib/env'
import { 
  LayoutDashboard, 
  Monitor, 
  Package, 
  Users, 
  Settings, 
  Menu, 
  X 
} from 'lucide-react'
import UserMenu from './user-menu'

interface NavigationItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: ('viewer' | 'admin')[]
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['viewer', 'admin'],
  },
  {
    label: 'Devices',
    href: '/devices',
    icon: Monitor,
    roles: ['viewer', 'admin'],
  },
  {
    label: 'Software',
    href: '/software',
    icon: Package,
    roles: ['viewer', 'admin'],
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit',
    icon: Settings,
    roles: ['admin'],
  },
]

export default function Sidebar() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!user) return null

  // Filter navigation items based on user role
  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(user.role)
  )

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const sidebarContent = (
    <>
      {/* App name/logo */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-primary">{config.appName}</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const active = isActiveRoute(item.href)
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-accent text-accent-foreground border-l-4 border-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User menu at bottom */}
      <div className="p-4 border-t">
        <UserMenu />
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-background border shadow-sm"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-screen md:w-64 bg-background border-r shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <aside className="relative flex flex-col w-64 h-full bg-background border-r shadow-lg">
            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}