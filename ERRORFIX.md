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

## Fix #3: "Request Limit Reached" Error When Logging In

**Error**: After multiple page refreshes during development/testing, Supabase returns "request limit reached" error preventing users from signing in.

**Root Cause**:
1. Every page load triggers multiple auth API calls: `getSession()`, `getUser()`, `onAuthStateChange()`
2. The `useOnboarding` hook was calling `supabase.auth.getUser()` on EVERY page load
3. Even when onboarding was already complete (stored in localStorage), it still checked the server
4. Multiple iframe loads compound the problem (each iframe triggers all auth checks)
5. Rate limit: Too many auth requests per hour triggers Supabase rate limiting

**Files Changed**:
- `src/hooks/useOnboarding.ts` (lines 11-41)

**Fix Summary**:
1. Check localStorage first - if onboarding is complete, return immediately without server call
2. Only call `supabase.auth.getUser()` if localStorage doesn't have the status
3. Added try/catch error handling to gracefully handle rate limit errors
4. Fall back to allowing access if server check fails (better UX during rate limits)
5. This reduces auth API calls by approximately 50% on page loads

**Result**: Significantly fewer auth API calls, reducing the chance of hitting rate limits. When rate limits are hit, the app degrades gracefully instead of blocking users.

---

## Fix #4: Popup Blocked on Vercel Due to COOP Header

**Error**: The "Virtual Try-On" button opens a popup window for authentication on localhost but the popup cannot communicate back to the opener on Vercel deployment. `window.opener` is null in the popup, and `window.closed` checks fail.

**Root Cause**:
1. Vercel's default `Cross-Origin-Opener-Policy` header (`same-origin`) severs the relationship between the opener window and the popup
2. When COOP is `same-origin`, the popup opens in a new browsing context group, making `window.opener` null
3. This prevents the popup from sending `postMessage` back to the opener after authentication
4. On localhost there is no COOP header, so popups work fine

**Files Changed**:
- `vercel.json` (added COOP header rule for all routes)

**Fix Summary**:
1. Added `Cross-Origin-Opener-Policy: same-origin-allow-popups` header to all routes via `vercel.json`
2. This allows popups opened from the same origin to maintain their opener relationship
3. The popup can now use `window.opener.postMessage()` to send auth tokens back
4. This is the standard fix used by OAuth/payment integrations (Google Auth, Stripe, etc.)

**Result**: Popup authentication works on Vercel deployment. The popup can communicate back to the opener window after successful sign-in.

---

## Fix #5: Auth Cancelled Message Sent Before Success Message Processed

**Error**: After signing in via popup, clicking "Virtual Try-On" again asks for sign-in. Console shows `[VirtualTryOnBot] Auth cancelled, resetting button` - the auth appears to be cancelled even though sign-in succeeded.

**Root Cause**:
1. The popup's `beforeunload` event handler sends `pidy-auth-cancelled` when the popup closes
2. After successful sign-in, Auth.tsx calls `window.close()` which triggers `beforeunload`
3. The `beforeunload` handler fires and sends `pidy-auth-cancelled` to the opener
4. This cancelled message arrives at VirtualTryOnBot and resets the auth state
5. Race condition: cancelled message overwrites the success state set by `tryon-auth-session`

**Files Changed**:
- `src/pages/Auth.tsx` (lines 28-52, 130, 207)
- `src/demo/components/VirtualTryOnBot.tsx` (lines 31-49)

**Fix Summary**:
1. Added `authSucceeded` state flag in Auth.tsx to track if authentication was successful
2. Modified `beforeunload` handler to check `authSucceeded` flag before sending cancelled message
3. Set `authSucceeded = true` BEFORE sending success messages (both in sign-in and onboarding flows)
4. Modified VirtualTryOnBot to ignore `pidy-auth-cancelled` if already authenticated
5. Added `isAuthenticated` to useEffect dependency array to ensure proper state checks

**Result**: Popup authentication now works correctly. The cancelled message is not sent after successful authentication, and even if it arrives late, VirtualTryOnBot ignores it because auth already succeeded.

---

## Fix #6: Infinite Auth Request Loop Causing 20k+ Supabase Requests

**Error**: Supabase dashboard shows 20,000+ auth requests in 1 hour, causing rate limiting.

