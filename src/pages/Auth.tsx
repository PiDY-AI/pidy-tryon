import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding/OnboardingFlow';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleOnboardingComplete = (data: OnboardingData) => {
    // widget-scan API already created the user account
    // Go directly to try-on experience - user will get magic link email to set password later
    console.log('[Auth] Onboarding complete, user created by widget-scan');
    
    // Check if this is a popup window
    const isPopup = searchParams.get('popup');
    const productId = searchParams.get('productId');
    
    if (isPopup && window.opener) {
      // Close popup and let user continue in main window
      // They're already set up via widget-scan, just need to sign in later
      window.opener.postMessage({ 
        type: 'pidy-onboarding-complete',
        email: data.details?.email 
      }, window.location.origin);
      window.close();
    } else {
      // Redirect to main page to try on items
      let redirectPath = '/';
      if (productId) {
        redirectPath = `/?productId=${productId}`;
      }
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
