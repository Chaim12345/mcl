import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { AuthGuard } from '@/components/auth/auth-guard';

export function ForgotPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md">
          <ForgotPasswordForm />
        </div>
      </div>
    </AuthGuard>
  );
}