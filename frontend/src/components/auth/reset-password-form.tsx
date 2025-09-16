import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { VibeButton, VibeTextField } from '@/components/vibe';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useVibeToast } from '@/hooks/use-vibe-toast';
import { authService } from '@/services/auth-service';

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useVibeToast();
  
  const token = searchParams.get('token');
  
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => 
      authService.resetPassword(token, password),
    onSuccess: () => {
      toast.success(
        'Password reset successful',
        'Your password has been reset. You can now login with your new password.',
        { autoHideDuration: 5000 }
      );
      navigate('/login');
    },
    onError: (error: any) => {
      toast.error(
        'Password reset failed',
        error.message || 'Invalid or expired token. Please try again.',
        { autoHideDuration: 6000 }
      );
      setIsLoading(false);
    },
  });
  
  function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    if (!token) {
      toast.error(
        'Invalid reset link',
        'The password reset link is invalid or has expired.',
        { autoHideDuration: 6000 }
      );
      return;
    }
    
    setIsLoading(true);
    resetPasswordMutation.mutate({ token, password: values.password });
  }
  
  if (!token) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
          <CardDescription>
            The password reset link is invalid or has expired. Please request a new password reset.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <VibeButton 
            kind="primary"
            size="large"
            className="w-full h-11" 
            onClick={() => navigate('/forgot-password')}
          >
            Request New Reset Link
          </VibeButton>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <VibeTextField 
                      {...field}
                      title="New Password"
                      placeholder="••••••••" 
                      type="password" 
                      autoComplete="new-password"
                      disabled={isLoading}
                      size="medium"
                      validation={form.formState.errors.password ? {
                        status: 'error',
                        text: form.formState.errors.password.message
                      } : undefined}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <VibeTextField 
                      {...field}
                      title="Confirm New Password"
                      placeholder="••••••••" 
                      type="password" 
                      autoComplete="new-password"
                      disabled={isLoading}
                      size="medium"
                      validation={form.formState.errors.confirmPassword ? {
                        status: 'error',
                        text: form.formState.errors.confirmPassword.message
                      } : undefined}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <VibeButton 
              type="submit" 
              kind="primary"
              size="large"
              loading={isLoading}
              disabled={isLoading || !form.formState.isValid}
              className="w-full h-11"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </VibeButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}