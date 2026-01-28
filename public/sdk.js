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
 */

(function(window) {
  'use strict';

  const PIDY_ORIGIN = 'https://pidy-tryon.lovable.app';
  const STORAGE_KEY = 'pidy_auth_token';
  const REFRESH_KEY = 'pidy_refresh_token';
  const TOKEN_EXPIRY_KEY = 'pidy_token_expiry';

  // Token refresh buffer (refresh 5 minutes before expiry)
  const REFRESH_BUFFER_MS = 5 * 60 * 1000;

  const PidyTryOn = {
    _iframe: null,
    _container: null,
    _config: {},
    _refreshTimer: null,

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
      this._createWidget();
      this._startTokenRefresh();
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
      iframe.style.background = 'transparent';
      iframe.allow = 'clipboard-write';
      iframe.setAttribute('allowtransparency', 'true');

      this._container.innerHTML = '';
      this._container.appendChild(iframe);
      this._iframe = iframe;

      // Send cached token once iframe loads
      iframe.addEventListener('load', () => {
        this._sendCachedToken();
      });
    },

    /**
     * Set up message listener for communication with widget
     */
    _setupMessageListener: function() {
      window.addEventListener('message', (event) => {
        // Only accept messages from PIDY origin
        if (event.origin !== PIDY_ORIGIN) return;

        const payload = event.data || {};
        const { type, access_token, refresh_token, expires_in, source } = payload;

        // Widget -> parent debug events
        if (this._config && this._config.debug && source === 'pidy-widget') {
          const level = type === 'pidy-image-load' && payload.status === 'error' ? 'error' : 'log';
          console[level]('[PIDY WIDGET]', payload);
        }

        switch (type) {
          case 'pidy-auth-success':
            // User authenticated via popup - cache the tokens
            this._cacheTokens(access_token, refresh_token, expires_in);
            break;

          case 'pidy-auth-request':
            // Widget is requesting cached token
            this._sendCachedToken();
            break;

          case 'pidy-sign-out':
            // User signed out - clear cached tokens
            this._clearTokens();
            break;

          case 'tryon-expand':
            // Widget expanded - could trigger parent UI changes
            this._container.classList.add('pidy-expanded');
            break;

          case 'tryon-collapse':
            // Widget collapsed
            this._container.classList.remove('pidy-expanded');
            break;

          default:
            // No-op for other message types (debug logging handled above)
            break;
        }
      });
    },

    /**
     * Cache tokens in localStorage
     */
    _cacheTokens: function(accessToken, refreshToken, expiresIn) {
      if (!accessToken) return;

      try {
        localStorage.setItem(STORAGE_KEY, accessToken);
        
        if (refreshToken) {
          localStorage.setItem(REFRESH_KEY, refreshToken);
        }

        // Calculate and store expiry time
        const expiryTime = Date.now() + ((expiresIn || 3600) * 1000);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

        console.log('[PIDY SDK] Tokens cached successfully');
        this._startTokenRefresh();
      } catch (e) {
        console.warn('[PIDY SDK] Could not cache tokens:', e);
      }
    },

    /**
     * Send cached token to iframe
     */
    _sendCachedToken: function() {
      if (!this._iframe || !this._iframe.contentWindow) return;

      try {
        const accessToken = localStorage.getItem(STORAGE_KEY);
        const refreshToken = localStorage.getItem(REFRESH_KEY);

        if (accessToken) {
          // Check if token is expired
          const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
          if (Date.now() > expiry) {
            console.log('[PIDY SDK] Token expired, will attempt refresh');
            this._refreshTokens();
            return;
          }

          this._iframe.contentWindow.postMessage({
            type: 'pidy-auth-token',
            access_token: accessToken,
            refresh_token: refreshToken
          }, PIDY_ORIGIN);

          console.log('[PIDY SDK] Sent cached token to widget');
        }
      } catch (e) {
        console.warn('[PIDY SDK] Could not send cached token:', e);
      }
    },

    /**
     * Clear cached tokens
     */
    _clearTokens: function() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        console.log('[PIDY SDK] Tokens cleared');
      } catch (e) {
        console.warn('[PIDY SDK] Could not clear tokens:', e);
      }

      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = null;
      }
    },

    /**
     * Start automatic token refresh
     */
    _startTokenRefresh: function() {
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
      }

      try {
        const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
        const refreshToken = localStorage.getItem(REFRESH_KEY);

        if (!expiry || !refreshToken) return;

        const timeUntilRefresh = expiry - Date.now() - REFRESH_BUFFER_MS;

        if (timeUntilRefresh <= 0) {
          // Token is expired or about to expire, refresh now
          this._refreshTokens();
        } else {
          // Schedule refresh
          this._refreshTimer = setTimeout(() => {
            this._refreshTokens();
          }, timeUntilRefresh);

          console.log('[PIDY SDK] Token refresh scheduled in', Math.round(timeUntilRefresh / 1000 / 60), 'minutes');
        }
      } catch (e) {
        console.warn('[PIDY SDK] Could not schedule token refresh:', e);
      }
    },

    /**
     * Refresh tokens using refresh token
     */
    _refreshTokens: async function() {
      try {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) {
          console.log('[PIDY SDK] No refresh token available');
          this._clearTokens();
          return;
        }

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
          console.warn('[PIDY SDK] Token refresh failed, user will need to re-authenticate');
          this._clearTokens();
          return;
        }

        const data = await response.json();
        
        if (data.access_token) {
          this._cacheTokens(data.access_token, data.refresh_token, data.expires_in);
          this._sendCachedToken();
          console.log('[PIDY SDK] Token refreshed successfully');
        }
      } catch (e) {
        console.warn('[PIDY SDK] Token refresh error:', e);
        this._clearTokens();
      }
    },

    /**
     * Manually set auth token (for advanced integrations)
     * @param {string} accessToken - Supabase access token
     * @param {string} [refreshToken] - Supabase refresh token
     * @param {number} [expiresIn=3600] - Token expiry in seconds
     */
    setAuthToken: function(accessToken, refreshToken, expiresIn) {
      this._cacheTokens(accessToken, refreshToken, expiresIn || 3600);
      this._sendCachedToken();
    },

    /**
     * Sign out and clear cached tokens
     */
    signOut: function() {
      this._clearTokens();
      
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
        const token = localStorage.getItem(STORAGE_KEY);
        const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
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
