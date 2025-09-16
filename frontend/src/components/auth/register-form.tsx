import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2, Check, X, Mail } from 'lucide-react';

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

import { Progress } from '@/components/ui/progress';
import { useVibeToast } from '@/hooks/use-vibe-toast';
import { authService } from '@/services/auth-service';
import { RegisterData } from '@/types';

const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: 'First name is required' })
    .min(2, { message: 'First name must be at least 2 characters' })
    .max(50, { message: 'First name must be less than 50 characters' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'First name can only contain letters, spaces, hyphens, and apostrophes' }),
  lastName: z
    .string()
    .min(1, { message: 'Last name is required' })
    .min(2, { message: 'Last name must be at least 2 characters' })
    .max(50, { message: 'Last name must be less than 50 characters' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'Last name can only contain letters, spaces, hyphens, and apostrophes' }),
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters' })
    .max(128, { message: 'Password must be less than 128 characters' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message: 'Password must contain at least one uppercase letter, lowercase letter, number, and special character'
    }),
  confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  // Sequential characters check
  if (!/(.)\1{2,}/.test(password)) score += 1;
  
  if (score <= 2) return { score: score * 20, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score: score * 20, label: 'Fair', color: 'bg-yellow-500' };
  if (score <= 5) return { score: score * 20, label: 'Good', color: 'bg-blue-500' };
  return { score: 100, label: 'Strong', color: 'bg-green-500' };
}

interface RegisterFormProps {
  className?: string;
}

export function RegisterForm({ className }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useVibeToast();
  
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });
  
  const password = form.watch('password');
  const passwordStrength = password ? calculatePasswordStrength(password) : null;
  
  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (_, variables) => {
      toast.success(
        'Registration successful!',
        'Please check your email to verify your account.',
        { autoHideDuration: 5000 }
      );
      setUserEmail(variables.email);
      setVerificationSent(true);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Registration failed';
      toast.error(
        'Registration failed',
        errorMessage,
        { autoHideDuration: 6000 }
      );
    },
  });
  
  function onSubmit(values: RegisterFormData) {
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData);
  }
  
  const isLoading = registerMutation.isPending;
  
  if (verificationSent) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We've sent a verification link to{' '}
            <span className="font-medium text-foreground">{userEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <VibeAlertBanner 
            backgroundColor="positive"
            description="Click the link in your email to verify your account and complete the registration process."
          />
          <div className="text-sm text-center text-muted-foreground">
            Didn't receive the email? Check your spam folder or{' '}
            <button 
              className="text-primary hover:underline"
              onClick={() => registerMutation.mutate({ email: userEmail } as RegisterData)}
            >
              resend verification email
            </button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <VibeButton 
            kind="primary"
            size="large"
            className="w-full" 
            onClick={() => navigate('/login')}
          >
            Continue to Sign In
          </VibeButton>
          <VibeButton 
            kind="secondary"
            size="large"
            className="w-full"
            onClick={() => setVerificationSent(false)}
          >
            Back to Registration
          </VibeButton>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create account</CardTitle>
        <CardDescription className="text-center">
          Enter your information to create a new account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <VibeTextField 
                        {...field}
                        title="First name"
                        placeholder="John"
                        autoComplete="given-name"
                        disabled={isLoading}
                        size="medium"
                        validation={form.formState.errors.firstName ? {
                          status: 'error',
                          text: form.formState.errors.firstName.message
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <VibeTextField 
                        {...field}
                        title="Last name"
                        placeholder="Doe"
                        autoComplete="family-name"
                        disabled={isLoading}
                        size="medium"
                        validation={form.formState.errors.lastName ? {
                          status: 'error',
                          text: form.formState.errors.lastName.message
                        } : undefined}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
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
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <VibeTextField 
                      {...field}
                      title="Password"
                      placeholder="Create a password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={isLoading}
                      size="medium"
                      validation={form.formState.errors.password ? {
                        status: 'error',
                        text: form.formState.errors.password.message
                      } : undefined}
                      secondaryIconName={showPassword ? EyeOff : Eye}
                      onIconClick={() => setShowPassword(!showPassword)}
                      className="h-11"
                    />
                  </FormControl>
                  {password && passwordStrength && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={`font-medium ${
                          passwordStrength.label === 'Weak' ? 'text-red-600' :
                          passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                          passwordStrength.label === 'Good' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <Progress 
                        value={passwordStrength.score} 
                        className="h-2"
                      />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <VibeTextField 
                      {...field}
                      title="Confirm password"
                      placeholder="Confirm your password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={isLoading}
                      size="medium"
                      validation={form.formState.errors.confirmPassword ? {
                        status: 'error',
                        text: form.formState.errors.confirmPassword.message
                      } : undefined}
                      secondaryIconName={showConfirmPassword ? EyeOff : Eye}
                      onIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {registerMutation.isError && (
              <VibeAlertBanner 
                variant="destructive"
                description={
                  registerMutation.error?.response?.data?.message || 
                  registerMutation.error?.message || 
                  'Registration failed. Please try again.'
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
              {isLoading ? 'Creating account...' : 'Create account'}
            </VibeButton>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-center w-full text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            tabIndex={isLoading ? -1 : 0}
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}