'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  LogOut, 
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const handleLogout = () => {
    logout() // This handles the redirect automatically
  }

  const getUserInitial = (username: string) => {
    return username.charAt(0).toUpperCase()
  }

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'default' : 'secondary'
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 p-3 h-auto"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* User avatar */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {getUserInitial(user.username)}
        </div>
        
        {/* User info */}
        <div className="flex-1 text-left">
          <div className="text-sm font-medium">{user.username}</div>
          <Badge 
            variant={getRoleBadgeVariant(user.role)} 
            className="text-xs mt-1"
          >
            {user.role}
          </Badge>
        </div>
        
        {/* Chevron icon */}
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg p-2 z-50">
          {/* User info section */}
          <div className="px-3 py-2 border-b">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">{user.username}</div>
                <div className="text-xs text-muted-foreground">
                  Role: {user.role}
                </div>
              </div>
            </div>
          </div>
          
          {/* Logout button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}