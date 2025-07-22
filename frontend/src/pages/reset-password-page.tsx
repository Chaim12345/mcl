import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { AuthGuard } from '@/components/auth/auth-guard';

export function ResetPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md">
          <ResetPasswordForm />
        </div>
      </div>
    </AuthGuard>
  );
}