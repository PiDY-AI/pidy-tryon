/**
 * PIDY Virtual Try-On Embed SDK
 * 
 * Usage:
 * 1. Add this script to your page:
 *    <script src="https://pidy-tryon.lovable.app/sdk.js"></script>
 * 
 * 2. Initialize and embed:
 *    <div id="pidy-tryon"></div>
 *    <script>
 *      PidyTryOn.init({
 *        container: '#pidy-tryon',
 *        productId: 'your-product-id',
 *        size: 'M' // optional
 *      });
 *    </script>
 * 
 * Or use data attributes:
 *    <div id="pidy-tryon" data-product-id="123" data-size="M"></div>
 *    <script>PidyTryOn.autoInit();</script>
 * 
 * SHARED AUTH: Users only need to log in once. Auth tokens are stored
 * on the PIDY domain and shared across all brand websites.
 */

(function(window) {
  'use strict';

  // Support localhost for development
  const PIDY_ORIGIN = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.origin
    : 'https://pidy-tryon.lovable.app';
  const AUTH_BRIDGE_URL = PIDY_ORIGIN + '/auth-bridge.html';
  
  // Fallback local storage keys (used alongside central storage)
  const LOCAL_STORAGE_KEY = 'pidy_auth_token';
  const LOCAL_REFRESH_KEY = 'pidy_refresh_token';
  const LOCAL_EXPIRY_KEY = 'pidy_token_expiry';
  const LOCAL_ONBOARDING_KEY = 'pidy_onboarding_complete';

  // Token refresh buffer (refresh 5 minutes before expiry)
  const REFRESH_BUFFER_MS = 5 * 60 * 1000;

  const PidyTryOn = {
    _iframe: null,
    _container: null,
    _config: {},
    _refreshTimer: null,
    _authBridge: null,
    _authBridgeReady: false,
    _pendingBridgeCallbacks: [],
    _cachedTokens: null,

    /**
     * Initialize the PIDY Try-On widget
     * @param {Object} config - Configuration options
     * @param {string} config.container - CSS selector for container element
     * @param {string} config.productId - Product ID to try on
     * @param {string} [config.size] - Pre-selected size
     * @param {boolean} [config.debug=false] - Enables debug logging + widget debug overlay
     * @param {number} [config.width=400] - Widget width in pixels
     * @param {number} [config.height=620] - Widget height in pixels
     */
    init: function(config) {
      this._config = {
        width: 400,
        height: 620,
        debug: false,
        ...config
      };

      if (!config.container) {
        console.error('[PIDY SDK] Container selector is required');
        return;
      }

      if (!config.productId) {
        console.error('[PIDY SDK] productId is required');
        return;
      }

      const container = document.querySelector(config.container);
      if (!container) {
        console.error('[PIDY SDK] Container element not found:', config.container);
        return;
      }

      this._container = container;
      this._setupMessageListener();
      this._createAuthBridge();
      this._createWidget();
    },

    /**
     * Auto-initialize from data attributes
     * Looks for elements with data-pidy-tryon or id="pidy-tryon"
     */
    autoInit: function() {
      const elements = document.querySelectorAll('[data-pidy-tryon], #pidy-tryon');
      
      elements.forEach((el) => {
        const productId = el.dataset.productId;
        const size = el.dataset.size;
        const debug = el.dataset.debug === 'true';
        const width = parseInt(el.dataset.width) || 400;
        const height = parseInt(el.dataset.height) || 620;

        if (!productId) {
          console.warn('[PIDY SDK] Element missing data-product-id:', el);
          return;
        }

        // Generate unique ID if needed
        if (!el.id) {
          el.id = 'pidy-tryon-' + Math.random().toString(36).substr(2, 9);
        }

        this.init({
          container: '#' + el.id,
          productId: productId,
          size: size,
          debug: debug,
          width: width,
          height: height
        });
      });
    },

    /**
     * Create hidden auth bridge iframe for centralized token storage
     */
    _createAuthBridge: function() {
      // Only create one bridge per page
      if (document.getElementById('pidy-auth-bridge')) {
        this._authBridge = document.getElementById('pidy-auth-bridge');
        return;
      }

      const bridge = document.createElement('iframe');
      bridge.id = 'pidy-auth-bridge';
      bridge.src = AUTH_BRIDGE_URL;
      bridge.style.cssText = 'position:absolute;width:0;height:0;border:none;visibility:hidden;';
      bridge.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(bridge);
      this._authBridge = bridge;

      console.log('[PIDY SDK] Auth bridge iframe created');
    },

    /**
     * Create the iframe widget
     */
    _createWidget: function() {
      const { productId, size, width, height, debug } = this._config;

      // Build URL with parameters
      let url = PIDY_ORIGIN + '/?productId=' + encodeURIComponent(productId);
      if (size) {
        url += '&size=' + encodeURIComponent(size);
      }
      if (debug) {
        url += '&debug=true';
      }

      if (debug) {
        console.log('[PIDY SDK] iframe src:', url);
      }

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.width = width;
      iframe.height = height;
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.style.overflow = 'hidden';
      // IMPORTANT: Use a solid background to avoid parent-page background bleeding through
      // and to prevent white flashes/overlays on some browsers during iframe paint.
      iframe.style.background = '#0d0d0d';
      iframe.style.display = 'block';
      iframe.allow = 'clipboard-write';
      iframe.setAttribute('allowtransparency', 'true');

      // Ensure the container itself doesn't show through if the iframe is still painting.
      try {
        this._container.style.background = '#0d0d0d';
        this._container.style.borderRadius = '12px';
        this._container.style.overflow = 'hidden';
      } catch (e) {
        // ignore
      }

      this._container.innerHTML = '';
      this._container.appendChild(iframe);
      this._iframe = iframe;

      // Request tokens from bridge once iframe loads
      iframe.addEventListener('load', () => {
        this._requestTokensFromBridge();
      });
    },

    /**
     * Set up message listener for communication with widget and bridge
     */
    _setupMessageListener: function() {
      window.addEventListener('message', (event) => {
        const payload = event.data || {};
        const { type, access_token, refresh_token, expires_in, source, tokens } = payload;

        // Messages from auth bridge (PIDY origin)
        if (event.origin === PIDY_ORIGIN) {
          switch (type) {
            case 'pidy-bridge-ready':
              console.log('[PIDY SDK] Auth bridge ready');
              this._authBridgeReady = true;
              // Process any pending callbacks
              this._pendingBridgeCallbacks.forEach(cb => cb());
              this._pendingBridgeCallbacks = [];
              break;

            case 'pidy-bridge-tokens':
              this._handleBridgeTokens(tokens);
              break;

            case 'pidy-bridge-stored':
            case 'pidy-bridge-updated':
            case 'pidy-bridge-cleared':
              if (this._config.debug) {
                console.log('[PIDY SDK] Bridge operation:', type, payload.success);
              }
              break;
          }
        }

        // Only accept widget messages from PIDY origin or localhost
        const isValidOrigin = event.origin === PIDY_ORIGIN ||
                             event.origin.includes('localhost') ||
                             event.origin.includes('127.0.0.1');
        if (!isValidOrigin) return;

        // Widget -> parent debug events
        if (this._config && this._config.debug && source === 'pidy-widget') {
          const level = type === 'pidy-image-load' && payload.status === 'error' ? 'error' : 'log';
          console[level]('[PIDY WIDGET]', payload);
        }

        switch (type) {
          case 'pidy-auth-success':
            // User authenticated via popup - store in central bridge + local
            this._storeTokensCentral(access_token, refresh_token, expires_in);
            this._cacheTokensLocal(access_token, refresh_token, expires_in);
            break;

          case 'pidy-auth-request':
            // Widget is requesting cached token
            this._sendCachedToken();
            break;

          case 'pidy-onboarding-request':
            // Widget is requesting onboarding status
            this._sendOnboardingStatus();
            break;

          case 'pidy-onboarding-complete':
            // Onboarding completed in popup - store locally
            this._setOnboardingComplete(true);
            console.log('[PIDY SDK] Onboarding marked complete');
            break;

          case 'pidy-sign-out':
            // User signed out - clear all tokens
            this._clearTokensCentral();
            this._clearTokensLocal();
            break;

          case 'tryon-expand':
            // Widget expanded - could trigger parent UI changes
            this._container.classList.add('pidy-expanded');
            break;

          case 'tryon-collapse':
            // Widget collapsed
            this._container.classList.remove('pidy-expanded');
            break;
        }
      });
    },

    /**
     * Request tokens from central auth bridge
     */
    _requestTokensFromBridge: function() {
      const doRequest = () => {
        if (this._authBridge && this._authBridge.contentWindow) {
          this._authBridge.contentWindow.postMessage({
            type: 'pidy-bridge-get-tokens'
          }, PIDY_ORIGIN);
          console.log('[PIDY SDK] Requested tokens from central bridge');
        }
      };

      if (this._authBridgeReady) {
        doRequest();
      } else {
        // Queue until bridge is ready
        this._pendingBridgeCallbacks.push(doRequest);
        // Also try local storage as fallback
        this._sendCachedToken();
      }
    },

    /**
     * Handle tokens received from bridge
     */
    _handleBridgeTokens: function(tokens) {
      if (!tokens) {
        console.log('[PIDY SDK] No tokens in central storage, trying local');
        this._sendCachedToken();
        return;
      }

      if (tokens.expired) {
        console.log('[PIDY SDK] Central token expired, attempting refresh');
        if (tokens.refreshToken) {
          this._refreshTokensWithToken(tokens.refreshToken);
        } else {
          this._sendCachedToken();
        }
        return;
      }

      if (tokens.accessToken) {
        console.log('[PIDY SDK] Got tokens from central bridge (expires in', Math.round(tokens.expiresIn / 60), 'minutes)');
        
        // Cache locally as backup
        this._cacheTokensLocal(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
        this._cachedTokens = tokens;
        
        // Send to widget
        this._sendTokenToWidget(tokens.accessToken, tokens.refreshToken);
        
        // Schedule refresh
        this._startTokenRefresh(tokens.expiresIn * 1000);
      }
    },

    /**
     * Store tokens in central bridge
     */
    _storeTokensCentral: function(accessToken, refreshToken, expiresIn) {
      if (!accessToken) return;

      const doStore = () => {
        if (this._authBridge && this._authBridge.contentWindow) {
          this._authBridge.contentWindow.postMessage({
            type: 'pidy-bridge-store-tokens',
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn
          }, PIDY_ORIGIN);
          console.log('[PIDY SDK] Stored tokens in central bridge');
        }
      };

      if (this._authBridgeReady) {
        doStore();
      } else {
        this._pendingBridgeCallbacks.push(doStore);
      }
    },

    /**
     * Update tokens in central bridge after refresh
     */
    _updateTokensCentral: function(accessToken, refreshToken, expiresIn) {
      if (!accessToken) return;

      if (this._authBridge && this._authBridge.contentWindow && this._authBridgeReady) {
        this._authBridge.contentWindow.postMessage({
          type: 'pidy-bridge-update-tokens',
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn
        }, PIDY_ORIGIN);
      }
    },

    /**
     * Clear tokens from central bridge
     */
    _clearTokensCentral: function() {
      if (this._authBridge && this._authBridge.contentWindow && this._authBridgeReady) {
        this._authBridge.contentWindow.postMessage({
          type: 'pidy-bridge-clear-tokens'
        }, PIDY_ORIGIN);
        console.log('[PIDY SDK] Cleared central tokens');
      }
    },

    /**
     * Cache tokens in local localStorage (fallback)
     */
    _cacheTokensLocal: function(accessToken, refreshToken, expiresIn) {
      if (!accessToken) return;

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, accessToken);
        
        if (refreshToken) {
          localStorage.setItem(LOCAL_REFRESH_KEY, refreshToken);
        }

        // Calculate and store expiry time
        const expiryTime = Date.now() + ((expiresIn || 3600) * 1000);
        localStorage.setItem(LOCAL_EXPIRY_KEY, expiryTime.toString());

        console.log('[PIDY SDK] Tokens cached locally');
      } catch (e) {
        console.warn('[PIDY SDK] Could not cache tokens locally:', e);
      }
    },

    /**
     * Send token to widget iframe
     */
    _sendTokenToWidget: function(accessToken, refreshToken) {
      if (!this._iframe || !this._iframe.contentWindow) return;

      this._iframe.contentWindow.postMessage({
        type: 'pidy-auth-token',
        access_token: accessToken,
        refresh_token: refreshToken
      }, PIDY_ORIGIN);

      console.log('[PIDY SDK] Sent token to widget');
    },

    /**
     * Send cached token to iframe (from local storage fallback)
     */
    _sendCachedToken: function() {
      if (!this._iframe || !this._iframe.contentWindow) return;

      try {
        const accessToken = localStorage.getItem(LOCAL_STORAGE_KEY);
        const refreshToken = localStorage.getItem(LOCAL_REFRESH_KEY);
        const expiry = parseInt(localStorage.getItem(LOCAL_EXPIRY_KEY) || '0');

        if (!accessToken) {
          console.log('[PIDY SDK] No local cached token');
          return;
        }

        // Check if token is expired
        const now = Date.now();
        const isExpired = now > expiry;

        if (isExpired) {
          console.log('[PIDY SDK] Local token expired, attempting refresh');
          if (refreshToken) {
            this._refreshTokensWithToken(refreshToken);
          }
          return;
        }

        this._sendTokenToWidget(accessToken, refreshToken);
        console.log('[PIDY SDK] Sent local cached token (expires in', Math.round((expiry - now) / 1000 / 60), 'minutes)');
        
        // Schedule refresh
        this._startTokenRefresh(expiry - now);
      } catch (e) {
        console.warn('[PIDY SDK] Could not send cached token:', e);
      }
    },

    /**
     * Clear local cached tokens
     */
    _clearTokensLocal: function() {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_REFRESH_KEY);
        localStorage.removeItem(LOCAL_EXPIRY_KEY);
        console.log('[PIDY SDK] Local tokens cleared');
      } catch (e) {
        console.warn('[PIDY SDK] Could not clear local tokens:', e);
      }

      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = null;
      }
    },

    /**
     * Set onboarding complete status in BOTH local and central storage
     */
    _setOnboardingComplete: function(isComplete) {
      try {
        // Store locally
        if (isComplete) {
          localStorage.setItem(LOCAL_ONBOARDING_KEY, 'true');
        } else {
          localStorage.removeItem(LOCAL_ONBOARDING_KEY);
        }

        // Also store in central bridge for cross-domain persistence
        if (this._authBridge && this._authBridge.contentWindow && this._authBridgeReady) {
          this._authBridge.contentWindow.postMessage({
            type: 'pidy-bridge-set-onboarding',
            complete: isComplete
          }, PIDY_ORIGIN);
          console.log('[PIDY SDK] Stored onboarding in central bridge:', isComplete);
        }
      } catch (e) {
        console.warn('[PIDY SDK] Could not set onboarding status:', e);
      }
    },

    /**
     * Send onboarding status to widget
     * Check BOTH local storage AND central bridge
     */
    _sendOnboardingStatus: function() {
      if (!this._iframe || !this._iframe.contentWindow) return;

      // Check local first
      const localComplete = localStorage.getItem(LOCAL_ONBOARDING_KEY) === 'true';

      // Also request from central bridge
      if (this._authBridge && this._authBridge.contentWindow && this._authBridgeReady) {
        this._authBridge.contentWindow.postMessage({
          type: 'pidy-bridge-get-onboarding'
        }, PIDY_ORIGIN);

        // Listen for response
        const handleOnboardingResponse = (event) => {
          if (event.origin === PIDY_ORIGIN && event.data.type === 'pidy-bridge-onboarding') {
            const centralComplete = event.data.isComplete;
            const isComplete = localComplete || centralComplete;

            this._iframe.contentWindow.postMessage({
              type: 'pidy-onboarding-status',
              isComplete: isComplete
            }, PIDY_ORIGIN);
            console.log('[PIDY SDK] Sent onboarding status (local:', localComplete, 'central:', centralComplete, 'final:', isComplete, ')');

            window.removeEventListener('message', handleOnboardingResponse);
          }
        };
        window.addEventListener('message', handleOnboardingResponse);
      } else {
        // No bridge, use local only
        this._iframe.contentWindow.postMessage({
          type: 'pidy-onboarding-status',
          isComplete: localComplete
        }, PIDY_ORIGIN);
        console.log('[PIDY SDK] Sent onboarding status (local only):', localComplete);
      }
    },

    /**
     * Start automatic token refresh
     */
    _startTokenRefresh: function(msUntilExpiry) {
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
      }

      if (!msUntilExpiry || msUntilExpiry <= 0) return;

      const timeUntilRefresh = msUntilExpiry - REFRESH_BUFFER_MS;

      if (timeUntilRefresh <= 0) {
        // Token is about to expire, refresh now
        this._refreshTokens();
      } else {
        // Schedule refresh
        this._refreshTimer = setTimeout(() => {
          this._refreshTokens();
        }, timeUntilRefresh);

        console.log('[PIDY SDK] Token refresh scheduled in', Math.round(timeUntilRefresh / 1000 / 60), 'minutes');
      }
    },

    /**
     * Refresh tokens using stored refresh token
     */
    _refreshTokens: async function() {
      const refreshToken = localStorage.getItem(LOCAL_REFRESH_KEY);
      if (refreshToken) {
        await this._refreshTokensWithToken(refreshToken);
      }
    },

    /**
     * Refresh tokens using provided refresh token
     */
    _refreshTokensWithToken: async function(refreshToken) {
      try {
        console.log('[PIDY SDK] Attempting token refresh...');

        // Call Supabase refresh endpoint
        const response = await fetch('https://owipkfsjnmydsjhbfjqu.supabase.co/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'sb_publishable_m9E_wkaJKaJQ6lSyZXfnZg_9pS_G5VX'
          },
          body: JSON.stringify({
            refresh_token: refreshToken
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error_description || errorData.error || 'Unknown error';
          
          console.warn('[PIDY SDK] Token refresh failed:', response.status, errorMsg);
          
          // If refresh token is invalid/expired, clear everything
          if (response.status === 400 || response.status === 401) {
            console.log('[PIDY SDK] Refresh token invalid, clearing all tokens');
            this._clearTokensLocal();
            this._clearTokensCentral();
            
            // Notify widget that auth is invalid
            if (this._iframe && this._iframe.contentWindow) {
              this._iframe.contentWindow.postMessage({
                type: 'pidy-auth-invalid',
                reason: 'refresh_token_expired'
              }, PIDY_ORIGIN);
            }
          }
          return;
        }

        const data = await response.json();
        
        if (data.access_token) {
          // Update both central and local storage
          this._storeTokensCentral(data.access_token, data.refresh_token, data.expires_in);
          this._cacheTokensLocal(data.access_token, data.refresh_token, data.expires_in);
          this._sendTokenToWidget(data.access_token, data.refresh_token);
          
          // Schedule next refresh
          this._startTokenRefresh((data.expires_in || 3600) * 1000);
          
          console.log('[PIDY SDK] Token refreshed successfully');
        }
      } catch (e) {
        console.warn('[PIDY SDK] Token refresh error:', e);
      }
    },

    /**
     * Manually set auth token (for advanced integrations)
     * @param {string} accessToken - Supabase access token
     * @param {string} [refreshToken] - Supabase refresh token
     * @param {number} [expiresIn=3600] - Token expiry in seconds
     */
    setAuthToken: function(accessToken, refreshToken, expiresIn) {
      expiresIn = expiresIn || 3600;
      this._storeTokensCentral(accessToken, refreshToken, expiresIn);
      this._cacheTokensLocal(accessToken, refreshToken, expiresIn);
      this._sendTokenToWidget(accessToken, refreshToken);
      this._startTokenRefresh(expiresIn * 1000);
    },

    /**
     * Sign out and clear all cached tokens
     */
    signOut: function() {
      this._clearTokensLocal();
      this._clearTokensCentral();
      
      if (this._iframe && this._iframe.contentWindow) {
        this._iframe.contentWindow.postMessage({
          type: 'pidy-sign-out-request'
        }, PIDY_ORIGIN);
      }
    },

    /**
     * Check if user has cached auth
     * @returns {boolean}
     */
    isAuthenticated: function() {
      try {
        const token = localStorage.getItem(LOCAL_STORAGE_KEY);
        const expiry = parseInt(localStorage.getItem(LOCAL_EXPIRY_KEY) || '0');
        return !!token && Date.now() < expiry;
      } catch (e) {
        return false;
      }
    }
  };

  // Expose to global scope
  window.PidyTryOn = PidyTryOn;

  // Track initialized elements to avoid double-init
  const initializedElements = new WeakSet();

  // Auto-init helper - only initializes new elements
  function runAutoInit() {
    const autoElements = document.querySelectorAll('[data-pidy-auto], [data-pidy-tryon]');
    
    autoElements.forEach(function(el) {
      if (initializedElements.has(el)) return;
      
      const productId = el.dataset.productId;
      if (!productId) {
        console.warn('[PIDY SDK] Element missing data-product-id:', el);
        return;
      }

      // Mark as initialized before calling init
      initializedElements.add(el);

      const size = el.dataset.size;
      const debug = el.dataset.debug === 'true';
      const width = parseInt(el.dataset.width) || 400;
      const height = parseInt(el.dataset.height) || 620;

      // Generate unique ID if needed
      if (!el.id) {
        el.id = 'pidy-tryon-' + Math.random().toString(36).substr(2, 9);
      }

      console.log('[PIDY SDK] Auto-initializing element:', el.id);

      PidyTryOn.init({
        container: '#' + el.id,
        productId: productId,
        size: size,
        debug: debug,
        width: width,
        height: height
      });
    });
  }

  // MutationObserver for SPA support - detects dynamically added elements
  function setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(function(mutations) {
      let shouldScan = false;
      
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node or any descendant matches
            if (node.matches && (node.matches('[data-pidy-auto]') || node.matches('[data-pidy-tryon]') || node.matches('#pidy-tryon'))) {
              shouldScan = true;
            } else if (node.querySelector && node.querySelector('[data-pidy-auto], [data-pidy-tryon], #pidy-tryon')) {
              shouldScan = true;
            }
          }
        });
      });

      if (shouldScan) {
        // Small delay to ensure React has finished rendering
        setTimeout(runAutoInit, 50);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[PIDY SDK] MutationObserver active for SPA support');
  }

  // Manual scan method for explicit triggering
  PidyTryOn.scan = function() {
    console.log('[PIDY SDK] Manual scan triggered');
    runAutoInit();
  };

  // Listen for custom event to re-scan
  window.addEventListener('pidy-tryon-scan', function() {
    console.log('[PIDY SDK] Scan event received');
    runAutoInit();
  });

  // Auto-init on DOMContentLoaded or immediately if DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      runAutoInit();
      setupMutationObserver();
    });
  } else {
    // DOM already loaded - run immediately
    runAutoInit();
    setupMutationObserver();
  }

})(window);
