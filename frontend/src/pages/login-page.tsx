import { LoginForm } from '@/components/auth/login-form';
import { AuthGuard } from '@/components/auth/auth-guard';

export function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </AuthGuard>
  );
}