/* =============================================================
   ATLAS — HABITS PAGE LOGIC
   ============================================================= */

const State = {
  habits: [],
  currentFilter: 'all',
  searchQuery: '',
  editingHabitId: null,
  deletingHabitId: null
};

const els = {
  habitList: document.getElementById('habitList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  filterPills: document.querySelectorAll('.pill'),
  statTotal: document.getElementById('statTotal'),
  statCompleted: document.getElementById('statCompleted'),
  statStreak: document.getElementById('statStreak'),
  statPercent: document.getElementById('statPercent'),
  
  habitModalOverlay: document.getElementById('habitModalOverlay'),
  deleteModalOverlay: document.getElementById('deleteModalOverlay'),
  habitForm: document.getElementById('habitForm'),
  modalTitle: document.getElementById('modalTitle'),
  
  addHabitBtn: document.getElementById('addHabitBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn')
};

function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

function renderHabits() {
  let filtered = State.habits;

  if (State.currentFilter === 'today') {
    filtered = filtered.filter(h => !h.completedToday);
  } else if (State.currentFilter === 'completed') {
    filtered = filtered.filter(h => h.completedToday);
  }

  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    filtered = filtered.filter(h => h.title.toLowerCase().includes(q) || (h.desc && h.desc.toLowerCase().includes(q)));
  }

  if (filtered.length === 0) {
    els.habitList.innerHTML = '';
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    els.habitList.innerHTML = filtered.map((h, i) => createHabitCardHTML(h, i)).join('');
    attachHabitCardEvents();
  }
}

function createHabitCardHTML(habit, index) {
  return `
    <article class="habit-card ${habit.completedToday ? 'habit-card--done' : ''}" data-id="${habit.id}" style="--c:${habit.color}; animation-delay: ${index * 50}ms">
      <button class="habit-card__check" aria-label="Toggle complete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M5 12l5 5L20 7"/></svg>
      </button>
      <div class="habit-card__main">
        <div class="habit-card__title">${habit.title}</div>
        <div class="habit-card__meta">
          <span class="habit-streak">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            ${habit.streak} days
          </span>
          <span class="habit-badge">${habit.frequency}</span>
          ${habit.longestStreak > 0 ? `<span class="habit-badge">Best: ${habit.longestStreak}</span>` : ''}
        </div>
      </div>
      <div class="habit-actions">
        <button class="task-action-btn" data-action="edit" aria-label="Edit habit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="task-action-btn task-action-btn--delete" data-action="delete" aria-label="Delete habit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </article>
  `;
}

function renderStats() {
  const total = State.habits.length;
  const completed = State.habits.filter(h => h.completedToday).length;
  const maxStreak = State.habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (els.statTotal) els.statTotal.textContent = total;
  if (els.statCompleted) els.statCompleted.textContent = completed;
  if (els.statStreak) els.statStreak.textContent = maxStreak;
  if (els.statPercent) els.statPercent.textContent = percent;
}

function renderAll() {
  renderHabits();
  renderStats();
}

function attachHabitCardEvents() {
  document.querySelectorAll('.habit-card').forEach(card => {
    const id = card.dataset.id;
    
    card.querySelector('.habit-card__check').addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleHabitComplete(id);
    });

    card.querySelectorAll('.task-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'edit') openEditModal(id);
        else if (action === 'delete') openDeleteModal(id);
      });
    });
  });
}

async function toggleHabitComplete(id) {
  const habit = State.habits.find(h => h.id === id);
  if (!habit) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let updates = {};
  
  if (!habit.completedToday) {
    updates.completedToday = true;
    updates.currentValue = habit.targetValue;
    updates.lastCompletedAt = todayStr;
    
    if (habit.lastCompletedAt === yesterdayStr) {
      updates.streak = (habit.streak || 0) + 1;
    } else if (habit.lastCompletedAt === todayStr) {
      updates.streak = habit.streak || 1;
    } else {
      updates.streak = 1;
    }
    updates.longestStreak = Math.max(habit.longestStreak || 0, updates.streak);
  } else {
    updates.completedToday = false;
    updates.currentValue = 0;
    if (habit.lastCompletedAt === todayStr) {
      updates.streak = Math.max(0, (habit.streak || 1) - 1);
      updates.lastCompletedAt = updates.streak > 0 ? yesterdayStr : null;
    }
  }

  try {
    await window.HabitService.update(id, updates);
    Object.assign(habit, updates);
    renderAll();
    toast(updates.completedToday ? 'Habit completed! 🔥' : 'Habit uncompleted');
  } catch (error) {
    toast('Failed to update habit');
  }
}

// Filters
els.filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    els.filterPills.forEach(p => p.classList.remove('pill--active'));
    pill.classList.add('pill--active');
    State.currentFilter = pill.dataset.filter;
    renderHabits();
  });
});

// Search
if (els.searchInput) {
  els.searchInput.addEventListener('input', () => {
    State.searchQuery = els.searchInput.value;
    renderHabits();
  });
}

