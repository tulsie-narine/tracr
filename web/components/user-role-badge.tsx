'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, Eye } from 'lucide-react'
import { UserRole } from '@/types/user'

interface UserRoleBadgeProps {
  role: UserRole
}

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  if (role === 'admin') {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      <Eye className="h-3 w-3 mr-1" />
      Viewer
    </Badge>
  )
}