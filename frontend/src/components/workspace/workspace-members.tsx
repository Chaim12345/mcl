import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, MoreHorizontal, UserPlus } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
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
import { useToast } from '@/hooks/use-toast';
import { workspaceService } from '@/services/workspace-service';
import { useAuthStore } from '@/stores/auth-store';
import { WorkspaceMember } from '@/types';

const inviteFormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  role: z.enum(['admin', 'member'], {
    required_error: 'Please select a role.',
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface WorkspaceMembersProps {
  workspaceId: string;
}

export function WorkspaceMembers({ workspaceId }: WorkspaceMembersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  
  const { data: members, isLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspaceService.getWorkspaceMembers(workspaceId),
  });
  
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'member',
    },
  });
  
  const inviteMutation = useMutation({
    mutationFn: (data: InviteFormValues) => 
      workspaceService.inviteToWorkspace(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({
        title: 'Invitation sent',
        description: 'An invitation email has been sent to the user.',
      });
      inviteForm.reset();
      setIsInviteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to send invitation',
        description: 'There was an error sending the invitation. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) => 
      workspaceService.updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({
        title: 'Role updated',
        description: 'The member role has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update role',
        description: 'There was an error updating the member role. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => 
      workspaceService.removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the workspace.',
      });
    },
    onError: (error) => {
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
  
  function handleRoleChange(member: WorkspaceMember, role: 'admin' | 'member') {
    if (member.role !== role) {
      updateRoleMutation.mutate({ userId: member.userId, role });
    }
  }
  
  function handleRemoveMember(member: WorkspaceMember) {
    removeMemberMutation.mutate(member.userId);
  }
  
  // Check if the current user is an admin
  const isCurrentUserAdmin = members?.some(
    (member) => member.userId === user?.id && member.role === 'admin'
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Members ({members?.length || 0})</h3>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : members && members.length > 0 ? (
        <div className="border rounded-md">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">User</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isCurrentUser = member.userId === user?.id;
                const userInitials = member.user 
                  ? `${member.user.firstName.charAt(0)}${member.user.lastName.charAt(0)}` 
                  : 'U';
                
                return (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user?.avatarUrl} alt={member.user?.firstName} />
                          <AvatarFallback>{userInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.user?.firstName} {member.user?.lastName}
                            {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {member.user?.email}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          member.role === 'admin' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {isCurrentUserAdmin && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member, 'admin')}
                              disabled={member.role === 'admin'}
                            >
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member, 'member')}
                              disabled={member.role === 'member'}
                            >
                              Make Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member)}
                              className="text-destructive focus:text-destructive"
                            >
                              Remove from Workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <UserPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No members yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Invite team members to collaborate in this workspace
          </p>
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            Invite Members
          </Button>
        </div>
      )}
      
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Invite a new member to join your workspace.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="email@example.com" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the email address of the person you want to invite.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Admins can manage workspace settings and members.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}