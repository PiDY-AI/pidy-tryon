import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve query params (like productId) when redirecting to auth
    const searchParams = new URLSearchParams(location.search);
    const redirectPath = searchParams.toString() ? `/auth?${searchParams.toString()}` : '/auth';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
