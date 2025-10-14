'use client'

import { useState } from 'react'

// Prevent static generation for this page
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw 
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

import { fetchUsers } from '@/lib/api-client'
import { config } from '@/lib/env'
import { useAuth } from '@/lib/auth-context'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { UserRoleBadge } from '@/components/user-role-badge'
import { CreateUserDialog } from '@/components/create-user-dialog'
import { EditUserDialog } from '@/components/edit-user-dialog'
import { DeleteUserDialog } from '@/components/delete-user-dialog'

export default function UsersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const limit = 50

  const { data, error, isLoading, mutate } = useSWR(
    user?.role === 'admin' ? [config.apiUrl + '/v1/users', { page, limit }] : null,
    () => fetchUsers(page, limit),
    { refreshInterval: 60000 }
  )

  // Role-based access control
  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You do not have permission to access this page. Only administrators can manage users.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  const handleRefresh = () => {
    mutate()
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
            {data && (
              <span className="ml-2">
                • {data.pagination.total} total users
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <CreateUserDialog onSuccess={handleRefresh} />
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive">
                    Error loading users: {error.message}
                  </TableCell>
                </TableRow>
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.username}</div>
                    </TableCell>
                    <TableCell>
                      <UserRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div 
                        className="text-sm text-muted-foreground"
                        title={format(new Date(user.created_at), 'PPpp')}
                      >
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div 
                        className="text-sm text-muted-foreground"
                        title={format(new Date(user.updated_at), 'PPpp')}
                      >
                        {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <EditUserDialog user={user} onSuccess={handleRefresh} />
                        <DeleteUserDialog user={user} onSuccess={handleRefresh} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {data && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, data.pagination.total)} of {data.pagination.total} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {data.pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= data.pagination.total_pages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}