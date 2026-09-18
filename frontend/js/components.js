/**
 * Reusable Navigation, Sidebar & Topbar Component Injector
 */

const Components = {
  renderLayout(activePageKey = '') {
    const user = Auth.getUser();
    if (!user) return;

    this.renderSidebar(user, activePageKey);
    this.renderTopbar(user);
    this.loadNotifications();
  },

  renderSidebar(user, activeKey) {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    const role = user.role;
    let menuItems = [];

    if (role === 'student') {
      menuItems = [
        { label: 'OVERVIEW', isHeader: true },
        { key: 'dashboard', href: '/student/dashboard.html', icon: 'fa-gauge-high', text: 'Dashboard' },
        { key: 'create-issue', href: '/student/create-issue.html', icon: 'fa-plus-circle', text: 'Report New Issue' },
        { key: 'issues', href: '/student/issues.html', icon: 'fa-list-check', text: 'My Issues' },
        { label: 'ACCOUNT', isHeader: true },
        { key: 'notifications', href: '/student/notifications.html', icon: 'fa-bell', text: 'Notifications', badge: true },
        { key: 'profile', href: '/student/profile.html', icon: 'fa-user-gear', text: 'My Profile' }
      ];
    } else if (role === 'staff') {
      menuItems = [
        { label: 'WORKSPACE', isHeader: true },
        { key: 'dashboard', href: '/staff/dashboard.html', icon: 'fa-gauge-high', text: 'Dashboard' },
        { key: 'assigned-issues', href: '/staff/assigned-issues.html', icon: 'fa-clipboard-list', text: 'Assigned Issues' },
        { label: 'ACCOUNT', isHeader: true },
        { key: 'profile', href: '/staff/profile.html', icon: 'fa-user-gear', text: 'My Profile' }
      ];
    } else if (role === 'admin') {
      menuItems = [
        { label: 'EXECUTIVE', isHeader: true },
        { key: 'dashboard', href: '/admin/dashboard.html', icon: 'fa-gauge-high', text: 'Dashboard' },
        { key: 'analytics', href: '/admin/analytics.html', icon: 'fa-chart-pie', text: 'Campus Analytics' },
        { label: 'MANAGEMENT', isHeader: true },
        { key: 'issues', href: '/admin/issues.html', icon: 'fa-list-check', text: 'Manage Issues' },
        { key: 'users', href: '/admin/users.html', icon: 'fa-users', text: 'User Directory' },
        { key: 'categories', href: '/admin/categories.html', icon: 'fa-tags', text: 'Issue Categories' },
        { label: 'SECURITY & SYSTEM', isHeader: true },
        { key: 'audit-logs', href: '/admin/audit-logs.html', icon: 'fa-shield-halved', text: 'Audit Trail' },
        { key: 'settings', href: '/admin/settings.html', icon: 'fa-sliders', text: 'Settings' }
      ];
    }

    let menuHtml = '';
    menuItems.forEach(item => {
      if (item.isHeader) {
        menuHtml += `<li class="sidebar-label">${item.label}</li>`;
      } else {
        const isActive = item.key === activeKey ? 'active' : '';
        const badgeHtml = item.badge ? `<span id="sidebar-notif-badge" class="badge bg-danger ms-auto rounded-pill d-none">0</span>` : '';
        menuHtml += `
          <li class="sidebar-item">
            <a href="${item.href}" class="sidebar-link ${isActive}">
              <i class="fa-solid ${item.icon}"></i>
              <span>${item.text}</span>
              ${badgeHtml}
            </a>
          </li>
        `;
      }
    });

    sidebarContainer.innerHTML = `
      <aside class="sidebar" id="app-sidebar">
        <a href="/" class="sidebar-brand">
          <span class="brand-badge"><i class="fa-solid fa-graduation-cap"></i></span>
          <div>
            <div class="lh-1">Smart Campus</div>
            <span class="badge bg-secondary text-uppercase mt-1" style="font-size: 0.65rem; letter-spacing: 0.5px;">${role} portal</span>
          </div>
        </a>
        <ul class="sidebar-menu">
          ${menuHtml}
        </ul>
        <div class="sidebar-footer">
          <button class="btn btn-outline-light w-100 btn-sm d-flex align-items-center justify-content-center gap-2" onclick="Auth.logout()">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    `;
  },

  renderTopbar(user) {
    const topbarContainer = document.getElementById('topbar-container');
    if (!topbarContainer) return;

    topbarContainer.innerHTML = `
      <header class="dashboard-topbar">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-sm btn-outline-secondary d-lg-none" id="sidebar-toggle" onclick="document.getElementById('app-sidebar').classList.toggle('show')">
            <i class="fa-solid fa-bars"></i>
          </button>
          <div class="d-none d-sm-block">
            <span class="text-secondary small">Campus Infrastructure Governance</span>
          </div>
        </div>

        <div class="d-flex align-items-center gap-3">
          <!-- Notification Bell Dropdown -->
          <div class="dropdown">
            <button class="btn btn-light position-relative rounded-circle p-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" id="notif-btn">
              <i class="fa-solid fa-bell text-secondary"></i>
              <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" id="notif-badge">
                0
              </span>
            </button>
            <div class="dropdown-menu dropdown-menu-end notification-dropdown" id="notif-dropdown">
              <div class="d-flex align-items-center justify-content-between p-3 border-bottom bg-light">
                <span class="fw-bold small text-dark">Notifications</span>
                <a href="#" class="text-primary small text-decoration-none" onclick="Components.markAllRead(event)">Mark all read</a>
              </div>
              <div id="notif-items-container">
                <div class="p-3 text-center text-muted small">Loading notifications...</div>
              </div>
            </div>
          </div>

          <!-- User Profile Dropdown -->
          <div class="dropdown">
            <button class="btn btn-light d-flex align-items-center gap-2 border rounded-pill px-3 py-1" type="button" data-bs-toggle="dropdown">
              <div class="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 0.85rem;">
                ${user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div class="text-start d-none d-md-block">
                <div class="fw-bold small lh-1">${UI.escapeHTML(user.full_name)}</div>
                <div class="text-muted text-capitalize" style="font-size: 0.725rem;">${user.role}</div>
              </div>
              <i class="fa-solid fa-chevron-down text-muted small"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li class="px-3 py-2 border-bottom">
                <div class="fw-bold small">${UI.escapeHTML(user.full_name)}</div>
                <div class="text-muted small">${UI.escapeHTML(user.email)}</div>
              </li>
              <li><a class="dropdown-item py-2" href="${user.role === 'student' ? '/student/profile.html' : (user.role === 'staff' ? '/staff/profile.html' : '/admin/settings.html')}"><i class="fa-solid fa-user-gear me-2 text-muted"></i>Profile Settings</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger py-2" href="#" onclick="Auth.logout()"><i class="fa-solid fa-arrow-right-from-bracket me-2"></i>Sign Out</a></li>
            </ul>
          </div>
        </div>
      </header>
    `;
  },

  async loadNotifications() {
    try {
      const res = await apiCall('/notifications');
      const { notifications, unread_count } = res.data;

      const badge = document.getElementById('notif-badge');
      const sideBadge = document.getElementById('sidebar-notif-badge');
      const container = document.getElementById('notif-items-container');

      if (unread_count > 0) {
        if (badge) {
          badge.textContent = unread_count;
          badge.classList.remove('d-none');
        }
        if (sideBadge) {
          sideBadge.textContent = unread_count;
          sideBadge.classList.remove('d-none');
        }
      } else {
        if (badge) badge.classList.add('d-none');
        if (sideBadge) sideBadge.classList.add('d-none');
      }

      if (!container) return;

      if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="p-3 text-center text-muted small">No notifications at this time.</div>';
        return;
      }

      container.innerHTML = notifications.slice(0, 5).map(n => `
        <a href="#" class="notification-item ${!n.is_read ? 'unread' : ''}" onclick="Components.handleNotifClick(${n.id}, event)">
          <div class="rounded-circle p-2 bg-light text-${n.type === 'danger' ? 'danger' : 'primary'}">
            <i class="fa-solid ${n.type === 'danger' ? 'fa-triangle-exclamation' : 'fa-bell'}"></i>
          </div>
          <div>
            <div class="fw-bold small text-dark">${UI.escapeHTML(n.title)}</div>
            <div class="text-secondary small">${UI.escapeHTML(n.message)}</div>
            <div class="text-muted" style="font-size: 0.7rem;">${UI.formatTimeAgo(n.created_at)}</div>
          </div>
        </a>
      `).join('');
    } catch (e) {
      console.warn('Notification load failed:', e);
    }
  },

  async handleNotifClick(notifId, event) {
    if (event) event.preventDefault();
    try {
      await apiCall(`/notifications/${notifId}/read`, { method: 'PUT' });
      this.loadNotifications();
    } catch (e) {
      console.error(e);
    }
  },

  async markAllRead(event) {
    if (event) event.preventDefault();
    try {
      await apiCall('/notifications/read-all', { method: 'PUT' });
      UI.showToast('All notifications marked as read', 'success');
      this.loadNotifications();
    } catch (e) {
      UI.showToast('Failed to mark notifications read', 'danger');
    }
  }
};
