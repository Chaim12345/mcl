import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DebugPage() {
  const [apiStatus, setApiStatus] = useState<string>('Not tested');
  const [authStatus, setAuthStatus] = useState<string>('Not tested');

  const testApi = async () => {
    try {
      setApiStatus('Testing...');
      const response = await fetch('/api/health');
      if (response.ok) {
        setApiStatus('✅ API is working');
      } else {
        setApiStatus(`❌ API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setApiStatus(`❌ API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAuth = async () => {
    try {
      setAuthStatus('Testing...');
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        setAuthStatus('✅ Auth is working');
      } else {
        setAuthStatus(`❌ Auth error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setAuthStatus(`❌ Auth error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Status: {apiStatus}</p>
            <Button onClick={testApi}>Test API</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Status: {authStatus}</p>
            <Button onClick={testAuth}>Test Auth</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Environment Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm">
            {JSON.stringify({
              location: window.location.href,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}