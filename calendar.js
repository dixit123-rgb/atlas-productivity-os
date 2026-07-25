/* =============================================================
   ATLAS — CALENDAR PAGE LOGIC
   ============================================================= */

const State = {
  events: [],
  currentView: 'month', // 'month', 'week', 'day'
  currentDate: new Date(),
  searchQuery: '',
  editingEventId: null,
  deletingEventId: null,
  links: { goals: [], tasks: [], habits: [] }
};

const els = {
  eventList: document.getElementById('eventList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  viewPills: document.querySelectorAll('.pill'),
  calTitle: document.getElementById('calTitle'),
  calPrev: document.getElementById('calPrev'),
  calNext: document.getElementById('calNext'),
  calToday: document.getElementById('calToday'),
  
  eventModalOverlay: document.getElementById('eventModalOverlay'),
  deleteModalOverlay: document.getElementById('deleteModalOverlay'),
  eventForm: document.getElementById('eventForm'),
  modalTitle: document.getElementById('modalTitle'),
  
  addEventBtn: document.getElementById('addEventBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  
  // Form inputs
  goalLinkSelect: document.getElementById('eventGoalLink'),
  taskLinkSelect: document.getElementById('eventTaskLink'),
  habitLinkSelect: document.getElementById('eventHabitLink')
};

function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderEvents() {
  // Filter based on view and search
  let filtered = [...State.events];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (State.currentView === 'day') {
    const start = new Date(State.currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(State.currentDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(e => {
      const eDate = new Date(e.startDate + 'T00:00');
      return eDate >= start && eDate <= end;
    });
  } else if (State.currentView === 'week') {
    const start = new Date(State.currentDate);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(e => {
      const eDate = new Date(e.startDate + 'T00:00');
      return eDate >= start && eDate <= end;
    });
  } else if (State.currentView === 'month') {
    filtered = filtered.filter(e => {
      const eDate = new Date(e.startDate + 'T00:00');
      return eDate.getMonth() === State.currentDate.getMonth() && eDate.getFullYear() === State.currentDate.getFullYear();
    });
  }

  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || (e.desc && e.desc.toLowerCase().includes(q)));
  }

  // Sort by date/time
  filtered.sort((a, b) => new Date(a.startDate + 'T' + (a.startTime || '00:00')) - new Date(b.startDate + 'T' + (b.startTime || '00:00')));

  if (filtered.length === 0) {
    els.eventList.innerHTML = '';
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    els.eventList.innerHTML = filtered.map((e, i) => createEventCardHTML(e, i)).join('');
    attachEventCardEvents();
  }
}

function createEventCardHTML(event, index) {
  const dateStr = formatDate(event.startDate);
  const timeStr = event.allDay ? 'All Day' : `${event.startTime || ''} ${event.endTime ? '- ' + event.endTime : ''}`;
  
  let linksHTML = '';
  if (event.goalId) {
    const goal = State.links.goals.find(g => g.id === event.goalId);
    if (goal) linksHTML += `<a href="goals.html" class="event-badge event-badge--link">🎯 ${goal.title}</a>`;
  }
  if (event.taskId) {
    const task = State.links.tasks.find(t => t.id === event.taskId);
    if (task) linksHTML += `<a href="tasks.html" class="event-badge event-badge--link">✅ ${task.title}</a>`;
  }
  if (event.habitId) {
    const habit = State.links.habits.find(h => h.id === event.habitId);
    if (habit) linksHTML += `<a href="habits.html" class="event-badge event-badge--link">🔥 ${habit.title}</a>`;
  }

  return `
    <article class="event-card ${event.completed ? 'event-card--done' : ''}" data-id="${event.id}" style="--c:${event.color}; animation-delay: ${index * 50}ms">
      <div class="event-card__head">
        <button class="event-card__check" aria-label="Toggle complete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M5 12l5 5L20 7"/></svg>
        </button>
        <div class="event-card__main">
          <div class="event-card__title">${event.title}</div>
          <div class="event-card__badges">
            <span class="event-badge">${dateStr}</span>
            <span class="event-badge">${timeStr}</span>
            ${event.location ? `<span class="event-badge">📍 ${event.location}</span>` : ''}
            ${linksHTML}
          </div>
        </div>
      </div>
      <div class="event-card__foot">
        <div class="event-time">${event.desc || 'No description'}</div>
        <div class="event-actions">
          <button class="task-action-btn" data-action="edit" aria-label="Edit event">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-action-btn task-action-btn--delete" data-action="delete" aria-label="Delete event">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function updateCalTitle() {
  const options = { month: 'long', year: 'numeric' };
  if (State.currentView === 'day') options.day = 'numeric';
  els.calTitle.textContent = State.currentDate.toLocaleDateString('en-US', options);
}

function attachEventCardEvents() {
  document.querySelectorAll('.event-card').forEach(card => {
    const id = card.dataset.id;
    
    card.querySelector('.event-card__check').addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleEventComplete(id);
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

async function toggleEventComplete(id) {
  const event = State.events.find(e => e.id === id);
  if (!event) return;
  
  const updates = { completed: !event.completed };

  try {
    await window.CalendarService.update(id, updates);
    Object.assign(event, updates);
    renderEvents();
    toast(updates.completed ? 'Event completed!' : 'Event uncompleted');
  } catch (error) {
    toast('Failed to update event');
  }
}

// View Controls
els.viewPills.forEach(pill => {
  pill.addEventListener('click', () => {
    els.viewPills.forEach(p => p.classList.remove('pill--active'));
    pill.classList.add('pill--active');
    State.currentView = pill.dataset.view;
    updateCalTitle();
    renderEvents();
  });
});

els.calPrev.addEventListener('click', () => {
  if (State.currentView === 'month') State.currentDate.setMonth(State.currentDate.getMonth() - 1);
  else if (State.currentView === 'week') State.currentDate.setDate(State.currentDate.getDate() - 7);
  else State.currentDate.setDate(State.currentDate.getDate() - 1);
  updateCalTitle();
  renderEvents();
});

els.calNext.addEventListener('click', () => {
  if (State.currentView === 'month') State.currentDate.setMonth(State.currentDate.getMonth() + 1);
  else if (State.currentView === 'week') State.currentDate.setDate(State.currentDate.getDate() + 7);
  else State.currentDate.setDate(State.currentDate.getDate() + 1);
  updateCalTitle();
  renderEvents();
});

els.calToday.addEventListener('click', () => {
  State.currentDate = new Date();
  updateCalTitle();
  renderEvents();
});

// Search
if (els.searchInput) {
  els.searchInput.addEventListener('input', () => {
    State.searchQuery = els.searchInput.value;
    renderEvents();
  });
}

// Modal Triggers
[els.addEventBtn, els.emptyAddBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', () => openAddModal());
});

// Close Modals
if (els.closeModalBtn) els.closeModalBtn.addEventListener('click', closeEventModal);
if (els.cancelModalBtn) els.cancelModalBtn.addEventListener('click', closeEventModal);
if (els.eventModalOverlay) {
  els.eventModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.eventModalOverlay) closeEventModal();
  });
}

if (els.cancelDeleteBtn) els.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
if (els.deleteModalOverlay) {
  els.deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.deleteModalOverlay) closeDeleteModal();
  });
}

// Form Submit
if (els.eventForm) {
  els.eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventData = {
      title: document.getElementById('eventTitle').value.trim(),
      desc: document.getElementById('eventDesc').value.trim(),
      category: document.getElementById('eventCategory').value,
      location: document.getElementById('eventLocation').value.trim(),
      startDate: document.getElementById('eventStartDate').value,
      endDate: document.getElementById('eventEndDate').value || document.getElementById('eventStartDate').value,
      startTime: document.getElementById('eventStartTime').value,
      endTime: document.getElementById('eventEndTime').value,
      allDay: !document.getElementById('eventStartTime').value, // If no start time, assume all day
      color: document.getElementById('eventColor').value,
      repeatType: document.getElementById('eventRepeat').value,
      reminderMinutes: parseInt(document.getElementById('eventReminder').value, 10) || 0,
      goalId: document.getElementById('eventGoalLink').value || null,
      taskId: document.getElementById('eventTaskLink').value || null,
      habitId: document.getElementById('eventHabitLink').value || null
    };

    if (!eventData.title || !eventData.startDate) {
      toast('Title and Start Date are required');
      return;
    }

    try {
      if (State.editingEventId) {
        await window.CalendarService.update(State.editingEventId, eventData);
        const index = State.events.findIndex(e => e.id === State.editingEventId);
        if (index !== -1) Object.assign(State.events[index], eventData);
        toast('Event updated successfully');
      } else {
        const newEvent = await window.CalendarService.create({ ...eventData, completed: false });
        State.events.push(newEvent);
        toast('Event added successfully');
      }
      closeEventModal();
      renderEvents();
    } catch (error) {
      toast('Error saving event');
    }
  });
}

// Confirm Delete
if (els.confirmDeleteBtn) {
  els.confirmDeleteBtn.addEventListener('click', async () => {
    if (!State.deletingEventId) return;
    try {
      await window.CalendarService.delete(State.deletingEventId);
      State.events = State.events.filter(e => e.id !== State.deletingEventId);
      closeDeleteModal();
      renderEvents();
      toast('Event deleted');
    } catch (error) {
      toast('Error deleting event');
    }
  });
}

async function loadLinkableItems() {
  try {
    const [goals, tasks, habits] = await Promise.all([
      window.GoalService.getAll(),
      window.TaskService.getAll(),
      window.HabitService.getAll()
    ]);
    
    State.links.goals = goals;
    State.links.tasks = tasks;
    State.links.habits = habits;

    // Populate dropdowns
    els.goalLinkSelect.innerHTML = '<option value="">None</option>' + goals.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
    els.taskLinkSelect.innerHTML = '<option value="">None</option>' + tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
    els.habitLinkSelect.innerHTML = '<option value="">None</option>' + habits.map(h => `<option value="${h.id}">${h.title}</option>`).join('');
  } catch (error) {
    console.error('Error loading linkable items:', error);
  }
}

function openAddModal() {
  State.editingEventId = null;
  els.modalTitle.textContent = 'Add Event';
  els.eventForm.reset();
  document.getElementById('eventId').value = '';
  document.getElementById('eventColor').value = '#FF5C39';
  document.getElementById('eventStartDate').value = new Date().toISOString().split('T')[0];
  els.eventModalOverlay.classList.add('active');
  setTimeout(() => document.getElementById('eventTitle').focus(), 300);
}

function openEditModal(id) {
  const event = State.events.find(e => e.id === id);
  if (!event) return;
  
  State.editingEventId = id;
  els.modalTitle.textContent = 'Edit Event';
  
  document.getElementById('eventId').value = id;
  document.getElementById('eventTitle').value = event.title;
  document.getElementById('eventDesc').value = event.desc || '';
  document.getElementById('eventCategory').value = event.category;
  document.getElementById('eventLocation').value = event.location || '';
  document.getElementById('eventStartDate').value = event.startDate;
  document.getElementById('eventEndDate').value = event.endDate || event.startDate;
  document.getElementById('eventStartTime').value = event.startTime || '';
  document.getElementById('eventEndTime').value = event.endTime || '';
  document.getElementById('eventColor').value = event.color;
  document.getElementById('eventRepeat').value = event.repeatType;
  document.getElementById('eventReminder').value = event.reminderMinutes;
  
  document.getElementById('eventGoalLink').value = event.goalId || '';
  document.getElementById('eventTaskLink').value = event.taskId || '';
  document.getElementById('eventHabitLink').value = event.habitId || '';
  
  els.eventModalOverlay.classList.add('active');
}

function closeEventModal() {
  els.eventModalOverlay.classList.remove('active');
  State.editingEventId = null;
}

function openDeleteModal(id) {
  State.deletingEventId = id;
  els.deleteModalOverlay.classList.add('active');
}

function closeDeleteModal() {
  els.deleteModalOverlay.classList.remove('active');
  State.deletingEventId = null;
}

async function loadEventsData() {
  try {
    State.events = await window.CalendarService.getAll();
  } catch (error) {
    console.error('Error loading events:', error);
    toast('Failed to load events.');
    State.events = []; 
  } finally {
    renderEvents(); 
  }
}

async function initCalendar() {
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

  updateCalTitle();
  await Promise.all([loadEventsData(), loadLinkableItems()]);

  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:calendar_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, payload => {
        loadEventsData();
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
  document.addEventListener('DOMContentLoaded', initCalendar);
} else {
  initCalendar();
}