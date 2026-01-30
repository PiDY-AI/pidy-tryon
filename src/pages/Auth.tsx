import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding/OnboardingFlow';
import type { WidgetScanResult } from '@/components/onboarding/OnboardingProcessing';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [debugInfo, setDebugInfo] = useState<{
    tokenReceived: boolean;
    sessionSet: boolean;
    redirectTo: string;
    error?: string;
  } | null>(null);

  const handleOnboardingComplete = async (data: OnboardingData, result?: WidgetScanResult) => {
    // widget-scan API already created the user account
    // Mark onboarding as complete so user isn't redirected back here
    completeOnboarding();

    const tokenReceived = !!result?.access_token && !!result?.refresh_token;
    console.log('[Auth] Onboarding complete (widget-scan):', {
      token_received: tokenReceived,
      is_new_user: result?.is_new_user,
      user_id: result?.user_id,
      scan_id: result?.scan_id,
      expires_in: result?.expires_in,
      token_type: result?.token_type,
    });

    let sessionSet = false;
    let sessionError: string | undefined;

    // Fallback: apply session here too (guards against iframe/popup storage quirks)
    if (tokenReceived && result?.access_token && result?.refresh_token) {
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (setSessionError) {
        console.warn('[Auth] Failed to set session from widget-scan tokens:', setSessionError.message);
        sessionError = setSessionError.message;
      } else {
        sessionSet = true;
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[Auth] Session after setSession:', {
          has_access_token: !!sessionData.session?.access_token,
          user_id: sessionData.session?.user?.id,
        });
      }
    }
    
    // Check if this is a popup window
    const isPopup = searchParams.get('popup');
    const productId = searchParams.get('productId');
    
    // Determine redirect path
    let redirectPath = '/';
    if (productId) {
      redirectPath = `/?productId=${productId}`;
    }

    // Show debug banner for 3 seconds before routing
    setDebugInfo({
      tokenReceived,
      sessionSet,
      redirectTo: isPopup ? 'POPUP_CLOSE' : redirectPath,
      error: sessionError,
    });
    
    if (isPopup && window.opener) {
      // If we have tokens, send them to the opener (the widget) so it can become authed immediately.
      if (tokenReceived && result?.access_token && result?.refresh_token) {
        window.opener.postMessage(
          { type: 'tryon-auth-session', access_token: result.access_token, refresh_token: result.refresh_token },
          window.location.origin
        );
      }

      // Also notify onboarding completion (used by some embed contexts)
      window.opener.postMessage(
        {
          type: 'pidy-onboarding-complete',
          email: data.details?.email,
          token_received: tokenReceived,
          is_new_user: result?.is_new_user,
        },
        window.location.origin
      );

      // Wait to show debug banner
      await new Promise(resolve => setTimeout(resolve, 3000));
      window.close();
    } else {
      // Wait to show debug banner before redirect
      await new Promise(resolve => setTimeout(resolve, 3000));
      navigate(redirectPath);
    }
    
    toast({
      title: "You're all set!",
      description: "Check your email to set up your password. You can now try on items!",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error, session } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Login failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Check if this is a popup window
          const isPopup = searchParams.get('popup');
          if (isPopup && window.opener) {
            const access_token = session?.access_token;
            const refresh_token = session?.refresh_token;

            if (!access_token || !refresh_token) {
              toast({
                title: 'Session not available',
                description:
                  "We couldn't create a session token. If you just signed up, confirm your email first, then try again.",
                variant: 'destructive',
              });
              return;
            }

            // Send to widget (same origin)
            window.opener.postMessage(
              { type: 'tryon-auth-session', access_token, refresh_token },
              window.location.origin
            );

            // Also store in central auth bridge for cross-brand sharing
            // Find the auth bridge iframe in the opener or create reference
            const bridgeOrigin = window.location.origin;
            const authBridge = window.opener.document?.getElementById('pidy-auth-bridge') as HTMLIFrameElement | null;
            if (authBridge && authBridge.contentWindow) {
              authBridge.contentWindow.postMessage(
                { 
                  type: 'pidy-bridge-store-tokens', 
                  access_token, 
                  refresh_token,
                  expires_in: 3600,
                  user_email: email
                },
                bridgeOrigin
              );
              console.log('[Auth] Stored tokens in central bridge');
            }

            window.close();
          } else {
            // Regular redirect
            const productId = searchParams.get('productId');
            const embedMode = searchParams.get('embed');
            let redirectPath = '/';
            if (productId) {
              redirectPath = `/?productId=${productId}`;
              if (embedMode) redirectPath += '&embed=true';
            }
            navigate(redirectPath);
          }
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link to complete your registration.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show onboarding flow for first-time users
  if (showOnboarding) {
    return (
      <>
        <Helmet>
          <title>Get Started - PIDY</title>
          <meta name="description" content="Set up your PIDY profile for virtual try-on" />
        </Helmet>

        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Debug Banner */}
            {debugInfo && (
              <div className="mb-4 p-4 rounded-lg bg-primary/20 border border-primary text-foreground text-sm">
                <p className="font-bold mb-2">🔍 DEBUG: Routing Decision</p>
                <p>Token Received: <span className={debugInfo.tokenReceived ? 'text-green-400' : 'text-red-400'}>{debugInfo.tokenReceived ? 'YES ✓' : 'NO ✗'}</span></p>
                <p>Session Set: <span className={debugInfo.sessionSet ? 'text-green-400' : 'text-red-400'}>{debugInfo.sessionSet ? 'YES ✓' : 'NO ✗'}</span></p>
                <p>Will Navigate To: <span className="text-primary font-mono">{debugInfo.redirectTo}</span></p>
                {debugInfo.error && <p className="text-red-400">Error: {debugInfo.error}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Redirecting in 3 seconds...</p>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => setShowOnboarding(false)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>

            {/* Onboarding container */}
            <div className="glass-card rounded-2xl overflow-hidden h-[580px]">
              <OnboardingFlow onComplete={handleOnboardingComplete} />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sign In - Virtual Try-On</title>
        <meta name="description" content="Sign in to access the virtual try-on experience" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <img src={pidyLogo} alt="PIDY" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Virtual Try-On</h1>
            <p className="text-muted-foreground mt-2">
              {isLogin ? 'Sign in to continue' : 'Create your account'}
            </p>
          </div>

          {/* Auth Card */}
          <div className="glass-card rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-input border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-input border-border"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {isLogin ? (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  First time PIDY? <span className="text-primary">Get started</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Already have an account? <span className="text-primary">Sign in</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
