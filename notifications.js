/* =============================================================
   ATLAS — NOTIFICATIONS PAGE LOGIC
   ============================================================= */

const State = {
  notifications: [],
  currentFilter: 'all',
  searchQuery: '',
  snoozingId: null
};

const els = {
  notifList: document.getElementById('notifList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  filterPills: document.querySelectorAll('.pill'),
  clearReadBtn: document.getElementById('clearReadBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  
  snoozeModal: document.getElementById('snoozeModalOverlay'),
  closeSnoozeBtn: document.getElementById('closeSnoozeBtn'),
  snoozeOptions: document.querySelectorAll('.snooze-options .btn')
};

function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function loadNotifications() {
  try {
    State.notifications = await window.NotificationService.getAll(1, 50);
    renderNotifications();
  } catch (error) {
    console.error('Error loading notifications:', error);
    toast('Failed to load notifications.');
  }
}

function renderNotifications() {
  let filtered = [...State.notifications];

  if (State.currentFilter === 'unread') {
    filtered = filtered.filter(n => !n.isRead && !n.isArchived);
  } else if (State.currentFilter === 'today') {
    const todayStr = new Date().toISOString().split('T')[0];
    filtered = filtered.filter(n => new Date(n.createdAt).toISOString().split('T')[0] === todayStr && !n.isArchived);
  } else if (State.currentFilter === 'archived') {
    filtered = filtered.filter(n => n.isArchived);
  } else if (State.currentFilter === 'pinned') {
    filtered = filtered.filter(n => n.isPinned);
  } else {
    // All -> exclude archived by default
    filtered = filtered.filter(n => !n.isArchived);
  }

  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || (n.message && n.message.toLowerCase().includes(q)));
  }

  if (filtered.length === 0) {
    els.notifList.innerHTML = '';
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    els.notifList.innerHTML = filtered.map((n, i) => createNotifCardHTML(n, i)).join('');
    attachCardEvents();
  }
}

function createNotifCardHTML(notif, index) {
  const timeStr = formatTime(notif.createdAt);
  const iconSvg = getIconSvg(notif.icon);
  
  return `
    <article class="notif-card ${notif.isRead ? 'notif-card--read' : ''} notif-card--${notif.priority}" data-id="${notif.id}" style="animation-delay: ${index * 30}ms">
      <div class="notif-card__icon">${iconSvg}</div>
      <div class="notif-card__main">
        <div class="notif-card__head">
          <div class="notif-card__title">${notif.title}</div>
          <div class="notif-card__time">${timeStr}</div>
        </div>
        <div class="notif-card__msg">${notif.message || ''}</div>
        <div class="notif-card__actions">
          ${notif.actionUrl && notif.actionUrl !== '#' ? `<button class="notif-action-btn" data-action="open">Open</button>` : ''}
          <button class="notif-action-btn" data-action="read">${notif.isRead ? 'Mark Unread' : 'Mark Read'}</button>
          <button class="notif-action-btn" data-action="pin">${notif.isPinned ? 'Unpin' : 'Pin'}</button>
          <button class="notif-action-btn" data-action="snooze">Snooze</button>
          <button class="notif-action-btn" data-action="archive">${notif.isArchived ? 'Unarchive' : 'Archive'}</button>
          <button class="notif-action-btn notif-action-btn--danger" data-action="delete">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function getIconSvg(icon) {
  const icons = {
    'bell': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    'alert': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    'calendar': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    'target': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  };
  return icons[icon] || icons['bell'];
}

function attachCardEvents() {
  document.querySelectorAll('.notif-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelectorAll('.notif-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        try {
          if (action === 'read') {
            const notif = State.notifications.find(n => n.id === id);
            if (notif.isRead) await window.NotificationService.markUnread(id);
            else await window.NotificationService.markRead(id);
          } else if (action === 'archive') {
            const notif = State.notifications.find(n => n.id === id);
            await window.NotificationService.update(id, { isArchived: !notif.isArchived });
          } else if (action === 'pin') {
            const notif = State.notifications.find(n => n.id === id);
            await window.NotificationService.pin(id, !notif.isPinned);
          } else if (action === 'delete') {
            await window.NotificationService.delete(id);
          } else if (action === 'snooze') {
            State.snoozingId = id;
            els.snoozeModal.classList.add('active');
          } else if (action === 'open') {
            const notif = State.notifications.find(n => n.id === id);
            if (notif.actionUrl) window.location.href = notif.actionUrl;
          }
          loadNotifications(); // Refresh list
        } catch (error) {
          toast('Action failed');
        }
      });
    });
  });
}

// Filters
els.filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    els.filterPills.forEach(p => p.classList.remove('pill--active'));
    pill.classList.add('pill--active');
    State.currentFilter = pill.dataset.filter;
    renderNotifications();
  });
});

// Search
if (els.searchInput) {
  els.searchInput.addEventListener('input', () => {
    State.searchQuery = els.searchInput.value;
    renderNotifications();
  });
}

// Clear Buttons
if (els.clearReadBtn) {
  els.clearReadBtn.addEventListener('click', async () => {
    await window.NotificationService.clearRead();
    loadNotifications();
    toast('Read notifications cleared');
  });
}

if (els.clearAllBtn) {
  els.clearAllBtn.addEventListener('click', async () => {
    if (confirm('Clear all non-pinned notifications?')) {
      await window.NotificationService.clearAll();
      loadNotifications();
      toast('All notifications cleared');
    }
  });
}

// Snooze Modal
if (els.closeSnoozeBtn) {
  els.closeSnoozeBtn.addEventListener('click', () => els.snoozeModal.classList.remove('active'));
  els.snoozeModal.addEventListener('click', (e) => {
    if (e.target === els.snoozeModal) els.snoozeModal.classList.remove('active');
  });
}

els.snoozeOptions.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!State.snoozingId) return;
    const mins = parseInt(btn.dataset.mins, 10);
    const snoozeUntil = new Date(Date.now() + mins * 60000);
    await window.NotificationService.snooze(State.snoozingId, snoozeUntil.getTime());
    els.snoozeModal.classList.remove('active');
    State.snoozingId = null;
    loadNotifications();
    toast(`Snoozed until ${snoozeUntil.toLocaleString()}`);
  });
});

async function initNotifications() {
  try {
    if (window.Auth) {
      const session = await window.Auth.getSession();
      if (!session) {
        window.location.href = 'auth.html';
        return;
      }
    }
  } catch (e) {
    console.error("Auth check failed", e);
  }

  await loadNotifications();

  // Realtime listener
  window.NotificationService.subscribeRealtime(() => {
    loadNotifications();
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el));

  document.getElementById('userPill')?.addEventListener('click', async () => {
    if (window.Auth) {
      await window.Auth.signOut();
      window.location.href = 'auth.html';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotifications);
} else {
  initNotifications();
}