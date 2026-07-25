/* =============================================================
   ATLAS — SETTINGS PAGE LOGIC
   ============================================================= */

const State = {
  settings: null,
  autoSaveTimer: null
};

const els = {
  fullName: document.getElementById('fullName'),
  username: document.getElementById('username'),
  bio: document.getElementById('bio'),
  
  theme: document.getElementById('theme'),
  accentColor: document.getElementById('accentColor'),
  compactMode: document.getElementById('compactMode'),
  animationsEnabled: document.getElementById('animationsEnabled'),
  
  language: document.getElementById('language'),
  timezone: document.getElementById('timezone'),
  dateFormat: document.getElementById('dateFormat'),
  timeFormat: document.getElementById('timeFormat'),
  startPage: document.getElementById('startPage'),
  
  defaultCalendarView: document.getElementById('defaultCalendarView'),
  defaultFocusMode: document.getElementById('defaultFocusMode'),
  
  notificationEnabled: document.getElementById('notificationEnabled'),
  browserNotifications: document.getElementById('browserNotifications'),
  emailNotifications: document.getElementById('emailNotifications'),
  
  analyticsEnabled: document.getElementById('analyticsEnabled'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  deleteAccountBtn: document.getElementById('deleteAccountBtn')
};

function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

async function loadSettings() {
  try {
    State.settings = await window.SettingsService.get();
    if (!State.settings) {
      // Create default settings if none exist
      State.settings = await window.SettingsService.create({
        theme: 'dark',
        accentColor: '#FF5C39'
      });
    }
    populateUI();
    applyAppearance();
  } catch (error) {
    console.error('Error loading settings:', error);
    toast('Failed to load settings.');
  }
}

function populateUI() {
  if (!State.settings) return;
  els.fullName.value = State.settings.fullName || '';
  els.username.value = State.settings.username || '';
  els.bio.value = State.settings.bio || '';
  
  els.theme.value = State.settings.theme;
  els.accentColor.value = State.settings.accentColor;
  els.compactMode.checked = State.settings.compactMode;
  els.animationsEnabled.checked = State.settings.animationsEnabled;
  
  els.language.value = State.settings.language;
  els.timezone.value = State.settings.timezone;
  els.dateFormat.value = State.settings.dateFormat;
  els.timeFormat.value = State.settings.timeFormat;
  els.startPage.value = State.settings.startPage;
  
  els.defaultCalendarView.value = State.settings.defaultCalendarView;
  els.defaultFocusMode.value = State.settings.defaultFocusMode;
  
  els.notificationEnabled.checked = State.settings.notificationEnabled;
  els.browserNotifications.checked = State.settings.browserNotifications;
  els.emailNotifications.checked = State.settings.emailNotifications;
  
  els.analyticsEnabled.checked = State.settings.analyticsEnabled;
}

function applyAppearance() {
  const theme = State.settings.theme || localStorage.getItem('atlas-theme') || 'dark';
  const accent = State.settings.accentColor || '#FF5C39';
  
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('--accent', accent);
  localStorage.setItem('atlas-theme', theme);
  localStorage.setItem('atlas-accent', accent);
}

function handleAutoSave() {
  if (!State.settings) return;
  clearTimeout(State.autoSaveTimer);
  toast('Saving...');
  
  State.autoSaveTimer = setTimeout(async () => {
    const updates = {
      fullName: els.fullName.value,
      username: els.username.value,
      bio: els.bio.value,
      theme: els.theme.value,
      accentColor: els.accentColor.value,
      compactMode: els.compactMode.checked,
      animationsEnabled: els.animationsEnabled.checked,
      language: els.language.value,
      timezone: els.timezone.value,
      dateFormat: els.dateFormat.value,
      timeFormat: els.timeFormat.value,
      startPage: els.startPage.value,
      defaultCalendarView: els.defaultCalendarView.value,
      defaultFocusMode: els.defaultFocusMode.value,
      notificationEnabled: els.notificationEnabled.checked,
      browserNotifications: els.browserNotifications.checked,
      emailNotifications: els.emailNotifications.checked,
      analyticsEnabled: els.analyticsEnabled.checked
    };
    
    try {
      await window.SettingsService.update(updates);
      Object.assign(State.settings, updates);
      applyAppearance();
      toast('Settings saved ✓');
    } catch (error) {
      toast('Error saving settings');
    }
  }, 800);
}

// Bind all inputs
Object.values(els).forEach(el => {
  if (!el || !el.tagName) return;
  if (el.id === 'exportDataBtn' || el.id === 'deleteAccountBtn') return;
  el.addEventListener('input', handleAutoSave);
  el.addEventListener('change', handleAutoSave);
});

// Export Data
if (els.exportDataBtn) {
  els.exportDataBtn.addEventListener('click', async () => {
    try {
      const data = {
        settings: State.settings,
        tasks: await window.TaskService.getAll(),
        habits: await window.HabitService.getAll(),
        goals: await window.GoalService.getAll()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Data exported successfully');
    } catch (error) {
      toast('Export failed');
    }
  });
}

// Delete Account
if (els.deleteAccountBtn) {
  els.deleteAccountBtn.addEventListener('click', async () => {
    if (confirm('Are you sure? This cannot be undone.')) {
      toast('Please contact support to delete your account.');
    }
  });
}

async function initSettings() {
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

  await loadSettings();

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
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}