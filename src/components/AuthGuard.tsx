import { ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import pidyLogo from '@/assets/pidy-logo.png';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // In embed mode (productId present), skip auth guard - let the page handle auth on interaction
  const isEmbedMode = !!searchParams.get('productId');
  
  if (isEmbedMode) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 animate-pulse">
            <img src={pidyLogo} alt="PIDY" className="w-10 h-10 object-contain" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve query params (like productId) when redirecting to auth
    const params = new URLSearchParams(location.search);
    const redirectPath = params.toString() ? `/auth?${params.toString()}` : '/auth';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
