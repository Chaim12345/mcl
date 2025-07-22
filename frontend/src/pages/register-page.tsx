import { RegisterForm } from '@/components/auth/register-form';
import { AuthGuard } from '@/components/auth/auth-guard';

export function RegisterPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    </AuthGuard>
  );
}