import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ReconnectionIndicator } from '@/components/real-time';

import { MainLayout } from '@/components/layout/main-layout';
import { 
  LoginPage, 
  RegisterPage, 
  ForgotPasswordPage, 
  ResetPasswordPage, 
  DashboardPage,
  WorkspacePage,
  SearchPage,
  ToastAlertDemoPage
} from '@/pages';
import { DebugPage } from '@/pages/debug-page';
import { BoardPageDnd } from '@/pages/board-page-dnd';

// Home page component
const HomePage = () => (
  <MainLayout>
    <h1 className="text-2xl font-bold">Home Page</h1>
    <p>Welcome to the Project Management Platform</p>
  </MainLayout>
);

// We're now using the AuthGuard component instead of this ProtectedRoute

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={
              <AuthGuard requireAuth={false}>
                <LoginPage />
              </AuthGuard>
            } />
            <Route path="/register" element={
              <AuthGuard requireAuth={false}>
                <RegisterPage />
              </AuthGuard>
            } />
            <Route path="/forgot-password" element={
              <AuthGuard requireAuth={false}>
                <ForgotPasswordPage />
              </AuthGuard>
            } />
            <Route path="/reset-password" element={
              <AuthGuard requireAuth={false}>
                <ResetPasswordPage />
              </AuthGuard>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <AuthGuard>
                <DashboardPage />
              </AuthGuard>
            } />
            <Route path="/workspaces" element={
              <AuthGuard>
                <WorkspacePage />
              </AuthGuard>
            } />
            <Route path="/workspaces/:workspaceId" element={
              <AuthGuard>
                <WorkspacePage />
              </AuthGuard>
            } />
            <Route path="/boards/:boardId" element={
              <AuthGuard>
                <BoardPageDnd />
              </AuthGuard>
            } />
            <Route path="/boards/:boardId/search" element={
              <AuthGuard>
                <SearchPage />
              </AuthGuard>
            } />
            <Route path="/demo/toast-alert" element={
              <AuthGuard>
                <ToastAlertDemoPage />
              </AuthGuard>
            } />
            <Route path="/debug" element={<DebugPage />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
          <ReconnectionIndicator />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;