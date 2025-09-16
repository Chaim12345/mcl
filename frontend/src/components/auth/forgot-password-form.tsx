import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, Check, AlertCircle } from 'lucide-react';

import { VibeButton, VibeTextField, VibeAlertBanner } from '@/components/vibe';
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

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  className?: string;
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const { toast } = useVibeToast();
  
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur',
  });
  
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: (_, email) => {
      toast.success(
        'Reset email sent',
        'Check your inbox for password reset instructions.',
        { autoHideDuration: 5000 }
      );
      setUserEmail(email);
      setEmailSent(true);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Request failed';
      toast.error(
        'Request failed',
        errorMessage,
        { autoHideDuration: 6000 }
      );
    },
  });
  
  function onSubmit(values: ForgotPasswordFormData) {
    forgotPasswordMutation.mutate(values.email);
  }
  
  function handleResend() {
    if (userEmail) {
      forgotPasswordMutation.mutate(userEmail);
      setResendCount(prev => prev + 1);
    }
  }
  
  const isLoading = forgotPasswordMutation.isPending;
  
  if (emailSent) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="text-center">
            We've sent password reset instructions to{' '}
            <span className="font-medium text-foreground">{userEmail}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <VibeAlertBanner 
            backgroundColor="positive"
            description="Click the reset link in your email to create a new password. The link will expire in 1 hour."
          />
          
          <div className="text-sm text-center text-muted-foreground space-y-2">
            <p>Didn't receive the email?</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>
          </div>
          
          {resendCount < 3 && (
            <div className="text-center">
              <VibeButton
                kind="secondary"
                size="large"
                onClick={handleResend}
                loading={isLoading}
                disabled={isLoading}
                className="w-full h-11"
              >
                {isLoading ? 'Sending...' : 'Resend reset email'}
              </VibeButton>
            </div>
          )}
          
          {resendCount >= 3 && (
            <VibeAlertBanner 
              variant="destructive"
              description="You've reached the maximum number of resend attempts. Please try again later or contact support if you continue to have issues."
            />
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <VibeButton 
            kind="secondary"
            size="large"
            className="w-full h-11"
            onClick={() => {
              setEmailSent(false);
              setResendCount(0);
              form.reset();
            }}
          >
            Try different email
          </VibeButton>
          
          <div className="text-sm text-center text-muted-foreground">
            Remember your password?{' '}
            <Link 
              to="/login" 
              className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Back to Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Reset your password</CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <VibeTextField 
                      {...field}
                      title="Email address"
                      placeholder="Enter your email address"
                      type="email" 
                      autoComplete="email"
                      autoFocus
                      disabled={isLoading}
                      size="medium"
                      validation={form.formState.errors.email ? {
                        status: 'error',
                        text: form.formState.errors.email.message
                      } : undefined}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {forgotPasswordMutation.isError && (
              <VibeAlertBanner 
                variant="destructive"
                description={
                  forgotPasswordMutation.error?.response?.data?.message || 
                  forgotPasswordMutation.error?.message || 
                  'Failed to send reset email. Please try again.'
                }
              />
            )}
            
            <VibeButton 
              type="submit" 
              kind="primary"
              size="large"
              loading={isLoading}
              disabled={isLoading || !form.formState.isValid}
              className="w-full h-11"
            >
              {isLoading ? 'Sending reset email...' : 'Send reset email'}
            </VibeButton>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter>
        <div className="text-sm text-center w-full text-gray-600 space-y-2">
          <p>
            Remember your password?{' '}
            <Link 
              to="/login" 
              className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              tabIndex={isLoading ? -1 : 0}
            >
              Back to Sign In
            </Link>
          </p>
          <p>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              tabIndex={isLoading ? -1 : 0}
            >
              Sign up
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}