**Root Cause**:
1. The `useEffect` in Index.tsx that handles messages had `isAuthed`, `needsOnboarding`, `selectedProduct` in its dependency array
2. Inside this same useEffect, `pidy-auth-request` and `pidy-onboarding-request` were sent to the SDK on every run
3. When SDK responds with tokens, it triggers `setAuthToken` which changes `isAuthed`
4. The changed `isAuthed` triggers the useEffect again, which sends another `pidy-auth-request`
5. This creates an infinite loop: request → response → state change → request → ...

**Files Changed**:
- `src/pages/Index.tsx` (lines 448-490)

**Fix Summary**:
1. Separated the initial auth/onboarding request into a new useEffect that only depends on `embedMode`
2. This ensures `pidy-auth-request` and `pidy-onboarding-request` are only sent ONCE on mount
3. The message listener useEffect still has `isAuthed`, `needsOnboarding`, `selectedProduct` for fresh state, but no longer sends requests on re-run

**Result**: Auth requests are now sent only once when the widget loads, eliminating the infinite loop.

---

## Fix #7: onAuthStateChange Re-subscribe Loop (Second Infinite Loop)

**Error**: Supabase auth requests still elevated after Fix #6. A second infinite loop existed.

**Root Cause**:
1. The `onAuthStateChange` useEffect (line 178) had `authToken` in its dependency array
2. Every time `authToken` changed, the effect unsubscribed and re-subscribed
3. Each new subscription triggers an `INITIAL_SESSION` event from Supabase
4. The handler called `setAuthToken(session.access_token)` which changed `authToken`
5. This created: subscribe -> INITIAL_SESSION -> setAuthToken -> re-subscribe -> INITIAL_SESSION -> ...
6. Each cycle made a Supabase auth API call

**Files Changed**:
- `src/pages/Index.tsx` (line 178-211)

**Fix Summary**:
1. Removed `authToken` from the dependency array of the `onAuthStateChange` useEffect
2. Changed `if (!authToken) setAuthToken(...)` to use functional update: `setAuthToken((prev) => prev || session.access_token)`
3. This avoids needing `authToken` in the closure while still only setting it if not already set
4. Subscription now only created once per mount (depends only on `embedMode` and `completeOnboarding`)

**Result**: The second infinite loop is eliminated. Auth state changes are handled by a single stable subscription.

---

## Fix #8: Widget-SDK Ping-Pong Loop (Third Infinite Loop)

**Error**: Console shows repeating cycle of `Stored tokens in central bridge`, `Tokens cached locally`, `Auth modal closed`, `Stored onboarding in central bridge: true`, `Onboarding marked complete` - hundreds of times.

**Root Cause**:
The widget and SDK were echoing messages back and forth in a ping-pong pattern:

1. SDK sends `pidy-auth-token` to widget (cached token)
2. Widget receives token, calls `supabase.auth.setSession()` (Supabase API call)
3. Widget sends `pidy-auth-success` BACK to SDK (echo!)
4. SDK receives `pidy-auth-success`, stores tokens, closes modal
5. `setSession()` triggers `onAuthStateChange` with `SIGNED_IN` event
6. `onAuthStateChange` handler sends `pidy-onboarding-complete` to SDK
7. SDK stores onboarding, sends bridge messages
8. Multiple places keep sending `pidy-auth-success` on every session check

Three separate echo paths existed:
- `pidy-auth-token` handler echoed `pidy-auth-success` back to SDK
- Session check useEffect sent `pidy-auth-success` when finding existing session
- `onAuthStateChange` handler sent `pidy-onboarding-complete` on every `SIGNED_IN` (including SDK-triggered ones)
- `tryon-auth-session` handler triggered `onAuthStateChange` which doubled the notifications

**Files Changed**:
- `src/pages/Index.tsx`

**Fix Summary**:
1. Added `tokenFromSdkRef` (useRef) to track whether current session came from SDK vs fresh popup
2. Removed `pidy-auth-success` echo from `pidy-auth-token` handler (SDK already has the token)
3. Removed `pidy-auth-success` and `pidy-onboarding-complete` sends from session check useEffect (SDK initiated the check)
4. Guarded `onAuthStateChange` handler: only sends `pidy-onboarding-complete` when `tokenFromSdkRef.current` is false (fresh popup auth)
5. Set `tokenFromSdkRef.current = true` before ALL `setSession()` calls except fresh popup auth
6. In `tryon-auth-session` handler, set `tokenFromSdkRef.current = true` to prevent `onAuthStateChange` from double-notifying SDK

**Result**: Messages between widget and SDK are now one-directional per event. No more ping-pong loops.

---

