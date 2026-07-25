/* =============================================================
   ATLAS — NOTES PAGE LOGIC
   ============================================================= */

const State = {
  notes: [],
  currentFilter: 'all',
  searchQuery: '',
  viewMode: 'list', // 'list' or 'grid'
  editingNoteId: null,
  deletingNoteId: null,
  links: { goals: [], tasks: [], habits: [], events: [] },
  autoSaveTimer: null
};

const els = {
  noteList: document.getElementById('noteList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  filterPills: document.querySelectorAll('.pill'),
  viewGridBtn: document.getElementById('viewGrid'),
  viewListBtn: document.getElementById('viewList'),
  
  noteModalOverlay: document.getElementById('noteModalOverlay'),
  deleteModalOverlay: document.getElementById('deleteModalOverlay'),
  modalTitleInput: document.getElementById('noteTitleInput'),
  noteContent: document.getElementById('noteContent'),
  noteMetaText: document.getElementById('noteMetaText'),
  pinBtn: document.getElementById('pinBtn'),
  favBtn: document.getElementById('favBtn'),
  
  addNoteBtn: document.getElementById('addNoteBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  
  // Form inputs
  goalLinkSelect: document.getElementById('noteGoalLink'),
  taskLinkSelect: document.getElementById('noteTaskLink'),
  habitLinkSelect: document.getElementById('noteHabitLink'),
  eventLinkSelect: document.getElementById('noteEventLink')
};

function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Not saved yet';
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 60) return 'Saved just now';
  if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Saved ${Math.floor(diff / 3600)}h ago`;
  return `Saved ${Math.floor(diff / 86400)}d ago`;
}

function renderNotes() {
  let filtered = [...State.notes];

  // Filter by view
  if (State.currentFilter === 'all') {
    filtered = filtered.filter(n => !n.archived && !n.deletedAt);
  } else if (State.currentFilter === 'pinned') {
    filtered = filtered.filter(n => n.pinned && !n.archived && !n.deletedAt);
  } else if (State.currentFilter === 'favorite') {
    filtered = filtered.filter(n => n.favorite && !n.archived && !n.deletedAt);
  } else if (State.currentFilter === 'archived') {
    filtered = filtered.filter(n => n.archived && !n.deletedAt);
  } else if (State.currentFilter === 'trash') {
    filtered = filtered.filter(n => n.deletedAt);
  }

  // Search
  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    filtered = filtered.filter(n => 
      (n.title && n.title.toLowerCase().includes(q)) || 
      (n.content && n.content.toLowerCase().includes(q)) ||
      (n.tags && n.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  // Sort: Pinned first, then by updated_at
  filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  if (filtered.length === 0) {
    els.noteList.innerHTML = '';
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    els.noteList.innerHTML = filtered.map((n, i) => createNoteCardHTML(n, i)).join('');
    attachNoteCardEvents();
  }
}

function createNoteCardHTML(note, index) {
  const title = note.title || 'Untitled Note';
  const content = note.content || '';
  const dateStr = formatRelativeTime(note.updatedAt);
  
  let linksHTML = '';
  if (note.goalId) linksHTML += `<span class="note-link-badge" data-link="goal" data-id="${note.goalId}">🎯 Goal</span>`;
  if (note.taskId) linksHTML += `<span class="note-link-badge" data-link="task" data-id="${note.taskId}">✅ Task</span>`;
  if (note.habitId) linksHTML += `<span class="note-link-badge" data-link="habit" data-id="${note.habitId}">🔥 Habit</span>`;
  if (note.calendarEventId) linksHTML += `<span class="note-link-badge" data-link="event" data-id="${note.calendarEventId}">📅 Event</span>`;

  return `
    <article class="note-card" data-id="${note.id}" style="--c:${note.color}; animation-delay: ${index * 30}ms">
      <div class="note-card__head">
        <div class="note-card__title">${title}</div>
        <div class="note-card__badges">
          ${note.pinned ? '<div class="note-card__icon note-card__icon--active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg></div>' : ''}
          ${note.favorite ? '<div class="note-card__icon note-card__icon--active"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>' : ''}
        </div>
      </div>
      <div class="note-card__content">${content}</div>
      
      ${linksHTML ? `<div class="note-card__links">${linksHTML}</div>` : ''}
      
      <div class="note-card__foot">
        <div class="note-card__tags">
          ${note.tags.map(tag => `<span class="note-tag">#${tag}</span>`).join('')}
        </div>
        <div class="note-card__date">${dateStr}</div>
      </div>
    </article>
  `;
}

function attachNoteCardEvents() {
  document.querySelectorAll('.note-card').forEach(card => {
    const id = card.dataset.id;
    
    card.addEventListener('click', (e) => {
      // If clicking a link badge, handle navigation
      if (e.target.classList.contains('note-link-badge')) {
        e.stopPropagation();
        const linkType = e.target.dataset.link;
        if (linkType === 'goal') window.location.href = 'goals.html';
        else if (linkType === 'task') window.location.href = 'tasks.html';
        else if (linkType === 'habit') window.location.href = 'habits.html';
        else if (linkType === 'event') window.location.href = 'calendar.html';
        return;
      }
      openEditModal(id);
    });
  });
}

// Filters
els.filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    els.filterPills.forEach(p => p.classList.remove('pill--active'));
    pill.classList.add('pill--active');
    State.currentFilter = pill.dataset.filter;
    renderNotes();
  });
});

// View Toggle
if (els.viewGridBtn) {
  els.viewGridBtn.addEventListener('click', () => {
    State.viewMode = 'grid';
    els.noteList.classList.add('notes-grid');
    els.viewGridBtn.classList.add('is-active');
    els.viewListBtn.classList.remove('is-active');
  });
}

if (els.viewListBtn) {
  els.viewListBtn.addEventListener('click', () => {
    State.viewMode = 'list';
    els.noteList.classList.remove('notes-grid');
    els.viewListBtn.classList.add('is-active');
    els.viewGridBtn.classList.remove('is-active');
  });
}

// Search
if (els.searchInput) {
  els.searchInput.addEventListener('input', () => {
    State.searchQuery = els.searchInput.value;
    renderNotes();
  });
}

// Modal Triggers
[els.addNoteBtn, els.emptyAddBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', () => openAddModal());
});

// Close Modals
if (els.closeModalBtn) els.closeModalBtn.addEventListener('click', closeNoteModal);
if (els.cancelModalBtn) els.cancelModalBtn.addEventListener('click', closeNoteModal);
if (els.noteModalOverlay) {
  els.noteModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.noteModalOverlay) closeNoteModal();
  });
}

if (els.cancelDeleteBtn) els.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
if (els.deleteModalOverlay) {
  els.deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.deleteModalOverlay) closeDeleteModal();
  });
}

// Confirm Delete
if (els.confirmDeleteBtn) {
  els.confirmDeleteBtn.addEventListener('click', async () => {
    if (!State.deletingNoteId) return;
    try {
      await window.NoteService.delete(State.deletingNoteId);
      State.notes = State.notes.filter(n => n.id !== State.deletingNoteId);
      closeDeleteModal();
      renderNotes();
      toast('Note deleted permanently');
    } catch (error) {
      toast('Error deleting note');
    }
  });
}

// Auto Save Logic
function setupAutoSave() {
  ['input', 'change'].forEach(evt => {
    els.modalTitleInput.addEventListener(evt, handleAutoSave);
    els.noteContent.addEventListener(evt, handleAutoSave);
    document.getElementById('noteCategory').addEventListener(evt, handleAutoSave);
    document.getElementById('noteColor').addEventListener(evt, handleAutoSave);
    document.getElementById('noteTags').addEventListener(evt, handleAutoSave);
    els.goalLinkSelect.addEventListener(evt, handleAutoSave);
    els.taskLinkSelect.addEventListener(evt, handleAutoSave);
    els.habitLinkSelect.addEventListener(evt, handleAutoSave);
    els.eventLinkSelect.addEventListener(evt, handleAutoSave);
  });
}

function handleAutoSave() {
  updateMetaText();
  if (!State.editingNoteId) return;
  
  clearTimeout(State.autoSaveTimer);
  State.autoSaveTimer = setTimeout(async () => {
    await saveNote(true);
  }, 1000);
}

function updateMetaText() {
  const content = els.noteContent.value;
  const charCount = content.length;
  els.noteMetaText.textContent = `${charCount} characters · Saving...`;
}

// Pin & Favorite Toggles in Modal
if (els.pinBtn) {
  els.pinBtn.addEventListener('click', async () => {
    if (!State.editingNoteId) return;
    const note = State.notes.find(n => n.id === State.editingNoteId);
    if (!note) return;
    
    const newPinned = !note.pinned;
    els.pinBtn.classList.toggle('is-active', newPinned);
    
    try {
      await window.NoteService.update(State.editingNoteId, { pinned: newPinned });
      note.pinned = newPinned;
      renderNotes();
      toast(newPinned ? 'Note pinned' : 'Note unpinned');
    } catch (error) {
      toast('Failed to update note');
    }
  });
}

if (els.favBtn) {
  els.favBtn.addEventListener('click', async () => {
    if (!State.editingNoteId) return;
    const note = State.notes.find(n => n.id === State.editingNoteId);
    if (!note) return;
    
    const newFav = !note.favorite;
    els.favBtn.classList.toggle('is-active', newFav);
    
    try {
      await window.NoteService.update(State.editingNoteId, { favorite: newFav });
      note.favorite = newFav;
      renderNotes();
      toast(newFav ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      toast('Failed to update note');
    }
  });
}

async function saveNote(isAutoSave = false) {
  if (!State.editingNoteId) return;
  
  const noteData = {
    title: els.modalTitleInput.value.trim() || 'Untitled Note',
    content: els.noteContent.value,
    category: document.getElementById('noteCategory').value,
    color: document.getElementById('noteColor').value,
    tags: document.getElementById('noteTags').value.split(',').map(t => t.trim()).filter(t => t.length > 0),
    goalId: els.goalLinkSelect.value || null,
    taskId: els.taskLinkSelect.value || null,
    habitId: els.habitLinkSelect.value || null,
    calendarEventId: els.eventLinkSelect.value || null
  };

  try {
    const updated = await window.NoteService.update(State.editingNoteId, noteData);
    const index = State.notes.findIndex(n => n.id === State.editingNoteId);
    if (index !== -1) Object.assign(State.notes[index], updated);
    
    // Update meta text to saved
    clearTimeout(State.autoSaveTimer);
    els.noteMetaText.textContent = `${noteData.content.length} characters · Saved just now`;
    
    if (!isAutoSave) {
      renderNotes();
      toast('Note saved successfully');
    }
  } catch (error) {
    toast('Error saving note');
  }
}

async function loadLinkableItems() {
  try {
    const [goals, tasks, habits, events] = await Promise.all([
      window.GoalService.getAll(),
      window.TaskService.getAll(),
      window.HabitService.getAll(),
      window.CalendarService.getAll()
    ]);
    
    State.links.goals = goals;
    State.links.tasks = tasks;
    State.links.habits = habits;
    State.links.events = events;

    // Populate dropdowns
    els.goalLinkSelect.innerHTML = '<option value="">None</option>' + goals.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
    els.taskLinkSelect.innerHTML = '<option value="">None</option>' + tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
    els.habitLinkSelect.innerHTML = '<option value="">None</option>' + habits.map(h => `<option value="${h.id}">${h.title}</option>`).join('');
    els.eventLinkSelect.innerHTML = '<option value="">None</option>' + events.map(e => `<option value="${e.id}">${e.title}</option>`).join('');
  } catch (error) {
    console.error('Error loading linkable items:', error);
  }
}

function openAddModal() {
  State.editingNoteId = null;
  els.modalTitleInput.value = '';
  els.noteContent.value = '';
  document.getElementById('noteCategory').value = 'general';
  document.getElementById('noteColor').value = '#FF5C39';
  document.getElementById('noteTags').value = '';
  els.goalLinkSelect.value = '';
  els.taskLinkSelect.value = '';
  els.habitLinkSelect.value = '';
  els.eventLinkSelect.value = '';
  els.pinBtn.classList.remove('is-active');
  els.favBtn.classList.remove('is-active');
  els.noteMetaText.textContent = '0 characters · Not saved yet';
  
  els.noteModalOverlay.classList.add('active');
  setTimeout(() => els.modalTitleInput.focus(), 300);

  // Create immediately on submit of first input, or we can create it right away
  // For better UX, we create the note immediately so Auto Save works from the start
  createNewNote();
}

async function createNewNote() {
  try {
    const newNote = await window.NoteService.create({
      title: 'Untitled Note',
      content: '',
      category: 'general',
      color: '#FF5C39',
      tags: [],
      pinned: false,
      favorite: false,
      archived: false
    });
    State.notes.push(newNote);
    State.editingNoteId = newNote.id;
    renderNotes();
  } catch (error) {
    toast('Error creating note');
    closeNoteModal();
  }
}

async function openEditModal(id) {
  const note = State.notes.find(n => n.id === id);
  if (!note) return;
  
  State.editingNoteId = id;
  els.modalTitleInput.value = note.title;
  els.noteContent.value = note.content;
  document.getElementById('noteCategory').value = note.category;
  document.getElementById('noteColor').value = note.color;
  document.getElementById('noteTags').value = note.tags.join(', ');
  els.goalLinkSelect.value = note.goalId || '';
  els.taskLinkSelect.value = note.taskId || '';
  els.habitLinkSelect.value = note.habitId || '';
  els.eventLinkSelect.value = note.calendarEventId || '';
  
  els.pinBtn.classList.toggle('is-active', note.pinned);
  els.favBtn.classList.toggle('is-active', note.favorite);
  els.noteMetaText.textContent = `${note.content.length} characters · ${formatRelativeTime(note.updatedAt)}`;
  
  els.noteModalOverlay.classList.add('active');
}

function closeNoteModal() {
  // Final save before closing
  if (State.editingNoteId) {
    saveNote(false);
  }
  els.noteModalOverlay.classList.remove('active');
  State.editingNoteId = null;
}

function openDeleteModal(id) {
  State.deletingNoteId = id;
  els.deleteModalOverlay.classList.add('active');
}

function closeDeleteModal() {
  els.deleteModalOverlay.classList.remove('active');
  State.deletingNoteId = null;
}

async function loadNotesData() {
  try {
    State.notes = await window.NoteService.getAll();
  } catch (error) {
    console.error('Error loading notes:', error);
    toast('Failed to load notes.');
    State.notes = []; 
  } finally {
    renderNotes(); 
  }
}

async function initNotes() {
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

  await Promise.all([loadNotesData(), loadLinkableItems()]);
  setupAutoSave();

  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, payload => {
        loadNotesData();
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
  document.addEventListener('DOMContentLoaded', initNotes);
} else {
  initNotes();
}