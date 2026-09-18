/**
 * UI Utilities, Notifications, Formatters, and Component Helpers
 */

const UI = {
  /**
   * Escape HTML to prevent XSS injection
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Display a floating Toast notification
   */
  showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-custom';

    const icons = {
      success: '<i class="fa-solid fa-circle-check text-success fs-5"></i>',
      danger: '<i class="fa-solid fa-circle-exclamation text-danger fs-5"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation text-warning fs-5"></i>',
      info: '<i class="fa-solid fa-circle-info text-primary fs-5"></i>'
    };

    toast.innerHTML = `
      ${icons[type] || icons.info}
      <div class="flex-grow-1">
        <div class="fw-semibold text-dark text-capitalize">${type}</div>
        <div class="text-secondary small mt-1">${this.escapeHTML(message)}</div>
      </div>
      <button type="button" class="btn-close btn-sm ms-2" aria-label="Close"></button>
    `;

    const closeBtn = toast.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  },

  /**
   * Render Status Badge
   */
  renderStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    const map = {
      pending: { label: 'Pending', icon: 'fa-clock', class: 'status-pending' },
      assigned: { label: 'Assigned', icon: 'fa-user-check', class: 'status-assigned' },
      in_progress: { label: 'In Progress', icon: 'fa-spinner fa-spin', class: 'status-in_progress' },
      resolved: { label: 'Resolved', icon: 'fa-circle-check', class: 'status-resolved' },
      closed: { label: 'Closed', icon: 'fa-circle-xmark', class: 'status-closed' },
      rejected: { label: 'Rejected', icon: 'fa-ban', class: 'status-rejected' }
    };
    const item = map[s] || map.pending;
    return `<span class="badge-status ${item.class}"><i class="fa-solid ${item.icon}"></i> ${item.label}</span>`;
  },

  /**
   * Render Priority Badge
   */
  renderPriorityBadge(priority) {
    const p = (priority || 'medium').toLowerCase();
    const map = {
      low: { label: 'Low', class: 'priority-low' },
      medium: { label: 'Medium', class: 'priority-medium' },
      high: { label: 'High', class: 'priority-high' },
      critical: { label: 'Critical', class: 'priority-critical' }
    };
    const item = map[p] || map.medium;
    return `<span class="badge-status ${item.class}"><i class="fa-solid fa-flag"></i> ${item.label}</span>`;
  },

  /**
   * Date and Time Formatters
   */
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return this.formatDate(dateStr);
  },

  /**
   * Render Empty State Card
   */
  renderEmptyState(title = 'No records found', subtitle = 'Try adjusting your search criteria or create a new issue.') {
    return `
      <div class="text-center py-5">
        <div class="mb-3 text-muted">
          <i class="fa-solid fa-inbox fa-3x" style="opacity: 0.35;"></i>
        </div>
        <h5 class="text-dark fw-bold mb-1">${title}</h5>
        <p class="text-secondary small mb-0">${subtitle}</p>
      </div>
    `;
  }
};
