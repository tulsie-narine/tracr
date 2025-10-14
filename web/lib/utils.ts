import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { DeviceStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format bytes to human-readable format
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const decimals = 2
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}

// Format uptime hours to human-readable format
export function formatUptime(hours: number): string {
  if (hours < 24) {
    return `${Math.round(hours)} hours`
  } else if (hours < 720) { // Less than 30 days
    return `${Math.round(hours / 24)} days`
  } else {
    return `${Math.round(hours / 720)} months`
  }
}

// Format percentage from value and total
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0.0%'
  return ((value / total) * 100).toFixed(1) + '%'
}

// Get status colors for consistent theming
export function getStatusColor(status: DeviceStatus, isOnline: boolean): {
  text: string
  bg: string
  border: string
} {
  if (isOnline) {
    return {
      text: 'text-green-800',
      bg: 'bg-green-100',
      border: 'border-green-200',
    }
  }
  
  switch (status) {
    case 'error':
      return {
        text: 'text-red-800',
        bg: 'bg-red-100',
        border: 'border-red-200',
      }
    case 'inactive':
      return {
        text: 'text-yellow-800',
        bg: 'bg-yellow-100',
        border: 'border-yellow-200',
      }
    case 'offline':
    default:
      return {
        text: 'text-gray-800',
        bg: 'bg-gray-100',
        border: 'border-gray-200',
      }
  }
}

// Get volume status color based on usage percentage
export function getVolumeStatusColor(usedPercent: number): string {
  if (usedPercent < 80) {
    return 'bg-green-500'
  } else if (usedPercent < 90) {
    return 'bg-yellow-500'
  } else {
    return 'bg-red-500'
  }
}
