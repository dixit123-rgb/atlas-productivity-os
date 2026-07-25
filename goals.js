/* =============================================================
   ATLAS — GOALS PAGE LOGIC
   ============================================================= */

const State = {
  goals: [],
  currentFilter: 'all',
  searchQuery: '',
  editingGoalId: null,
  deletingGoalId: null
};

const els = {
  goalList: document.getElementById('goalList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  filterPills: document.querySelectorAll('.pill'),
  statTotal: document.getElementById('statTotal'),
  statActive: document.getElementById('statActive'),
  statCompleted: document.getElementById('statCompleted'),
  statPercent: document.getElementById('statPercent'),
  
  goalModalOverlay: document.getElementById('goalModalOverlay'),
  deleteModalOverlay: document.getElementById('deleteModalOverlay'),
  goalForm: document.getElementById('goalForm'),
  modalTitle: document.getElementById('modalTitle'),
  
  addGoalBtn: document.getElementById('addGoalBtn'),
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

function renderGoals() {
  let filtered = State.goals;
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  if (State.currentFilter === 'active') {
    filtered = filtered.filter(g => !g.completed);
  } else if (State.currentFilter === 'completed') {
    filtered = filtered.filter(g => g.completed);
  } else if (State.currentFilter === 'high') {
    filtered = filtered.filter(g => g.priority === 'high' && !g.completed);
  } else if (State.currentFilter === 'due') {
    filtered = filtered.filter(g => !g.completed && g.targetDate && g.targetDate >= todayStr && g.targetDate <= nextWeekStr);
  }

  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    filtered = filtered.filter(g => g.title.toLowerCase().includes(q) || (g.desc && g.desc.toLowerCase().includes(q)));
  }

  if (filtered.length === 0) {
    els.goalList.innerHTML = '';
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    els.goalList.innerHTML = filtered.map((g, i) => createGoalCardHTML(g, i)).join('');
    attachGoalCardEvents();
  }
}

function createGoalCardHTML(goal, index) {
  const priorityClass = `goal-badge--${goal.priority}`;
  const formattedDate = goal.targetDate ? new Date(goal.targetDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
  
  return `
    <article class="goal-card ${goal.completed ? 'goal-card--done' : ''}" data-id="${goal.id}" style="animation-delay: ${index * 50}ms">
      <div class="goal-card__head">
        <button class="goal-card__check" aria-label="Toggle complete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M5 12l5 5L20 7"/></svg>
        </button>
        <div class="goal-card__main">
          <div class="goal-card__title">${goal.title}</div>
          ${goal.desc ? `<div class="goal-card__desc">${goal.desc}</div>` : ''}
          
          <div class="goal-card__badges">
            <span class="goal-badge goal-badge--cat">${formatCategory(goal.category)}</span>
            <span class="goal-badge ${priorityClass}">${goal.priority.toUpperCase()}</span>
            <span class="goal-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              ${formattedDate}
            </span>
          </div>
        </div>
      </div>
      
      <div class="goal-card__foot">
        <div class="goal-progress">
          <div class="goal-progress__bar" style="width:${goal.progress}%"></div>
        </div>
        <span class="goal-progress__text">${goal.progress}%</span>
        <div class="goal-actions">
          <button class="task-action-btn" data-action="edit" aria-label="Edit goal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-action-btn task-action-btn--delete" data-action="delete" aria-label="Delete goal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function formatCategory(cat) {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function renderStats() {
  const total = State.goals.length;
  const completed = State.goals.filter(g => g.completed).length;
  const active = total - completed;
  const avgProgress = total === 0 ? 0 : Math.round(State.goals.reduce((sum, g) => sum + (g.progress || 0), 0) / total);

  if (els.statTotal) els.statTotal.textContent = total;
  if (els.statActive) els.statActive.textContent = active;
  if (els.statCompleted) els.statCompleted.textContent = completed;
  if (els.statPercent) els.statPercent.textContent = avgProgress;
}

function renderAll() {
  renderGoals();
  renderStats();
}

function attachGoalCardEvents() {
  document.querySelectorAll('.goal-card').forEach(card => {
    const id = card.dataset.id;
    
    card.querySelector('.goal-card__check').addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleGoalComplete(id);
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

async function toggleGoalComplete(id) {
  const goal = State.goals.find(g => g.id === id);
  if (!goal) return;
  
  const newCompleted = !goal.completed;
  const updates = { 
    completed: newCompleted, 
    status: newCompleted ? 'completed' : 'active',
    progress: newCompleted ? 100 : (goal.progress === 100 ? 0 : goal.progress)
  };

  try {
    await window.GoalService.update(id, updates);
    Object.assign(goal, updates);
    renderAll();
    toast(newCompleted ? 'Goal achieved! 🎯' : 'Goal reopened');
  } catch (error) {
    toast('Failed to update goal');
  }
}

// Filters
els.filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    els.filterPills.forEach(p => p.classList.remove('pill--active'));
    pill.classList.add('pill--active');
    State.currentFilter = pill.dataset.filter;
    renderGoals();
  });
});

// Search
if (els.searchInput) {
  els.searchInput.addEventListener('input', () => {
    State.searchQuery = els.searchInput.value;
    renderGoals();
  });
}

// Modal Triggers
[els.addGoalBtn, els.emptyAddBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', () => openAddModal());
});

// Close Modals
if (els.closeModalBtn) els.closeModalBtn.addEventListener('click', closeGoalModal);
if (els.cancelModalBtn) els.cancelModalBtn.addEventListener('click', closeGoalModal);
if (els.goalModalOverlay) {
  els.goalModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.goalModalOverlay) closeGoalModal();
  });
}

if (els.cancelDeleteBtn) els.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
if (els.deleteModalOverlay) {
  els.deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.deleteModalOverlay) closeDeleteModal();
  });
}

// Form Submit
if (els.goalForm) {
  els.goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const goalData = {
      title: document.getElementById('goalTitle').value.trim(),
      desc: document.getElementById('goalDesc').value.trim(),
      category: document.getElementById('goalCategory').value,
      priority: document.getElementById('goalPriority').value,
      targetDate: document.getElementById('goalTargetDate').value,
      progress: parseInt(document.getElementById('goalProgress').value, 10) || 0,
      notes: document.getElementById('goalNotes').value.trim()
    };

    if (!goalData.title) {
      toast('Title is required');
      return;
    }

    try {
      if (State.editingGoalId) {
        await window.GoalService.update(State.editingGoalId, goalData);
        const index = State.goals.findIndex(g => g.id === State.editingGoalId);
        if (index !== -1) Object.assign(State.goals[index], goalData);
        toast('Goal updated successfully');
      } else {
        const newGoal = await window.GoalService.create({ 
          ...goalData, 
          completed: false, 
          status: 'active' 
        });
        State.goals.push(newGoal);
        toast('Goal added successfully');
      }
      closeGoalModal();
      renderAll();
    } catch (error) {
      toast('Error saving goal');
    }
  });
}

// Confirm Delete
if (els.confirmDeleteBtn) {
  els.confirmDeleteBtn.addEventListener('click', async () => {
    if (!State.deletingGoalId) return;
    try {
      await window.GoalService.delete(State.deletingGoalId);
      State.goals = State.goals.filter(g => g.id !== State.deletingGoalId);
      closeDeleteModal();
      renderAll();
      toast('Goal deleted');
    } catch (error) {
      toast('Error deleting goal');
    }
  });
}

function openAddModal() {
  State.editingGoalId = null;
  els.modalTitle.textContent = 'Add Goal';
  els.goalForm.reset();
  document.getElementById('goalId').value = '';
  document.getElementById('goalProgress').value = '0';
  els.goalModalOverlay.classList.add('active');
  setTimeout(() => document.getElementById('goalTitle').focus(), 300);
}

function openEditModal(id) {
  const goal = State.goals.find(g => g.id === id);
  if (!goal) return;
  
  State.editingGoalId = id;
  els.modalTitle.textContent = 'Edit Goal';
  
  document.getElementById('goalId').value = id;
  document.getElementById('goalTitle').value = goal.title;
  document.getElementById('goalDesc').value = goal.desc || '';
  document.getElementById('goalCategory').value = goal.category;
  document.getElementById('goalPriority').value = goal.priority;
  document.getElementById('goalTargetDate').value = goal.targetDate || '';
  document.getElementById('goalProgress').value = goal.progress || 0;
  document.getElementById('goalNotes').value = goal.notes || '';
  
  els.goalModalOverlay.classList.add('active');
}

function closeGoalModal() {
  els.goalModalOverlay.classList.remove('active');
  State.editingGoalId = null;
}

function openDeleteModal(id) {
  State.deletingGoalId = id;
  els.deleteModalOverlay.classList.add('active');
}

function closeDeleteModal() {
  els.deleteModalOverlay.classList.remove('active');
  State.deletingGoalId = null;
}

async function loadGoalsData() {
  try {
    State.goals = await window.GoalService.getAll();
  } catch (error) {
    console.error('Error loading goals:', error);
    toast('Failed to load goals.');
    State.goals = []; 
  } finally {
    renderAll(); 
  }
}

async function initGoals() {
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

  await loadGoalsData();

  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:goals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, payload => {
        loadGoalsData();
      })
      .subscribe();
  }

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
  document.addEventListener('DOMContentLoaded', initGoals);
} else {
  initGoals();
}