import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Copy, Globe, Loader2, Mail, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useToast } from '@/hooks/use-toast';

const inviteFormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  role: z.enum(['admin', 'editor', 'viewer'], {
    required_error: 'Please select a role.',
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface BoardShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  boardName: string;
}

// Mock board members
const mockBoardMembers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: '',
    role: 'admin',
    joinedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatarUrl: '',
    role: 'editor',
    joinedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Alex Johnson',
    email: 'alex@example.com',
    avatarUrl: '',
    role: 'viewer',
    joinedAt: new Date().toISOString(),
  },
];

export function BoardShareDialog({ open, onOpenChange, boardId, boardName }: BoardShareDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shareLink] = useState(`https://app.example.com/boards/${boardId}`);
  const [sharePermission, setSharePermission] = useState<'private' | 'view' | 'edit'>('private');

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  });

  // Mock API calls
  const inviteMutation = useMutation({
    mutationFn: (_data: InviteFormValues) => {
      // Mock implementation
      return new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
      toast({
        title: 'Invitation sent',
        description: 'An invitation email has been sent to the user.',
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: 'Failed to send invitation',
        description: 'There was an error sending the invitation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateShareSettingsMutation = useMutation({
    mutationFn: (_permission: 'private' | 'view' | 'edit') => {
      // Mock implementation
      return new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
    },
    onSuccess: () => {
      toast({
        title: 'Share settings updated',
        description: 'Board sharing settings have been updated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update settings',
        description: 'There was an error updating the share settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: (_params: { memberId: string; role: string }) => {
      // Mock implementation
      return new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
      toast({
        title: 'Role updated',
        description: 'The member role has been updated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update role',
        description: 'There was an error updating the member role. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (_memberId: string) => {
      // Mock implementation
      return new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the board.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to remove member',
        description: 'There was an error removing the member. Please try again.',
        variant: 'destructive',
      });
    },
  });

  function onInviteSubmit(values: InviteFormValues) {
    inviteMutation.mutate(values);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: 'Link copied',
      description: 'Share link has been copied to clipboard.',
    });
  }

  function handleSharePermissionChange(permission: 'private' | 'view' | 'edit') {
    setSharePermission(permission);
    updateShareSettingsMutation.mutate(permission);
  }

  function handleRoleChange(memberId: string, role: string) {
    updateMemberRoleMutation.mutate({ memberId, role });
  }

  function handleRemoveMember(memberId: string) {
    removeMemberMutation.mutate(memberId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Board</DialogTitle>
          <DialogDescription>
            Invite people to collaborate on "{boardName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite People</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4">
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-10" placeholder="Email address" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Invite
                  </Button>
                </div>
              </form>
            </Form>

            <div className="border rounded-md p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">Share with link</h4>
                    <p className="text-sm text-muted-foreground">Anyone with the link can access this board</p>
                  </div>
                </div>

                <Select
                  value={sharePermission}
                  onValueChange={(value) => handleSharePermissionChange(value as any)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="view">Can view</SelectItem>
                    <SelectItem value="edit">Can edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sharePermission !== 'private' && (
                <div className="flex gap-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <div className="space-y-4">
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockBoardMembers.map((member) => {
                      const userInitials = member.name.split(' ').map(n => n[0]).join('');

                      return (
                        <tr key={member.id} className="border-b last:border-0">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatarUrl} alt={member.name} />
                                <AvatarFallback>{userInitials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Select
                              defaultValue={member.role}
                              onValueChange={(value) => handleRoleChange(member.id, value)}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Role permissions:</span>
                </p>
                <ul className="ml-6 mt-1 list-disc space-y-1">
                  <li><strong>Admin:</strong> Full access to edit board, manage members, and change settings</li>
                  <li><strong>Editor:</strong> Can edit board content but cannot manage members or settings</li>
                  <li><strong>Viewer:</strong> Can only view board content without making changes</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}