'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[v0] Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-gray-600 mt-2">
              An unexpected error occurred. Please try again.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm font-mono text-red-700 break-words">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={reset}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try again
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1 border-blue-200"
            >
              Go home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
