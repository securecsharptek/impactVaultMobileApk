import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { appParams } from '@/lib/app-params';

// Create an axios client without authentication for login/register endpoints
const createAuthClient = () => {
  const baseURL = appParams.appBaseUrl || '';
  
  return createAxiosClient({
    baseURL: baseURL ? `${baseURL}/api/apps/${appParams.appId}` : `/api/apps/${appParams.appId}`,
    headers: {
      'Content-Type': 'application/json'
    },
    interceptResponses: true
  });
};

export const authService = {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} fullName - User's full name (optional)
   * @returns {Promise<{token: string, user: object}>}
   */
  async register(email, password, fullName = '') {
    try {
      const client = createAuthClient();
      const response = await client.post('/auth/register', {
        email,
        password,
        full_name: fullName
      });
      
      // Handle response based on Base44 API structure
      if (response.token) {
        // Store token in localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('base44_access_token', response.token);
          window.localStorage.setItem('token', response.token);
        }
      }
      
      return {
        success: true,
        token: response.token,
        user: response.user || response.data?.user
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error responses
      let errorMessage = 'Registration failed';
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw {
        success: false,
        message: errorMessage,
        status: error.status,
        error
      };
    }
  },

  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{token: string, user: object}>}
   */
  async login(email, password) {
    try {
      const client = createAuthClient();
      const response = await client.post('/auth/login', {
        email,
        password
      });
      
      // Handle response based on Base44 API structure
      if (response.token || response.access_token) {
        const token = response.token || response.access_token;
        // Store token in localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('base44_access_token', token);
          window.localStorage.setItem('token', token);
        }
      }
      
      return {
        success: true,
        token: response.token || response.access_token,
        user: response.user || response.data?.user
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error responses
      let errorMessage = 'Login failed';
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw {
        success: false,
        message: errorMessage,
        status: error.status,
        error
      };
    }
  },

  /**
   * Get OAuth login URL for a provider
   * @param {string} provider - OAuth provider (google, github, etc.)
   * @param {string} callbackUrl - URL to redirect after OAuth
   * @returns {string} - OAuth login URL
   */
  getOAuthUrl(provider = 'google', callbackUrl = '') {
    const baseUrl = appParams.appBaseUrl || '';
    const apiBaseUrl = baseUrl ? `${baseUrl}/api/apps/${appParams.appId}` : `/api/apps/${appParams.appId}`;
    
    const redirectUri = callbackUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    
    // Construct OAuth URL based on Base44 structure
    // This uses the native deep link for mobile, or the standard callback for web
    const oauthUrl = `${apiBaseUrl}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    return oauthUrl;
  },

  /**
   * Get OAuth login URL for a provider with a specific redirect URI
   * @param {string} provider - OAuth provider (google, github, etc.)
   * @param {string} redirectUri - The specific redirect URI to use
   * @returns {string} - OAuth login URL
   */
  getOAuthUrlWithRedirect(provider = 'google', redirectUri = '') {
    const baseUrl = appParams.appBaseUrl || '';
    const apiBaseUrl = baseUrl ? `${baseUrl}/api/apps/${appParams.appId}` : `/api/apps/${appParams.appId}`;
    
    const oauthUrl = `${apiBaseUrl}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    return oauthUrl;
  },

  /**
   * Resend OTP to email
   * @param {string} email - User email
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async resendOtp(email) {
    try {
      const client = createAuthClient();
      const response = await client.post('/auth/resend-otp', {
        email
      });
      
      return {
        success: true,
        message: response.message || 'OTP resent successfully'
      };
    } catch (error) {
      console.error('Resend OTP error:', error);
      
      let errorMessage = 'Failed to resend OTP';
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw {
        success: false,
        message: errorMessage,
        status: error.status,
        error
      };
    }
  },

  /**
   * Verify OTP for email
   * @param {string} email - User email
   * @param {string} otp - One-time password (usually 6 digits)
   * @returns {Promise<{token: string, user: object}>}
   */
  async verifyOtp(email, otp) {
    try {
      const client = createAuthClient();
      const response = await client.post('/auth/verify-otp', {
        email,
        otp_code: otp
      });
      
      // Handle response based on Base44 API structure
      if (response.token || response.access_token) {
        const token = response.token || response.access_token;
        // Store token in localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('base44_access_token', token);
          window.localStorage.setItem('token', token);
        }
      }
      
      return {
        success: true,
        token: response.token || response.access_token,
        user: response.user || response.data?.user
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      
      // Handle specific error responses
      let errorMessage = 'OTP verification failed';
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw {
        success: false,
        message: errorMessage,
        status: error.status,
        error
      };
    }
  },

  /**
   * Logout user
   * @returns {void}
   */
  logout() {
    try {
      // Clear tokens from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('base44_access_token');
        window.localStorage.removeItem('token');
        // Clear any other auth-related items
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Handle OAuth callback and retrieve token
   * @param {URLSearchParams} params - Query parameters from OAuth callback
   * @returns {Promise<{token: string, user: object}>}
   */
  async handleOAuthCallback(params) {
    const token = params.get('access_token') || params.get('token');
    const code = params.get('code');
    
    if (token) {
      // Token was provided in the callback
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('base44_access_token', token);
        window.localStorage.setItem('token', token);
      }
      return { success: true, token };
    }
    
    if (code) {
      // Code needs to be exchanged for token
      try {
        const client = createAuthClient();
        const response = await client.post('/auth/oauth/callback', { code });
        
        if (response.token || response.access_token) {
          const token = response.token || response.access_token;
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('base44_access_token', token);
            window.localStorage.setItem('token', token);
          }
          return { success: true, token };
        }
      } catch (error) {
        throw { success: false, message: 'OAuth callback handling failed', error };
      }
    }
    
    throw { success: false, message: 'No token or code in OAuth callback' };
  }
};
