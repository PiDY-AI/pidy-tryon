# Pidy Tryon Error Fix Log

This file tracks all error fixes for reference.
Format each fix with: Error, Root Cause, Files Changed, Fix Summary.

---

## Fix #1: Onboarding Status Not Persisting for Returning Users

**Error**: When a user completes onboarding and then signs in again (from a different device or after clearing browser data), they are shown the onboarding flow again instead of going directly to the try-on interface.

**Root Cause**: Onboarding status was only stored in localStorage, which is:
1. Device-specific (not synced across devices)
2. Easily cleared when browser data is cleared
3. Not tied to the user's account

**Files Changed**:
- `src/pages/Index.tsx` (lines 58-87, 132-161)
- `src/hooks/useOnboarding.ts` (lines 1-42)

**Fix Summary**:
1. Store onboarding completion in Supabase user metadata (`onboarding_complete: true`) when user completes onboarding
2. Check user metadata when user signs in to restore onboarding status
3. Sync onboarding status to central auth bridge and localStorage for quick access
4. When `SIGNED_IN` event fires, check `session.user.user_metadata.onboarding_complete` and notify parent SDK if true

**Result**: Users only need to complete onboarding once. Their onboarding status is now tied to their account and persists across devices and browser sessions.

---

## Fix #2: Demo Page Asking for Sign-In When User Already Authenticated

**Error**: After signing in on the main app (`/`), when navigating to a demo page (`/demo/product/:id`), the embedded widget asks the user to sign in again even though they already have an active authenticated session.

**Root Cause**:
1. When the SDK creates an iframe for the widget on the demo page, the iframe loads `/?productId=xxx&embed=true`
2. The session check in Index.tsx wasn't detecting the existing Supabase session in the iframe context
3. Even though the session exists (same origin), the code wasn't using it and was waiting for SDK tokens instead
4. The widget would timeout waiting for SDK tokens and show the sign-in screen

**Files Changed**:
- `src/pages/Index.tsx` (lines 99-167)

**Fix Summary**:
1. Enhanced session check to properly detect existing Supabase session when iframe loads
2. When session is found, immediately use it instead of waiting for SDK tokens
3. Extract onboarding status from session.user.user_metadata when session exists
4. Notify parent SDK about the existing session and onboarding status
5. Added debug logging to track session detection flow
6. Mark sdkOnboardingReceived=true when we get onboarding from session (skip SDK wait)

**Result**: Users authenticated on the main app are now automatically authenticated in demo pages. The widget detects the existing session and doesn't ask for sign-in again.

---

