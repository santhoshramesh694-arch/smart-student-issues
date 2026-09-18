/**
 * Central API Client Wrapper
 * Handles JWT injection, response parsing, error handling, and session expiration.
 */

const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers
  };

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle unauthorized session expiration
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('login.html')) {
          window.location.href = '/login.html?expired=1';
        }
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}
