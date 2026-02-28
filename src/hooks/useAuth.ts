import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// --- Google Identity Services (GIS) helpers ---
// Uses the same ID-token flow as pidy-app: no redirect, no redirect_uri needed.

// Public client ID — safe to embed (same as pidy-app).
// Hardcoded because Vercel intermittently fails to pass VITE_ env vars to the Vite build.
const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  '63693284509-el5itsl7ruqrthtvik6f8i3akkvj3hr9.apps.googleusercontent.com';

let gisScriptReady: Promise<void> | null = null;

async function sha256Hash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ensureGisLoaded(): Promise<void> {
  if (gisScriptReady) {
    await gisScriptReady;
  } else if (!(window as any).google?.accounts?.id) {
    gisScriptReady = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
      document.head.appendChild(script);
    });
    await gisScriptReady;
  }
}

function tryOneTap(
  g: any,
  hashedNonce: string,
  rawNonce: string
): Promise<{ idToken: string; nonce: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    g.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          settle(() => resolve({ idToken: response.credential!, nonce: rawNonce }));
        } else {
          settle(() => reject(new Error('No credential received from Google')));
        }
      },
    });

    g.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        settle(() => reject(new Error('ONE_TAP_UNAVAILABLE')));
      } else if (notification.isDismissedMoment()) {
        settle(() => reject(new Error('Authentication was cancelled')));
      }
    });
  });
}

function tryPopupSignIn(
  g: any,
  hashedNonce: string,
  rawNonce: string
): Promise<{ idToken: string; nonce: string }> {
  return new Promise((resolve, reject) => {
    g.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      nonce: hashedNonce,
      callback: (response: { credential?: string }) => {
        const el = document.getElementById('g_id_signin_popup');
        if (el) document.body.removeChild(el);
        if (response.credential) {
          resolve({ idToken: response.credential, nonce: rawNonce });
        } else {
          reject(new Error('No credential received from Google'));
        }
      },
    });

    const container = document.createElement('div');
    container.id = 'g_id_signin_popup';
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    g.accounts.id.renderButton(container, {
      type: 'standard',
      size: 'large',
      width: 300,
    });

    const tryClick = (attempts: number) => {
      const btn =
        (container.querySelector('div[role=button]') as HTMLElement) ||
        container.querySelector('iframe');
      if (btn) {
        btn.click();
        setTimeout(() => {
          const el = document.getElementById('g_id_signin_popup');
          if (el) {
            document.body.removeChild(el);
            reject(
              new Error(
                'Google Sign-In popup was closed or blocked. Please allow popups and try again.'
              )
            );
          }
        }, 120000);
      } else if (attempts > 0) {
        setTimeout(() => tryClick(attempts - 1), 200);
      } else {
        document.body.removeChild(container);
        reject(new Error('Google Sign-In is not available. Please use email sign-in.'));
      }
    };
    setTimeout(() => tryClick(5), 200);
  });
}

async function getGoogleIdTokenWeb(): Promise<{ idToken: string; nonce: string }> {
  await ensureGisLoaded();
  const g = (window as any).google;

  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hash(rawNonce);

  try {
    return await tryOneTap(g, hashedNonce, rawNonce);
  } catch (err: any) {
    if (err?.message === 'ONE_TAP_UNAVAILABLE') {
      console.log('[Auth] One Tap unavailable, falling back to popup sign-in...');
      return await tryPopupSignIn(g, hashedNonce, rawNonce);
    }
    throw err;
  }
}

// --- Hook ---

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error, session: data?.session ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { idToken, nonce } = await getGoogleIdTokenWeb();

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce,
    });

    return { session: data?.session ?? null, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    // In some embedded/iframe contexts, auth change events can be delayed.
    // Optimistically clear local auth state so the UI updates immediately.
    if (!error) {
      setSession(null);
      setUser(null);
    }

    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
};
