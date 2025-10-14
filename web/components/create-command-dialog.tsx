'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Loader2 } from 'lucide-react'
import { createDeviceCommand } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

const commandSchema = z.object({
  command_type: z.enum(['refresh_now']),
  force: z.boolean(),
})

type CommandFormData = z.infer<typeof commandSchema>

interface CreateCommandDialogProps {
  deviceId: string
  onSuccess: () => void
}

export default function CreateCommandDialog({ deviceId, onSuccess }: CreateCommandDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  const form = useForm<CommandFormData>({
    resolver: zodResolver(commandSchema),
    defaultValues: {
      command_type: 'refresh_now',
      force: false,
    },
  })

  // Only show to admin users
  if (!user || user.role !== 'admin') {
    return null
  }

  async function onSubmit(values: CommandFormData) {
    setIsSubmitting(true)
    try {
      await createDeviceCommand(deviceId, {
        command_type: values.command_type,
        payload: { force: values.force },
      })
      
      setOpen(false)
      form.reset()
      onSuccess()
    } catch (error) {
      // Error will be shown in the form
      console.error('Failed to create command:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Command
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Command</DialogTitle>
          <DialogDescription>
            The command will be queued for execution on the device.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="command_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Command Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select command type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="refresh_now">Refresh Now</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the command to execute on this device
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="force"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Force Refresh</FormLabel>
                    <FormDescription>
                      Force immediate data collection even if recent snapshot exists
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}