import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { VibeButton, VibeTextField, VibeCheckbox, VibeAlertBanner } from '@/components/vibe';
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
import { useAuthStore } from '@/stores/auth-store';
import { LoginCredentials } from '@/types';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(128, { message: 'Password must be less than 128 characters' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  redirectTo?: string;
  className?: string;
}

export function LoginForm({ redirectTo = '/dashboard', className }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { toast } = useVibeToast();
  const login = useAuthStore((state) => state.login);
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });
  
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      login(data.user, data.token, data.refreshToken);
      toast.success(
        'Welcome back!',
        `Hello ${data.user.firstName}, you're successfully logged in.`,
        { autoHideDuration: 4000 }
      );
      navigate(redirectTo);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Login failed';
      toast.error(
        'Login failed',
        errorMessage,
        { autoHideDuration: 6000 }
      );
      // Reset password field on error
      form.setValue('password', '');
      form.setFocus('password');
    },
  });
  
  function onSubmit(values: LoginFormData) {
    loginMutation.mutate(values);
  }
  
  const isLoading = loginMutation.isPending;
  
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your account
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
                      placeholder="Enter your email"
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
                      aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                    />
                  </FormControl>
                  <FormMessage id="email-error" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <VibeTextField 
                        {...field}
                        title="Password"
                        placeholder="Enter your password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        disabled={isLoading} 
                        size="medium"
                        validation={form.formState.errors.password ? {
                          status: 'error',
                          text: form.formState.errors.password.message
                        } : undefined}
                        secondaryIconName={showPassword ? EyeOff : Eye}
                        onIconClick={() => setShowPassword(!showPassword)}
                        className="h-11 pr-10"
                        aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                      />
                    </div>
                  </FormControl>
                  <FormMessage id="password-error" />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <VibeCheckbox
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  label="Remember me"
                  className="h-4 w-4"
                />
              </div>
              <Link 
                to="/forgot-password" 
                className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                tabIndex={isLoading ? -1 : 0}
              >
                Forgot password?
              </Link>
            </div>
            
            {loginMutation.isError && (
              <VibeAlertBanner 
                variant="destructive"
                description={
                  loginMutation.error?.response?.data?.message || 
                  loginMutation.error?.message || 
                  'An unexpected error occurred. Please try again.'
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
              {isLoading ? 'Signing in...' : 'Sign in'}
            </VibeButton>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-center w-full text-gray-600">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            tabIndex={isLoading ? -1 : 0}
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}