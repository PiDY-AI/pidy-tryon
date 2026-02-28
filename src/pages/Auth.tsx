import { useState, useEffect, useRef } from 'react';
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
import pidyLogo from '@/assets/pidy_logo_white.png';
import pidyTextLogo from '@/assets/pidy_full_text_white.png';
import landingVideo from '@/assets/1770643433403458.mov';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [searchParams] = useSearchParams();

  // Auto-show onboarding if URL param is present (from "First Time PIDY" button)
  const startWithOnboarding = searchParams.get('onboarding') === 'true';

  const [isLogin, setIsLogin] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(startWithOnboarding);
  const [showSignInForm, setShowSignInForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authSucceeded, setAuthSucceeded] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Detect popup closure and notify parent (only if auth did NOT succeed)
  useEffect(() => {
    const isPopup = searchParams.get('popup');
    if (!isPopup) return;

    const handleBeforeUnload = () => {
      // Only send cancelled if auth didn't succeed
      if (!authSucceeded) {
        console.log('[Auth] Popup closing without auth - notifying parent');
        if (window.opener) {
          window.opener.postMessage(
            { type: 'pidy-auth-cancelled', source: 'pidy-widget' },
            '*'
          );
        }
        // Also notify via BroadcastChannel for cross-origin cases
        try {
          const bc = new BroadcastChannel('pidy-auth');
          bc.postMessage({ type: 'pidy-auth-cancelled', source: 'pidy-widget' });
          bc.close();
        } catch (e) { /* ignore */ }
      } else {
        console.log('[Auth] Popup closing after successful auth - not sending cancelled');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [searchParams, authSucceeded]);

  const [debugInfo, setDebugInfo] = useState<{
    tokenReceived: boolean;
    sessionSet: boolean;
    redirectTo: string;
    error?: string;
  } | null>(null);

  const handleOnboardingComplete = async (data: OnboardingData, result?: WidgetScanResult) => {
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

        // NOW save onboarding completion to user metadata (session is set, user exists)
        console.log('[Auth] Saving onboarding status to user metadata');
        const { error: updateError } = await supabase.auth.updateUser({
          data: { onboarding_complete: true }
        });

        if (updateError) {
          console.error('[Auth] Error saving onboarding to user metadata:', updateError);
        } else {
          console.log('[Auth] Onboarding status saved to database');
          // Mark onboarding as complete in localStorage
          completeOnboarding();
        }
      }
    } else {
      // No tokens received, just mark locally
      completeOnboarding();
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
    
    if (isPopup) {
      // Mark auth as successful BEFORE sending messages (prevents beforeunload from sending cancelled)
      setAuthSucceeded(true);

      const tokenPayload = tokenReceived && result?.access_token && result?.refresh_token
        ? { access_token: result.access_token, refresh_token: result.refresh_token }
        : null;

      const onboardingPayload = {
        type: 'pidy-onboarding-complete',
        email: data.details?.email,
        token_received: tokenReceived,
        is_new_user: result?.is_new_user,
        access_token: result?.access_token,
        refresh_token: result?.refresh_token,
      };

      // Send via window.opener if available
      if (window.opener) {
        if (tokenPayload) {
          window.opener.postMessage({ type: 'tryon-auth-session', ...tokenPayload }, '*');
        }
        window.opener.postMessage(onboardingPayload, '*');
      }

      // Also send via BroadcastChannel (same-origin fallback for cross-origin popups)
      try {
        const bc = new BroadcastChannel('pidy-auth');
        if (tokenPayload) {
          bc.postMessage({ type: 'tryon-auth-session', ...tokenPayload });
        }
        bc.postMessage(onboardingPayload);
        console.log('[Auth] Sent onboarding/tokens via BroadcastChannel');
        bc.close();
      } catch (e) { /* ignore */ }

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address first.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast({
        title: 'Check your email',
        description: 'We sent you a password reset link.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
          console.log('[Auth] Post-signin check:', { isPopup, hasOpener: !!window.opener });
          if (isPopup) {
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

            // Mark auth as successful BEFORE sending messages (prevents beforeunload from sending cancelled)
            setAuthSucceeded(true);

            // Send tokens to opener (brand page) if available
            if (window.opener) {
              console.log('[Auth] Sending tryon-auth-session via window.opener');
              window.opener.postMessage(
                { type: 'tryon-auth-session', access_token, refresh_token },
                '*'
              );

              // Try to store in central auth bridge (will fail cross-origin)
              try {
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
              } catch (e) {
                console.log('[Auth] Cross-origin bridge access (expected on third-party sites)');
              }
            }

            // Fallback: use BroadcastChannel so the SDK on the brand page can receive
            // tokens even if window.opener is null (cross-origin popup restriction)
            try {
              const bc = new BroadcastChannel('pidy-auth');
              bc.postMessage({ type: 'tryon-auth-session', access_token, refresh_token });
              console.log('[Auth] Sent tokens via BroadcastChannel');
              bc.close();
            } catch (e) {
              console.log('[Auth] BroadcastChannel not available');
            }

            // Delay close slightly so postMessage has time to dispatch
            console.log('[Auth] Popup: scheduling window.close() after delay');
            setTimeout(() => {
              console.log('[Auth] Popup: calling window.close()');
              window.close();
            }, 300);
          } else {
            console.log('[Auth] NOT popup mode - redirecting');
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Google Sign In failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      // OAuth redirects away — no need to handle success here
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to start Google Sign In.',
        variant: 'destructive',
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

  // Check if this is a popup (smaller layout)
  const isPopup = searchParams.get('popup') === 'true';

  return (
    <>
      <Helmet>
        <title>Sign In - Virtual Try-On</title>
        <meta name="description" content="Sign in to access the virtual try-on experience" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {isPopup ? (
          // Compact popup layout
          <div className="h-screen overflow-y-auto px-4 py-3">
            <div className="max-w-sm mx-auto space-y-3">
              {/* Compact Logo */}
              <div className="text-center">
                <img src={pidyTextLogo} alt="PIDY" className="h-7 mx-auto object-contain" />
              </div>

              {/* Unsure about Size */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">Unsure about Size?</h2>
              </div>

              {/* Video - Compact */}
              <div className="aspect-video bg-surface border border-border rounded-lg overflow-hidden">
                <video
                  src={landingVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Sign In Container */}
              <div className="border border-border/40 rounded-lg p-3 bg-surface/30">
                {!showSignInForm ? (
                  // Sign In Buttons
                  <div className="space-y-2.5">
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border bg-white text-black text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <Button
                      onClick={() => setShowSignInForm(true)}
                      className="w-full"
                      size="default"
                      variant="outline"
                    >
                      Sign In with Email
                    </Button>

                    {/* First time PIDY - with box */}
                    <button
                      onClick={() => setShowOnboarding(true)}
                      className="w-full text-center group pt-2"
                    >
                      <div className="glass-card rounded-xl p-3.5 hover:border-primary/30 transition-colors relative overflow-hidden">
                        {/* Subtle gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-60" />

                        <div className="relative">
                          <p className="text-xs text-muted-foreground mb-1.5">First time PIDY?</p>
                          <div className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                            <img src={pidyLogo} alt="PIDY" className="h-4 w-4 object-contain" />
                            <span className="text-base font-semibold">Get started</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  // Sign In Form
                  <div className="space-y-3 animate-scale-in">
                    <div className="flex items-center justify-between mb-1.5">
                      <h2 className="text-base font-semibold text-foreground">Sign In</h2>
                      <button
                        onClick={() => setShowSignInForm(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-xs text-foreground">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 bg-input border-border h-10 text-sm"
                            required
                          />
                        </div>
                      </div>

                      {!showForgotPassword && (
                        <div className="space-y-1">
                          <Label htmlFor="password" className="text-xs text-foreground">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type="password"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-10 bg-input border-border h-10 text-sm"
                              required
                              minLength={6}
                            />
                          </div>
                        </div>
                      )}

                      {showForgotPassword ? (
                        <>
                          {resetEmailSent ? (
                            <p className="text-xs text-muted-foreground text-center">Check your email for a reset link.</p>
                          ) : (
                            <Button
                              type="button"
                              onClick={handleForgotPassword}
                              className="w-full mt-3"
                              size="default"
                              disabled={isLoading || !email}
                            >
                              {isLoading ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                  Sending...
                                </span>
                              ) : (
                                'Send Reset Link'
                              )}
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}
                            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center mt-2"
                          >
                            Back to Sign In
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Forgot Password?
                          </button>
                          <Button
                            type="submit"
                            className="w-full mt-3"
                            size="default"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Signing in...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                Sign In
                                <ArrowRight className="w-4 h-4" />
                              </span>
                            )}
                          </Button>
                        </>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Full page layout
          <div className="container max-w-7xl mx-auto px-4 py-8">
            {/* Logo Header */}
            <div className="mb-12">
              <img src={pidyTextLogo} alt="PIDY" className="h-10 object-contain" />
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left Column - Info */}
              <div className="space-y-8">
                {/* Unsure about Size? */}
                <div>
                  <h2 className="text-h2 text-foreground mb-3">Unsure about Size?</h2>
                </div>

                {/* Video */}
                <div className="aspect-video bg-surface border border-border rounded-lg overflow-hidden">
                  <video
                    src={landingVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right Column - Auth */}
              <div className="lg:sticky lg:top-8">
                <div className="glass-card rounded-2xl p-8 max-w-md mx-auto lg:mx-0">
                  {!showSignInForm ? (
                    // Sign In Buttons (expandable)
                    <div className="space-y-4">
                      <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md border border-border bg-white text-black text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                      </button>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <Button
                        onClick={() => setShowSignInForm(true)}
                        className="w-full"
                        size="lg"
                        variant="outline"
                      >
                        Sign In with Email
                      </Button>

                      {/* First time PIDY - with box */}
                      <button
                        onClick={() => setShowOnboarding(true)}
                        className="w-full text-center group pt-2"
                      >
                        <div className="glass-card rounded-xl p-4 hover:border-primary/30 transition-colors relative overflow-hidden">
                          {/* Subtle gradient background */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-60" />

                          <div className="relative">
                            <p className="text-sm text-muted-foreground mb-2">First time PIDY?</p>
                            <div className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                              <img src={pidyLogo} alt="PIDY" className="h-5 w-5 object-contain" />
                              <span className="text-lg font-semibold">Get started</span>
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    // Sign In Form (expanded)
                    <div className="space-y-4 animate-scale-in">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-h3 text-foreground">Sign In</h2>
                        <button
                          onClick={() => setShowSignInForm(false)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                      </div>

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

                        {!showForgotPassword && (
                          <div className="space-y-2">
                            <Label htmlFor="password" className="text-foreground">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="password"
                                type="password"
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 bg-input border-border"
                                required
                                minLength={6}
                              />
                            </div>
                          </div>
                        )}

                        {showForgotPassword ? (
                          <>
                            {resetEmailSent ? (
                              <p className="text-sm text-muted-foreground text-center">Check your email for a reset link.</p>
                            ) : (
                              <Button
                                type="button"
                                onClick={handleForgotPassword}
                                className="w-full"
                                size="lg"
                                disabled={isLoading || !email}
                              >
                                {isLoading ? (
                                  <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    Sending...
                                  </span>
                                ) : (
                                  'Send Reset Link'
                                )}
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}
                              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center mt-2"
                            >
                              Back to Sign In
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Forgot Password?
                            </button>
                            <Button
                              type="submit"
                              className="w-full"
                              size="lg"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                  Signing in...
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  Sign In
                                  <ArrowRight className="w-4 h-4" />
                                </span>
                              )}
                            </Button>
                          </>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Auth;