// Modal Triggers
[els.addHabitBtn, els.emptyAddBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', () => openAddModal());
});

// Close Modals
if (els.closeModalBtn) els.closeModalBtn.addEventListener('click', closeHabitModal);
if (els.cancelModalBtn) els.cancelModalBtn.addEventListener('click', closeHabitModal);
if (els.habitModalOverlay) {
  els.habitModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.habitModalOverlay) closeHabitModal();
  });
}

if (els.cancelDeleteBtn) els.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
if (els.deleteModalOverlay) {
  els.deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.deleteModalOverlay) closeDeleteModal();
  });
}

// Form Submit
if (els.habitForm) {
  els.habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const habitData = {
      title: document.getElementById('habitTitle').value.trim(),
      desc: document.getElementById('habitDesc').value.trim(),
      category: document.getElementById('habitCategory').value,
      frequency: document.getElementById('habitFrequency').value,
      icon: document.getElementById('habitIcon').value,
      color: document.getElementById('habitColor').value,
      reminderTime: document.getElementById('habitReminderTime').value,
      notes: document.getElementById('habitNotes').value.trim(),
      reminderEnabled: !!document.getElementById('habitReminderTime').value
    };

    if (!habitData.title) {
      toast('Title is required');
      return;
    }

    try {
      if (State.editingHabitId) {
        await window.HabitService.update(State.editingHabitId, habitData);
        const index = State.habits.findIndex(h => h.id === State.editingHabitId);
        if (index !== -1) Object.assign(State.habits[index], habitData);
        toast('Habit updated successfully');
      } else {
        const newHabit = await window.HabitService.create({ 
          ...habitData, 
          targetValue: 1, 
          currentValue: 0, 
          streak: 0, 
          longestStreak: 0, 
          completedToday: false 
        });
        State.habits.push(newHabit);
        toast('Habit added successfully');
      }
      closeHabitModal();
      renderAll();
    } catch (error) {
      toast('Error saving habit');
    }
  });
}

// Confirm Delete
if (els.confirmDeleteBtn) {
  els.confirmDeleteBtn.addEventListener('click', async () => {
    if (!State.deletingHabitId) return;
    try {
      await window.HabitService.delete(State.deletingHabitId);
      State.habits = State.habits.filter(h => h.id !== State.deletingHabitId);
      closeDeleteModal();
      renderAll();
      toast('Habit deleted');
    } catch (error) {
      toast('Error deleting habit');
    }
  });
}

function openAddModal() {
  State.editingHabitId = null;
  els.modalTitle.textContent = 'Add Habit';
  els.habitForm.reset();
  document.getElementById('habitId').value = '';
  document.getElementById('habitColor').value = '#FF5C39';
  els.habitModalOverlay.classList.add('active');
  setTimeout(() => document.getElementById('habitTitle').focus(), 300);
}

function openEditModal(id) {
  const habit = State.habits.find(h => h.id === id);
  if (!habit) return;
  
  State.editingHabitId = id;
  els.modalTitle.textContent = 'Edit Habit';
  
  document.getElementById('habitId').value = id;
  document.getElementById('habitTitle').value = habit.title;
  document.getElementById('habitDesc').value = habit.desc || '';
  document.getElementById('habitCategory').value = habit.category;
  document.getElementById('habitFrequency').value = habit.frequency;
  document.getElementById('habitIcon').value = habit.icon;
  document.getElementById('habitColor').value = habit.color;
  document.getElementById('habitReminderTime').value = habit.reminderTime || '';
  document.getElementById('habitNotes').value = habit.notes || '';
  
  els.habitModalOverlay.classList.add('active');
}

function closeHabitModal() {
  els.habitModalOverlay.classList.remove('active');
  State.editingHabitId = null;
}

function openDeleteModal(id) {
  State.deletingHabitId = id;
  els.deleteModalOverlay.classList.add('active');
}

function closeDeleteModal() {
  els.deleteModalOverlay.classList.remove('active');
  State.deletingHabitId = null;
}

async function loadHabitsData() {
  try {
    State.habits = await window.HabitService.getAll();
  } catch (error) {
    console.error('Error loading habits:', error);
    toast('Failed to load habits.');
    State.habits = []; // Ensure it's an empty array on failure
  } finally {
    renderAll(); // ALWAYS render, so empty state shows
  }
}

async function initHabits() {
  // 1. Check Auth
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

  // 2. Load Data
  await loadHabitsData();

  // 3. Realtime Listener
  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:habits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, payload => {
        loadHabitsData();
      })
      .subscribe();
  }

  // 4. Scroll Animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el));

  // 5. Logout
  document.getElementById('userPill')?.addEventListener('click', async () => {
    if (window.Auth) {
      await window.Auth.signOut();
      window.location.href = 'auth.html';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHabits);
} else {
  initHabits();
}