/**
 * Authentication and Session State Manager
 */

const Auth = {
  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    const raw = localStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  logout() {
    this.clearSession();
    window.location.href = '/login.html?logged_out=1';
  },

  /**
   * Route Guard: Verifies token and checks permitted roles.
   * @param {Array<string>} allowedRoles 
   */
  requireAuth(allowedRoles = []) {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      this.clearSession();
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert(`Access Restricted: This portal is reserved for ${allowedRoles.join(' / ')} accounts.`);
      // Redirect to user's appropriate portal
      if (user.role === 'admin') window.location.href = '/admin/dashboard.html';
      else if (user.role === 'staff') window.location.href = '/staff/dashboard.html';
      else window.location.href = '/student/dashboard.html';
      return false;
    }

    return true;
  }
};
