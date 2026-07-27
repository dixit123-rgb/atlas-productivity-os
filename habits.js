/* =============================================================
   ATLAS — HABITS PAGE LOGIC
   ============================================================= */

const State = {
  habits: [],
  completions: {}, // Map of habitId -> array of 'YYYY-MM-DD' strings
  currentFilter: 'all',
  selectedDate: new Date().toISOString().split('T')[0], // Defaults to today
  searchQuery: '',
  editingHabitId: null,
  deletingHabitId: null
};

const els = {
  habitList: document.getElementById('habitList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  filterPills: document.querySelectorAll('.pill'),
  dateSelector: document.getElementById('habitDateSelector'),
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

function calculateStreak(completionDates) {
  if (!completionDates || completionDates.length === 0) return 0;
  
  // Sort dates descending
  const sortedDates = [...completionDates].sort((a, b) => new Date(b) - new Date(a));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // If the most recent completion is not today or yesterday, streak is broken
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(sortedDates[0] + 'T00:00:00');

  // Loop backwards through dates
  for (let i = 0; i < sortedDates.length; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (sortedDates.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break; // Gap found, streak ends
    }
  }

  return streak;
}

function isDateLocked(dateStr) {
  const selected = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today - selected;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 7; // Locked if older than 7 days
}

function renderHabits() {
  let filtered = State.habits;
  const selectedDate = State.selectedDate;
  const isLocked = isDateLocked(selectedDate);

  // Check completion status for the selected date
  filtered = filtered.map(h => {
    const completions = State.completions[h.id] || [];
    return {
      ...h,
      completedToday: completions.includes(selectedDate)
    };
  });

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
    els.habitList.innerHTML = filtered.map((h, i) => createHabitCardHTML(h, i, isLocked)).join('');
    attachHabitCardEvents(isLocked);
  }
}

function createHabitCardHTML(habit, index, isLocked) {
  const lockIconSVG = `<div class="habit-card__lock-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>`;
  
  return `
    <article class="habit-card ${habit.completedToday ? 'habit-card--done' : ''} ${isLocked ? 'habit-card--locked' : ''}" data-id="${habit.id}" style="--c:${habit.color}; animation-delay: ${index * 50}ms">
      <button class="habit-card__check" aria-label="Toggle complete" ${isLocked ? 'disabled' : ''}>
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
      ${isLocked ? lockIconSVG : `
        <div class="habit-actions">
          <button class="task-action-btn" data-action="edit" aria-label="Edit habit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-action-btn task-action-btn--delete" data-action="delete" aria-label="Delete habit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      `}
    </article>
  `;
}

function renderStats() {
  const selectedDate = State.selectedDate;
  const total = State.habits.length;
  
  // Count how many are completed on the SELECTED date
  const completed = State.habits.filter(h => {
    return (State.completions[h.id] || []).includes(selectedDate);
  }).length;
  
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

function attachHabitCardEvents(isLocked) {
  document.querySelectorAll('.habit-card').forEach(card => {
    const id = card.dataset.id;
    
    if (!isLocked) {
      const checkBtn = card.querySelector('.habit-card__check');
      if (checkBtn) {
        checkBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await toggleHabitComplete(id);
        });
      }

      card.querySelectorAll('.task-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'edit') openEditModal(id);
          else if (action === 'delete') openDeleteModal(id);
        });
      });
    }
  });
}

async function toggleHabitComplete(id) {
  const habit = State.habits.find(h => h.id === id);
  if (!habit) return;

  const dateStr = State.selectedDate;
  const isCurrentlyComplete = (State.completions[id] || []).includes(dateStr);

  try {
    // 1. Toggle in Database
    await window.HabitService.toggleCompletion(id, dateStr);
    
    // 2. Update Local State
    if (!State.completions[id]) State.completions[id] = [];
    if (isCurrentlyComplete) {
      State.completions[id] = State.completions[id].filter(d => d !== dateStr);
    } else {
      State.completions[id].push(dateStr);
    }
    
    // 3. Recalculate Streak
    habit.streak = calculateStreak(State.completions[id]);
    
    // 4. Update Best Streak if needed
    if (habit.streak > (habit.longestStreak || 0)) {
      habit.longestStreak = habit.streak;
      await window.HabitService.update(id, { longestStreak: habit.longestStreak });
    }
    
    renderAll();
    toast(isCurrentlyComplete ? 'Habit uncompleted' : 'Habit completed! 🔥');
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

// Date Selector
if (els.dateSelector) {
  els.dateSelector.value = State.selectedDate; // Set default
  els.dateSelector.addEventListener('change', () => {
    State.selectedDate = els.dateSelector.value;
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
  // els.dateSelector.value = State.selectedDate;
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
    const [habits, completionsData] = await Promise.all([
      window.HabitService.getAll(),
      window.HabitService.getCompletions()
    ]);
    
    State.habits = habits;
    
    // Format completions into a map: { habitId: ['2024-07-28', '2024-07-29'] }
    const compMap = {};
    completionsData.forEach(c => {
      if (!compMap[c.habit_id]) compMap[c.habit_id] = [];
      compMap[c.habit_id].push(c.completion_date);
    });
    State.completions = compMap;

    // Recalculate streaks for UI
    State.habits.forEach(h => {
      h.streak = calculateStreak(State.completions[h.id] || []);
    });

  } catch (error) {
    console.error('Error loading habits:', error);
    toast('Failed to load habits.');
    State.habits = []; 
  } finally {
    renderAll(); 
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