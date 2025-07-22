import React from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { ToastAlertDemo } from '@/components/demo/toast-alert-demo';

export function ToastAlertDemoPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Toast & Alert System</h1>
            <p className="text-muted-foreground">
              Demonstration of the toast notifications, confirmation dialogs, and progress indicators.
            </p>
          </div>
          
          <div className="border rounded-lg p-6 bg-card">
            <ToastAlertDemo />
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}