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
  const { signIn, signUp } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Detect popup closure and notify parent (only if auth did NOT succeed)
  useEffect(() => {
    const isPopup = searchParams.get('popup');
    if (!isPopup || !window.opener) return;

    const handleBeforeUnload = () => {
      // Only send cancelled if auth didn't succeed
      if (!authSucceeded) {
        console.log('[Auth] Popup closing without auth - notifying parent');
        window.opener.postMessage(
          { type: 'pidy-auth-cancelled', source: 'pidy-widget' },
          '*'
        );
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
    
    if (isPopup && window.opener) {
      // Mark auth as successful BEFORE sending messages (prevents beforeunload from sending cancelled)
      setAuthSucceeded(true);

      // Send tokens AND onboarding completion to opener widget
      if (tokenReceived && result?.access_token && result?.refresh_token) {
        // First: send session tokens
        window.opener.postMessage(
          { type: 'tryon-auth-session', access_token: result.access_token, refresh_token: result.refresh_token },
          '*'
        );
      }

      // Second: notify onboarding completion with tokens (widget uses this to skip sign-in screen)
      window.opener.postMessage(
        {
          type: 'pidy-onboarding-complete',
          email: data.details?.email,
          token_received: tokenReceived,
          is_new_user: result?.is_new_user,
          access_token: result?.access_token,
          refresh_token: result?.refresh_token,
        },
        '*'
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

            // Mark auth as successful BEFORE sending messages (prevents beforeunload from sending cancelled)
            setAuthSucceeded(true);

            // Send to widget (same origin)
            window.opener.postMessage(
              { type: 'tryon-auth-session', access_token, refresh_token },
              '*'
            );

            // Try to store in central auth bridge (will fail cross-origin, which is OK -
            // the SDK on the brand page will store tokens when it receives tryon-auth-session)
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
              // Cross-origin: can't access opener's DOM. Expected on third-party brand sites.
              console.log('[Auth] Cross-origin bridge access (expected on third-party sites)');
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
                  // Sign In Button
                  <div className="space-y-2.5">
                    <Button
                      onClick={() => setShowSignInForm(true)}
                      className="w-full"
                      size="default"
                    >
                      Sign In
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
                    // Sign In Button (expandable)
                    <div className="space-y-4">
                      <Button
                        onClick={() => setShowSignInForm(true)}
                        className="w-full"
                        size="lg"
                      >
                        Sign In
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
