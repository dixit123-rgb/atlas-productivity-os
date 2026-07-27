/* =============================================================
   ATLAS — TASKS PAGE LOGIC
   Clean, modular, Supabase-ready
   ============================================================= */

/* -------------------------------------------------------------
   1. SUPABASE PLACEHOLDER
   When ready, replace mock data with Supabase calls.
   
   import { createClient } from '@supabase/supabase-js';
   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ------------------------------------------------------------- */

/**
 * TaskService - Abstraction layer for data operations.
 * Currently uses local memory. Swap internals for Supabase later.
 */
// TaskService is now loaded globally from supabase/config.js
// We just define UI state here.
const State = {
  tasks: [],
  currentFilter: 'today', // Must be 'today'
  currentSort: 'priority',
  searchQuery: '',
  editingTaskId: null,
  deletingTaskId: null
};
/* -------------------------------------------------------------
   2. STATE MANAGEMENT
   ------------------------------------------------------------- */


/* -------------------------------------------------------------
   3. UTILITIES
   ------------------------------------------------------------- */
function getDateString(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function isToday(dateStr) {
  return dateStr === getDateString(0);
}

function isOverdue(task) {
  if (task.done) return false;
  const taskDate = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
  return taskDate < new Date();
}

function isUpcoming(dateStr) {
  const today = new Date(getDateString(0));
  const date = new Date(dateStr);
  return date > today;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00');
  const today = new Date(getDateString(0) + 'T00:00');
  const diff = Math.round((date - today) / 86400000);
  
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCategory(cat) {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function toast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

/* -------------------------------------------------------------
   4. DOM ELEMENTS
   ------------------------------------------------------------- */
const els = {
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  filterPills: document.querySelectorAll('.pill'),
  statTotal: document.getElementById('statTotal'),
  statCompleted: document.getElementById('statCompleted'),
  statPending: document.getElementById('statPending'),
  statOverdue: document.getElementById('statOverdue'),
  statPercent: document.getElementById('statPercent'),
  navTaskCount: document.getElementById('navTaskCount'),
  
  // Modals
  taskModalOverlay: document.getElementById('taskModalOverlay'),
  deleteModalOverlay: document.getElementById('deleteModalOverlay'),
  taskForm: document.getElementById('taskForm'),
  modalTitle: document.getElementById('modalTitle'),
  
  // Buttons
  addTaskBtn: document.getElementById('addTaskBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn')
};

/* -------------------------------------------------------------
   5. RENDER FUNCTIONS
   ------------------------------------------------------------- */
function renderTasks() {
  let filtered = [...State.tasks];
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Filtering Logic
  switch (State.currentFilter) {
    
    case 'today':
      // Include tasks done today so they can move to the bottom, instead of disappearing
      filtered = filtered.filter(t => t.dueDate === todayStr);
      break;
    case 'upcoming':
      filtered = filtered.filter(t => t.dueDate > todayStr && !t.done);
      break;
    case 'completed':
      filtered = filtered.filter(t => t.done);
      break;
    case 'overdue':
      filtered = filtered.filter(t => !t.done && t.dueDate < todayStr);
      break;
    case 'all':
    default:
      // "All" now hides past, incomplete tasks
      filtered = filtered.filter(t => t.dueDate >= todayStr || t.done);
      break;
  }

  // 2. Search Logic
  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.desc && t.desc.toLowerCase().includes(q))
    );
  }

  // 3. Split into Pending and Completed
  const pending = filtered.filter(t => !t.done);
  const completed = filtered.filter(t => t.done);

  // 4. Sorting Pending (Priority 1->10 -> Due Date -> Creation Time)
  pending.sort((a, b) => {
    if (a.priority !== b.priority) return parseInt(a.priority) - parseInt(b.priority);
    if (a.dueDate !== b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    return a.createdAt - b.createdAt;
  });

  // 5. Sorting Completed (Completion Time, Newest first)
  completed.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  // 6. Render
  const sortedTasks = [...pending, ...completed];
  
  if (sortedTasks.length === 0) {
    els.taskList.innerHTML = '';
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    els.taskList.innerHTML = sortedTasks.map((t, i) => createTaskCardHTML(t, i)).join('');
    attachTaskCardEvents();
  }
    // Pass the filtered array to renderStats so stats match the current view
  renderStats(filtered);
}
function createTaskCardHTML(task, index) {
  const overdue = isOverdue(task);
  const priorityNum = parseInt(task.priority) || 5; // Default to 5 if missing
  
  // Determine color class based on 1-10 scale
  let priorityClass = 'task-badge--low'; // 8, 9, 10
  if (priorityNum <= 3) priorityClass = 'task-badge--high'; // 1, 2, 3
  else if (priorityNum <= 7) priorityClass = 'task-badge--med'; // 4, 5, 6, 7
  
  return `
    <article class="task-card ${task.done ? 'task-card--done' : ''}" data-id="${task.id}" style="animation-delay: ${index * 50}ms">
      <div class="task-card__head">
        <button class="task-card__check" aria-label="Toggle complete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M5 12l5 5L20 7"/></svg>
        </button>
        <div class="task-card__main">
          <div class="task-card__title">${task.title}</div>
          ${task.desc ? `<div class="task-card__desc">${task.desc}</div>` : ''}
          
          <div class="task-card__badges">
            <span class="task-badge task-badge--cat">${formatCategory(task.category)}</span>
            <span class="task-badge ${priorityClass}">P${priorityNum}</span>
            <span class="task-badge ${overdue ? 'task-badge--overdue' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              ${formatDate(task.dueDate)} ${task.dueTime || ''}
            </span>
            ${task.duration ? `<span class="task-badge">${task.duration}m</span>` : ''}
          </div>
        </div>
      </div>
      
      <div class="task-card__foot">
        <div class="task-progress">
          <div class="task-progress__bar" style="width:${task.progress || 0}%"></div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn" data-action="edit" aria-label="Edit task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-action-btn task-action-btn--delete" data-action="delete" aria-label="Delete task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderStats(filtered = []) {
  // Calculate stats strictly based on the passed 'filtered' array
  const total = filtered.length;
  const completed = filtered.filter(t => t.done).length;
  const pending = total - completed;
  
  // Calculate overdue only if we are looking at a view that includes them
  const todayStr = new Date().toISOString().split('T')[0];
  const overdue = filtered.filter(t => !t.done && t.dueDate < todayStr).length;

  if (els.statTotal) els.statTotal.textContent = total;
  if (els.statCompleted) els.statCompleted.textContent = completed;
  if (els.statPending) els.statPending.textContent = pending;
  if (els.statOverdue) els.statOverdue.textContent = overdue;
  
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  if (els.statPercent) els.statPercent.textContent = percent;
  
  if (els.navTaskCount) {
    // For the sidebar badge, count all pending tasks globally (active only)
    const allActivePending = State.tasks.filter(t => !t.done && (t.dueDate >= todayStr)).length;
    els.navTaskCount.textContent = allActivePending;
  }
}

function renderAll() {
  renderTasks();
  // Do not call renderStats() here anymore. 
  // renderTasks() now passes the filtered list to renderStats(filtered) automatically.
}

/* -------------------------------------------------------------
   6. EVENT HANDLERS
   ------------------------------------------------------------- */
function attachTaskCardEvents() {
  document.querySelectorAll('.task-card').forEach(card => {
    const id = card.dataset.id;
    
    // Checkbox toggle
        // Checkbox toggle
    card.querySelector('.task-card__check').addEventListener('click', async (e) => {
      e.stopPropagation();
      const task = State.tasks.find(t => t.id === id);
      if (!task) return;
      
      const newDone = !task.done;
      const updates = { 
        done: newDone, 
        status: newDone ? 'completed' : 'pending',
        progress: newDone ? 100 : (task.progress === 100 ? 0 : task.progress),
        completedAt: newDone ? Date.now() : null // ADDED THIS LINE
      };
      
      await window.TaskService.update(id, updates);
      Object.assign(task, updates);
      renderAll(); // This will re-render and move the task to the bottom
      toast(newDone ? 'Task completed 🎉' : 'Task reopened');
    });

    // Edit/Delete buttons
    card.querySelectorAll('.task-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'edit') {
          openEditModal(id);
        } else if (action === 'delete') {
          openDeleteModal(id);
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
    renderTasks();
  });
});

// Sort
els.sortSelect.addEventListener('change', () => {
  State.currentSort = els.sortSelect.value;
  renderTasks();
});

// Search
els.searchInput.addEventListener('input', () => {
  State.searchQuery = els.searchInput.value;
  renderTasks();
});

// Modal Triggers
[els.addTaskBtn, els.emptyAddBtn].forEach(btn => {
  btn.addEventListener('click', () => openAddModal());
});

// Close Modals
els.closeModalBtn.addEventListener('click', closeTaskModal);
els.cancelModalBtn.addEventListener('click', closeTaskModal);
els.taskModalOverlay.addEventListener('click', (e) => {
  if (e.target === els.taskModalOverlay) closeTaskModal();
});

els.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
els.deleteModalOverlay.addEventListener('click', (e) => {
  if (e.target === els.deleteModalOverlay) closeDeleteModal();
});

// Form Submit
els.taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const taskData = {
    title: document.getElementById('taskTitle').value.trim(),
    desc: document.getElementById('taskDesc').value.trim(),
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value || getDateString(0),
    dueTime: document.getElementById('taskDueTime').value,
    reminder: document.getElementById('taskReminder').value,
    duration: parseInt(document.getElementById('taskDuration').value, 10) || 0,
    notes: document.getElementById('taskNotes').value.trim()
  };

  if (!taskData.title) {
    toast('Title is required');
    return;
  }

  if (State.editingTaskId) {
    // Update existing
    const updates = { ...taskData, progress: 0, status: 'pending', done: false };
    // Keep existing progress/done if editing
    const existing = State.tasks.find(t => t.id === State.editingTaskId);
    if (existing) {
      updates.progress = existing.progress;
      updates.done = existing.done;
      updates.status = existing.status;
    }
    
   await window.TaskService.update(State.editingTaskId, updates);
    const index = State.tasks.findIndex(t => t.id === State.editingTaskId);
    if (index !== -1) Object.assign(State.tasks[index], updates);
    toast('Task updated successfully');
  } else {
    // Create new
    const newTask = await TaskService.create({ ...taskData, progress: 0, status: 'pending', done: false });

    State.tasks.push(newTask);
    toast('Task added successfully');
  }

  closeTaskModal();
  renderAll();
});

// Confirm Delete
els.confirmDeleteBtn.addEventListener('click', async () => {
  if (!State.deletingTaskId) return;
  await window.TaskService.delete(State.deletingTaskId);
  State.tasks = State.tasks.filter(t => t.id !== State.deletingTaskId);
  closeDeleteModal();
  renderAll();
  toast('Task deleted');
});

/* -------------------------------------------------------------
   7. MODAL CONTROLS
   ------------------------------------------------------------- */
function openAddModal() {
  State.editingTaskId = null;
  els.modalTitle.textContent = 'Add Task';
  els.taskForm.reset();
  document.getElementById('taskId').value = '';
  
  // Set default due date to Tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];
  
  document.getElementById('taskPriority').value = '5'; // Default priority
  
  els.taskModalOverlay.classList.add('active');
  setTimeout(() => document.getElementById('taskTitle').focus(), 300);
}

function openEditModal(id) {
  const task = State.tasks.find(t => t.id === id);
  if (!task) return;
  
  State.editingTaskId = id;
  els.modalTitle.textContent = 'Edit Task';
  
  document.getElementById('taskId').value = id;
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDesc').value = task.desc;
  document.getElementById('taskCategory').value = task.category;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskDueDate').value = task.dueDate;
  document.getElementById('taskDueTime').value = task.dueTime || '';
  document.getElementById('taskReminder').value = task.reminder || 'none';
  document.getElementById('taskDuration').value = task.duration || '';
  document.getElementById('taskNotes').value = task.notes || '';
  
  els.taskModalOverlay.classList.add('active');
}

function closeTaskModal() {
  els.taskModalOverlay.classList.remove('active');
  State.editingTaskId = null;
}

function openDeleteModal(id) {
  State.deletingTaskId = id;
  els.deleteModalOverlay.classList.add('active');
}

function closeDeleteModal() {
  els.deleteModalOverlay.classList.remove('active');
  State.deletingTaskId = null;
}

/* -------------------------------------------------------------
   8. INITIALIZATION
   ------------------------------------------------------------- */
async function initTasksPage() {
  // 1. Check Authentication
  const session = await window.Auth.getSession();
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  // 2. Load Real Data
  await loadTasksData();

  // 3. Setup Realtime Listener
  window.supabaseClient
    .channel('public:tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
      loadTasksData(); // Refresh tasks automatically when DB changes
    })
    .subscribe();

  // 4. Setup Scroll Animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el));

  // 5. Attach Logout to User Pill
  document.getElementById('userPill')?.addEventListener('click', async () => {
    await window.Auth.signOut();
    window.location.href = 'auth.html';
  });
}

// Function to fetch and render tasks
async function loadTasksData() {
  try {
    State.tasks = await window.TaskService.getAll();
    renderAll();
  } catch (error) {
    console.error('Error loading tasks:', error);
    toast('Failed to load tasks. Check connection.');
  }
}

// Initialize if script.js hasn't already initialized common components
// We wrap in DOMContentLoaded to ensure HTML is parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTasksPage);
} else {
  initTasksPage();
}