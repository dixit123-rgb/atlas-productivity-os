/* =============================================================
   ATLAS — Personal Productivity OS
   Dashboard logic + Supabase integration
   ============================================================= */

/* -------------------------------------------------------------
   1. SUPABASE DATA SERVICE
   ------------------------------------------------------------- */
const DataService = {

    async getDashboardStats() {
    try {
      const tasks = await window.TaskService.getAll();
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Filter out historical completed tasks to focus on current productivity
      const activeTasks = tasks.filter(t => !t.done || t.dueDate >= todayStr);
      
      const todaysTasks = activeTasks.filter(t => t.dueDate === todayStr);
      const completedToday = todaysTasks.filter(t => t.done).length;
      const pendingToday = todaysTasks.filter(t => !t.done).length;
      const overdue = activeTasks.filter(t => !t.done && t.dueDate < todayStr).length;
      const upcoming = activeTasks.filter(t => !t.done && t.dueDate > todayStr).length;
      
      const totalActive = activeTasks.length;
      const completedActive = activeTasks.filter(t => t.done).length;
      const percent = totalActive === 0 ? 0 : Math.round((completedActive / totalActive) * 100);

      return { 
        total: totalActive, 
        completed: completedActive, 
        pending: totalActive - completedActive, 
        todayTasks: todaysTasks.length,
        completedToday,
        pendingToday,
        overdue, 
        upcoming,
        percent, 
        tasks: activeTasks // Return only active tasks for charts and lists
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }
  },

  async getHabitsStats() {
    try {
      const [habits, completionsData] = await Promise.all([
        window.HabitService.getAll(),
        window.HabitService.getCompletions()
      ]);
      
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Map completions for easy lookup
      const compMap = {};
      completionsData.forEach(c => {
        if (!compMap[c.habit_id]) compMap[c.habit_id] = [];
        compMap[c.habit_id].push(c.completion_date);
      });

      const total = habits.length;
      const completedToday = habits.filter(h => (compMap[h.id] || []).includes(todayStr)).length;
      const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
      const longestStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0);
      const percent = total === 0 ? 0 : Math.round((completedToday / total) * 100);

      const habitsForDashboard = habits.map(h => ({
        id: h.id,
        name: h.title,
        icon: h.icon,
        color: h.color,
        streak: h.streak,
        week: [1,1,1,1,1,1,1].map((v, i) => {
          // Calculate last 7 days for dashboard mini-view
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return (compMap[h.id] || []).includes(d.toISOString().split('T')[0]) ? 1 : 0;
        }),
        today: (compMap[h.id] || []).includes(todayStr)
      }));

      return { total, completedToday, maxStreak, longestStreak, percent, habitsForDashboard };
    } catch (error) {
      console.error('Error fetching habit stats:', error);
      return null;
    }
  },

    async getGoalsStats() {
    try {
      const goals = await window.GoalService.getAll();
      const total = goals.length;
      const completed = goals.filter(g => g.completed).length;
      const active = total - completed;
      const avgProgress = total === 0 ? 0 : Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / total);
      return { total, completed, active, avgProgress };
    } catch (error) {
      console.error('Error fetching goal stats:', error);
      return null;
    }
  },

    async getCalendarStats() {
    try {
      const events = await window.CalendarService.getAll();
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysEvents = events.filter(e => e.startDate === todayStr).length;
      const upcomingEvents = events.filter(e => e.startDate > todayStr).length;
      const nextEvent = events.find(e => e.startDate >= todayStr && !e.completed);
      return { 
        todaysEvents, 
        upcomingEvents, 
        nextEvent: nextEvent ? { title: nextEvent.title, time: nextEvent.startTime || 'All Day' } : null 
      };
    } catch (error) {
      console.error('Error fetching calendar stats:', error);
      return null;
    }
  },

   async getNotesStats() {
    try {
      const notes = await window.NoteService.getAll();
      const activeNotes = notes.filter(n => !n.archived && !n.deletedAt);
      const recentNotes = activeNotes
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 4)
        .map(n => ({
          id: n.id,
          title: n.title || 'Untitled Note',
          preview: n.content ? n.content.substring(0, 100) : '',
          date: new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          color: n.color,
          tags: n.tags || []
        }));
      return { total: activeNotes.length, recentNotes };
    } catch (error) {
      console.error('Error fetching notes stats:', error);
      return null;
    }
  },

   async getFocusStats() {
    try {
      const sessions = await window.FocusService.getAll();
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysSessions = sessions.filter(s => s.completed && new Date(s.startedAt).toISOString().split('T')[0] === todayStr);
      const todayMin = todaysSessions.reduce((sum, s) => sum + s.actualMinutes, 0);
      const isRunning = sessions.some(s => s.status === 'active');
      return { todayMinutes: todayMin, isRunning, totalSessions: sessions.filter(s => s.completed).length };
    } catch (error) {
      console.error('Error fetching focus stats:', error);
      return null;
    }
  },


  getMockData() {
    return {
      timeline: [
        { time: '07:00', title: 'Morning meditation', meta: '10 min · Insight Timer', tag: 'break', state: 'done' },
        { time: '08:30', title: 'Deep work — Atlas launch plan', meta: '90 min focus block', tag: 'focus', state: 'done' },
        { time: '10:30', title: 'Team standup', meta: 'Zoom · 4 attendees', tag: 'meeting', state: 'done' },
        { time: '11:00', title: 'Design review with Maya', meta: '45 min · Figma', tag: 'review', state: 'active' },
        { time: '14:00', title: 'Reading — Deep Work, ch.7', meta: '60 min · Kindle', tag: 'break', state: 'upcoming' },
        { time: '16:00', title: 'Focus block — Q1 strategy', meta: '90 min · No interruptions', tag: 'focus', state: 'upcoming' },
        { time: '18:30', title: 'Evening workout', meta: '45 min · Strength', tag: 'break', state: 'upcoming' }
      ],
      goals: [
        { id: 'g1', title: 'Read 24 books this year', cat: 'Personal', progress: 58, deadline: 'Dec 31', color: '#7B61FF' },
        { id: 'g2', title: 'Launch Atlas v1.0', cat: 'Career', progress: 82, deadline: 'Mar 15', color: '#FF5C39' },
        { id: 'g3', title: 'Run a half marathon', cat: 'Health', progress: 45, deadline: 'Apr 20', color: '#4AB58B' },
        { id: 'g4', title: 'Learn Spanish (B1)', cat: 'Learning', progress: 30, deadline: 'Jun 30', color: '#F5A623' }
      ],
      notes: [
        { id: 'n1', title: 'Atlas launch checklist', preview: 'Press kit, Product Hunt assets, Twitter thread, email blast to early access list…', date: '2h ago', color: '#FF5C39', tags: ['work','launch'] },
        { id: 'n2', title: 'Book notes — Deep Work', preview: 'The ability to focus without distraction is becoming increasingly rare and increasingly valuable…', date: 'Yesterday', color: '#7B61FF', tags: ['reading','notes'] },
        { id: 'n3', title: 'Q1 strategy brainstorm', preview: 'Three pillars: 1) Ship Atlas, 2) Grow audience to 10k, 3) Build content system…', date: '2 days ago', color: '#4AB58B', tags: ['strategy'] },
        { id: 'n4', title: 'Workout split — week 3', preview: 'Push/Pull/Legs. Increase deadlift 5lb. Add mobility work on rest days…', date: '3 days ago', color: '#F5A623', tags: ['health'] }
      ],
      reminders: [
        { id: 'r1', type: 'overdue', title: 'Submit expense report', desc: 'Was due yesterday. Finance team is waiting.', time: '1d overdue', color: '#E94560', action: 'Resolve' },
        { id: 'r2', type: 'deadline', title: 'Atlas v1.0 launch', desc: 'Only 9 days remaining. Final QA + marketing push needed.', time: 'in 9 days', color: '#FF5C39', action: 'View plan' },
        { id: 'r3', type: 'reminder', title: 'Call mom for her birthday', desc: 'Don\'t forget — she turns 64 this Friday.', time: 'Fri 18:00', color: '#7B61FF', action: 'Set alert' }
      ],
      analytics: {
        weeklyBars: [62, 78, 85, 72, 91, 68, 86],
        weeklyLine: [4, 6, 5, 7, 8, 6, 6],
        habitDonut: 92,
        studyArea: [3.5, 4.2, 2.8, 5.1, 4.8, 3.2, 4.9]
      }
    };
  }
};

/* -------------------------------------------------------------
   2. UTILITIES
   ------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ICONS = {
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5 17.5 17.5M3 7l4-4M3 17l4 4M21 7l-4-4M21 17l-4 4M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
};

function toast(message) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

/* -------------------------------------------------------------
   3. THEME TOGGLE
   ------------------------------------------------------------- */
const ThemeManager = {
  init() {
    // Load theme and accent from localStorage (set by Settings page)
    const savedTheme = localStorage.getItem('atlas-theme') || 'dark';
    const savedAccent = localStorage.getItem('atlas-accent') || '#FF5C39';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.style.setProperty('--accent', savedAccent);
    
    $('#themeToggle')?.addEventListener('click', async () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('atlas-theme', next);
      
      // Sync to Supabase if SettingsService exists
      if (window.SettingsService) {
        try { 
          await window.SettingsService.update({ theme: next }); 
        } catch(e) {
          console.error('Failed to sync theme to Supabase:', e);
        }
      }
      toast(`Switched to ${next} mode`);
    });
  }
};

/* -------------------------------------------------------------
   4. LIVE CLOCK
   ------------------------------------------------------------- */
const Clock = {
  init() {
    this.update();
    setInterval(() => this.update(), 1000);
  },
  update() {
    const now = new Date();
    const dateOpts = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', dateOpts);
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    
    const dateEl = $('#clockDate');
    const timeEl = $('#clockTime');
    if (dateEl) dateEl.textContent = dateStr;
    if (timeEl) timeEl.textContent = timeStr;

    const hr = now.getHours();
    let greet = 'Good evening';
    if (hr < 5) greet = 'Good night';
    else if (hr < 12) greet = 'Good morning';
    else if (hr < 18) greet = 'Good afternoon';
    
    const greetEl = $('#heroGreeting');
    const dayLabelEl = $('#heroDayLabel');
    if (greetEl) greetEl.textContent = greet;
    if (dayLabelEl) dayLabelEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
};

/* -------------------------------------------------------------
   5. SIDEBAR
   ------------------------------------------------------------- */
const Sidebar = {
  init() {
    const collapse = $('#sidebarCollapse');
    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    const menuToggle = $('#menuToggle');

    if (collapse) {
      collapse.addEventListener('click', () => {
        if (window.innerWidth <= 860) {
          sidebar.classList.toggle('sidebar--mobile-open');
          overlay.classList.toggle('active');
        } else {
          sidebar.classList.toggle('sidebar--collapsed');
        }
      });
    }

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.add('sidebar--mobile-open');
        overlay.classList.add('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('sidebar--mobile-open');
        overlay.classList.remove('active');
      });
    }

    $$('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        const href = item.getAttribute('href');
        
        // If it's a placeholder link, prevent default and show toast
        if (href === '#') {
          e.preventDefault();
          $$('.nav-item').forEach(n => n.classList.remove('nav-item--active'));
          item.classList.add('nav-item--active');
          const route = item.dataset.route;
          if (route !== 'dashboard') {
            toast(`Navigating to ${route.charAt(0).toUpperCase() + route.slice(1)}…`);
          }
          if (window.innerWidth <= 860) {
            sidebar.classList.remove('sidebar--mobile-open');
            overlay.classList.remove('active');
          }
        } else {
          // It's a real link (e.g., habits.html), allow navigation
          if (window.innerWidth <= 860) {
            sidebar.classList.remove('sidebar--mobile-open');
            overlay.classList.remove('active');
          }
        }
      });
    });
}
};

/* -------------------------------------------------------------
   6. HERO RING ANIMATION
   ------------------------------------------------------------- */
const Ring = {
  init(percent) {
    const circumference = 2 * Math.PI * 92;
    const offset = circumference - (percent / 100) * circumference;
    setTimeout(() => {
      const bar = $('.ring__bar');
      const barSoft = $('.ring__bar--soft');
      if (bar) bar.style.strokeDashoffset = offset;
      if (barSoft) barSoft.style.strokeDashoffset = circumference - (68 / 100) * (2 * Math.PI * 70);
    }, 300);

    const valueEl = $('#ringValue');
    if (!valueEl) return;
    let current = 0;
    const target = percent;
    const duration = 1800;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      current = Math.round(eased * target);
      valueEl.innerHTML = `${current}<span>%</span>`;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
};

/* -------------------------------------------------------------
   7. TIMELINE RENDER
   ------------------------------------------------------------- */
function renderTimeline(items) {
  const list = $('#timelineList');
  if (!list) return;
  list.innerHTML = items.map(item => `
    <div class="timeline-item timeline-item--${item.state}">
      <div class="timeline-item__time">${item.time}</div>
      <div class="timeline-item__dot"></div>
      <div class="timeline-item__content">
        <div class="timeline-item__title">${item.title}</div>
        <div class="timeline-item__meta">
          <span>${item.meta}</span>
          <span class="timeline-item__tag timeline-item__tag--${item.tag}">${item.tag}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* -------------------------------------------------------------
   8. PRIORITY TASKS
   ------------------------------------------------------------- */
function renderPriorities(tasks) {
  const list = $('#prioritiesList');
  if (!list) return;
  
  if (!tasks || tasks.length === 0) {
    list.innerHTML = `<li style="font-size: 14px; color: var(--fg-muted); text-align: center; padding: 20px;">No priority tasks. You're all caught up!</li>`;
    return;
  }

  list.innerHTML = tasks.map(t => `
    <li class="priority-item ${t.done ? 'priority-item--done' : ''}" data-id="${t.id}">
      <button class="check" aria-label="Toggle task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M5 12l5 5L20 7"/></svg>
      </button>
      <div class="priority-item__body">
        <div class="priority-item__title">${t.title}</div>
        <div class="priority-item__meta">
          <span class="priority-tag priority-tag--${t.priority}">${t.priority}</span>
          <span class="priority-item__due">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${t.dueTime || 'Anytime'}
          </span>
        </div>
      </div>
      <div class="priority-progress">
        <div class="priority-progress__bar" style="width:${t.progress || 0}%"></div>
      </div>
    </li>
  `).join('');

  $$('.priority-item').forEach(item => {
    item.querySelector('.check').addEventListener('click', async e => {
      e.stopPropagation();
      const id = item.dataset.id;
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      
      const newDone = !task.done;
      const updates = { 
        done: newDone, 
        status: newDone ? 'completed' : 'pending',
        progress: newDone ? 100 : (task.progress === 100 ? 0 : task.progress)
      };
      
      try {
        await window.TaskService.update(id, updates);
        Object.assign(task, updates);
        item.classList.toggle('priority-item--done');
        toast(newDone ? 'Task completed 🎉' : 'Task reopened');
      } catch (error) {
        toast('Failed to update task');
      }
    });
  });
}

/* -------------------------------------------------------------
   9. HABITS (Dashboard version)
   ------------------------------------------------------------- */
function renderHabits(habits) {
  const list = $('#habitsList');
  if (!list) return;
  list.innerHTML = habits.map(h => `
    <li class="habit-item" data-id="${h.id}">
      <div class="habit-item__icon" style="--c:${h.color}">
        ${ICONS[h.icon] || ICONS.leaf}
      </div>
      <div class="habit-item__body">
        <div class="habit-item__name">${h.name}</div>
        <div class="habit-item__streak">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          ${h.streak} day streak
        </div>
      </div>
      <div class="habit-week">
        ${h.week.map((d, i) => `<div class="habit-day ${d ? 'habit-day--done' : ''} ${i === 6 ? 'habit-day--today' : ''}"></div>`).join('')}
      </div>
    </li>
  `).join('');
}

/* -------------------------------------------------------------
   10. GOALS
   ------------------------------------------------------------- */
function renderGoals(goals) {
  const list = $('#goalsList');
  if (!list) return;
  list.innerHTML = goals.map(g => `
    <li class="goal-item" style="--c:${g.color}">
      <div class="goal-item__head">
        <div class="goal-item__title">${g.title}</div>
        <span class="goal-item__cat">${g.cat}</span>
      </div>
      <div class="goal-item__progress">
        <div class="goal-item__bar" style="width:${g.progress}%"></div>
      </div>
      <div class="goal-item__meta">
        <span>${g.progress}% complete</span>
        <span>Due ${g.deadline}</span>
      </div>
    </li>
  `).join('');
}

/* -------------------------------------------------------------
   11. NOTES
   ------------------------------------------------------------- */
function renderNotes(notes) {
  const list = $('#notesList');
  if (!list) return;
  list.innerHTML = notes.map(n => `
    <li class="note-item" data-id="${n.id}" style="--c:${n.color}">
      <div class="note-item__head">
        <div class="note-item__title">${n.title}</div>
        <div class="note-item__date">${n.date}</div>
      </div>
      <div class="note-item__preview">${n.preview}</div>
      <div class="note-item__tags">
        ${n.tags.map(t => `<span class="chip">#${t}</span>`).join('')}
      </div>
    </li>
  `).join('');

  $$('.note-item').forEach(item => {
    item.addEventListener('click', () => {
      toast('Opening note editor…');
    });
  });
}

/* -------------------------------------------------------------
   12. CALENDAR
   ------------------------------------------------------------- */
const Calendar = {
  current: new Date(),
  events: {
    5: [{ title: 'Dentist', color: '#7B61FF', time: '09:00' }],
    12: [{ title: 'Maya review', color: '#FF5C39', time: '11:00' }, { title: 'Yoga', color: '#4AB58B', time: '18:00' }],
    15: [{ title: 'Design review', color: '#FF5C39', time: '11:00' }, { title: 'Atlas sync', color: '#7B61FF', time: '15:00' }],
    18: [{ title: 'Mom\'s birthday call', color: '#7B61FF', time: '18:00' }],
    22: [{ title: 'Half marathon prep', color: '#4AB58B', time: '07:00' }],
    24: [{ title: 'Investor update', color: '#FF5C39', time: '14:00' }],
    28: [{ title: 'Q1 retro', color: '#F5A623', time: '10:00' }]
  },

  init() {
    $('#calPrev')?.addEventListener('click', () => this.navigate(-1));
    $('#calNext')?.addEventListener('click', () => this.navigate(1));
    this.render();
  },

  navigate(dir) {
    this.current = new Date(this.current.getFullYear(), this.current.getMonth() + dir, 1);
    this.render();
  },

  render() {
    const now = this.current;
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const titleEl = $('#calTitle');
    if (titleEl) titleEl.textContent = monthName;

    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();
    const prevLast = new Date(now.getFullYear(), now.getMonth(), 0).getDate();

    const cells = [];
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: prevLast - i, outside: true });
    }
    const today = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const isToday = today.getFullYear() === now.getFullYear()
                   && today.getMonth() === now.getMonth()
                   && today.getDate() === d;
      cells.push({ day: d, outside: false, today: isToday, events: this.events[d] || [] });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, outside: true });
    }

    const grid = $('#calGrid');
    if (grid) {
      grid.innerHTML = cells.map(c => `
        <div class="cal-day ${c.outside ? 'cal-day--outside' : ''} ${c.today ? 'cal-day--today' : ''}">
          ${c.day}
          ${c.events && c.events.length ? `<div class="cal-day__dots">${c.events.slice(0, 3).map(e => `<span class="cal-day__dot" style="background:${c.today ? 'white' : e.color}"></span>`).join('')}</div>` : ''}
        </div>
      `).join('');
    }

    const todayKey = today.getDate();
    const todayEvents = (this.events[todayKey] || []).filter(e =>
      today.getMonth() === now.getMonth() && today.getFullYear() === now.getFullYear()
    );
    const evList = $('#calEvents');
    if (evList) {
      if (todayEvents.length) {
        evList.innerHTML = todayEvents.map(e => `
          <div class="cal-event">
            <div class="cal-event__bar" style="background:${e.color}"></div>
            <span>${e.title}</span>
            <span class="cal-event__time">${e.time}</span>
          </div>
        `).join('');
      } else {
        evList.innerHTML = `<div style="font-size:12.5px;color:var(--fg-subtle);text-align:center;padding:8px;">No events scheduled today</div>`;
      }
    }
  }
};

/* -------------------------------------------------------------
   13. ANALYTICS CHARTS (SVG)
   ------------------------------------------------------------- */
const Charts = {
  init(data) {
    if (!data) return;
    this.bars(data.weeklyBars);
    this.line(data.weeklyLine);
    this.donut(data.habitDonut);
    this.area(data.studyArea);
  },

  bars(values) {
    const svg = $('#chartBars');
    if (!svg) return;
    const w = 280, h = 90, pad = 6;
    const max = Math.max(...values);
    const bw = (w - pad * 8) / 7;
    svg.innerHTML = values.map((v, i) => {
      const bh = (v / max) * (h - 16);
      const x = pad + i * (bw + pad);
      const y = h - bh - 4;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${bw/3}" fill="url(#barGrad)"/>
              <rect x="${x}" y="${h-4}" width="${bw}" height="4" rx="2" fill="var(--track)"/>`;
    }).join('') + `
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FF5C39"/>
          <stop offset="100%" stop-color="#F5A623"/>
        </linearGradient>
      </defs>`;
  },

  line(values) {
    const svg = $('#chartLine');
    if (!svg) return;
    const w = 280, h = 90, pad = 8;
    const max = Math.max(...values);
    const step = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => ({ x: pad + i * step, y: h - pad - (v / max) * (h - pad * 2) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      d += ` C ${cp1x} ${prev.y}, ${cp1x} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    svg.innerHTML = `
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#7B61FF"/>
          <stop offset="100%" stop-color="#3DBDD4"/>
        </linearGradient>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7B61FF" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#7B61FF" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${d} L ${pts[pts.length-1].x} ${h} L ${pts[0].x} ${h} Z" fill="url(#lineFill)"/>
      <path d="${d}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#7B61FF"/>`).join('')}
    `;
  },

  donut(percent) {
    const svg = $('#chartDonut');
    if (!svg) return;
    const r = 32, cx = 45, cy = 45;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    svg.setAttribute('viewBox', '0 0 90 90');
    svg.innerHTML = `
      <defs>
        <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4AB58B"/>
          <stop offset="100%" stop-color="#3DBDD4"/>
        </linearGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--track)" stroke-width="9"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#donutGrad)" stroke-width="9"
              stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy-2}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="20" font-weight="700" fill="currentColor">${percent}%</text>
      <text x="${cx}" y="${cy+14}" text-anchor="middle" font-family="Inter" font-size="9" fill="var(--fg-muted)">consistent</text>
    `;
  },

  area(values) {
    const svg = $('#chartArea');
    if (!svg) return;
    const w = 280, h = 90, pad = 8;
    const max = Math.max(...values);
    const step = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => ({ x: pad + i * step, y: h - pad - (v / max) * (h - pad * 2) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      d += ` C ${cp1x} ${prev.y}, ${cp1x} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    svg.innerHTML = `
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F5A623" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#F5A623" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${d} L ${pts[pts.length-1].x} ${h} L ${pts[0].x} ${h} Z" fill="url(#areaFill)"/>
      <path d="${d}" fill="none" stroke="#F5A623" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2" fill="#F5A623"/>`).join('')}
    `;
  }
};

/* -------------------------------------------------------------
   14. REMINDERS
   ------------------------------------------------------------- */
function renderReminders(reminders) {
  const grid = $('#remindersGrid');
  if (!grid) return;
  grid.innerHTML = reminders.map(r => `
    <div class="reminder" style="--c:${r.color}">
      <div class="reminder__head">
        <div class="reminder__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${r.type === 'overdue' ? '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>' :
              r.type === 'deadline' ? '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' :
              '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>'}
          </svg>
        </div>
        <span class="reminder__type">${r.type}</span>
      </div>
      <div class="reminder__title">${r.title}</div>
      <div class="reminder__desc">${r.desc}</div>
      <div class="reminder__meta">
        <span class="reminder__time">${r.time}</span>
        <button class="reminder__action">${r.action}</button>
      </div>
    </div>
  `).join('');

  $$('.reminder__action').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toast('Action scheduled ✓');
    });
  });
}

/* -------------------------------------------------------------
   15. FAB
   ------------------------------------------------------------- */
const Fab = {
  init() {
    const fab = $('.fab');
    const main = $('#fabMain');
    if (!fab || !main) return;
    main.addEventListener('click', e => {
      e.stopPropagation();
      fab.classList.toggle('fab--open');
    });
    document.addEventListener('click', e => {
      if (!fab.contains(e.target)) fab.classList.remove('fab--open');
    });
    $$('.fab__item').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const messages = {
          'add-task': 'New task composer',
          'add-habit': 'New habit form',
          'add-goal': 'New goal wizard',
          'add-note': 'Opening note editor',
          'start-focus': 'Starting focus timer · 25 min'
        };
        toast(messages[action] || 'Action triggered');
        fab.classList.remove('fab--open');
      });
    });
  }
};

/* -------------------------------------------------------------
   16. SEARCH
   ------------------------------------------------------------- */
const Search = {
  init() {
    const input = $('#searchInput');
    const results = $('#searchResults');
    if (!input || !results) return;

    const allItems = [
      ...[...$$('.priority-item__title')].map(el => ({ type: 'Task', text: el.textContent })),
      ...[...$$('.habit-item__name')].map(el => ({ type: 'Habit', text: el.textContent })),
      ...[...$$('.goal-item__title')].map(el => ({ type: 'Goal', text: el.textContent })),
      ...[...$$('.note-item__title')].map(el => ({ type: 'Note', text: el.textContent }))
    ];

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { results.hidden = true; return; }
      const matches = allItems.filter(i => i.text.toLowerCase().includes(q)).slice(0, 6);
      results.hidden = matches.length === 0;
      results.innerHTML = matches.map(m => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
          <span style="font-size:10px;font-weight:700;padding:2px 6px;background:var(--bg-subtle);border-radius:6px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.04em;">${m.type}</span>
          <span style="font-size:13.5px;">${m.text}</span>
        </div>
      `).join('');
    });

    input.addEventListener('blur', () => {
      setTimeout(() => results.hidden = true, 200);
    });

    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape') {
        input.blur();
        results.hidden = true;
      }
    });
  }
};

/* -------------------------------------------------------------
   17. STAT CARD ROUTING
   ------------------------------------------------------------- */
function bindStatCards() {
  $$('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route === 'tasks') {
        window.location.href = 'tasks.html';
      } else if (route === 'habits') {
        window.location.href = 'habits.html';
      } else if (route === 'goals') {
        window.location.href = 'goals.html';
      } else if (route === 'calendar') {
        window.location.href = 'calendar.html';
      } else if (route === 'notes') {
        window.location.href = 'notes.html';
      }  else if (route === 'analytics') {
        window.location.href = 'analytics.html';
      } else if (route === 'focus') {
        window.location.href = 'focus.html';
      }  else {
        toast(`Opening ${route.charAt(0).toUpperCase() + route.slice(1)}…`);
      }
    });
  });

  $$('[data-route]').forEach(el => {
    if (el.classList.contains('stat-card') || el.classList.contains('nav-item')) return;
    el.addEventListener('click', e => {
      e.preventDefault();
      const route = el.dataset.route;
        if (route === 'tasks') {
        window.location.href = 'tasks.html';
      } else if (route === 'habits') {
        window.location.href = 'habits.html';
            } else if (route === 'goals') {
        window.location.href = 'goals.html';
      } else if (route === 'calendar') {
        window.location.href = 'calendar.html';
      } else if (route === 'notes') {
        window.location.href = 'notes.html';
      }   else if (route === 'focus') {
        window.location.href = 'focus.html';
      } else {
        toast(`Opening ${route.charAt(0).toUpperCase() + route.slice(1)}…`);
      }
    });
  });

  $$('[data-action]').forEach(btn => {
    if (btn.classList.contains('fab__item')) return;
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'add-task') {
        window.location.href = 'tasks.html';
      } else if (action === 'add-habit') {
        window.location.href = 'habits.html';
      } else {
        toast(`${action.replace(/-/g, ' ')} activated`);
      }
    });
  });
}

/* -------------------------------------------------------------
   18. SCROLL ANIMATIONS
   ------------------------------------------------------------- */
const Animations = {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('in'), i * 60);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    $$('[data-anim]').forEach(el => observer.observe(el));
  }
};

/* -------------------------------------------------------------
   19. DASHBOARD DATA LOADER
   ------------------------------------------------------------- */
async function loadDashboardData() {
  const data = await DataService.getDashboardStats();
  if (!data) return;

  // Update Ring Progress
  Ring.init(data.percent);

    // Update Task Stat Cards
  const statTotalEl = $('#statTotal');
  const statCompletedEl = $('#statCompleted');
  const statPendingEl = $('#statPending');
  const statOverdueEl = $('#statOverdue');
  
  // Map to new active-only stats
  if (statTotalEl) statTotalEl.innerHTML = data.todayTasks;
  if (statCompletedEl) statCompletedEl.innerHTML = data.completedToday;
  if (statPendingEl) statPendingEl.innerHTML = data.pendingToday;
  if (statOverdueEl) statOverdueEl.innerHTML = data.overdue;

  // Update Sidebar Badge
  const navBadge = $('#navTaskCount');
  if (navBadge) navBadge.textContent = data.pending;

    // Update Priority Tasks (Show top 5 incomplete active tasks)
  const priorityTasks = data.tasks // data.tasks is now activeTasks from getDashboardStats
    .filter(t => !t.done)
    .sort((a, b) => {
      const pA = parseInt(a.priority) || 5;
      const pB = parseInt(b.priority) || 5;
      if (pA !== pB) return pA - pB;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, 5);
  renderPriorities(priorityTasks);

  // Load & Update Habit Stats
  const habitData = await DataService.getHabitsStats();
  if (habitData) {
    const statHabitsEl = $('#statHabits');
    const statStreakEl = $('#statStreak');
    if (statHabitsEl) statHabitsEl.innerHTML = `${habitData.completedToday}<span>/${habitData.total}</span>`;
    if (statStreakEl) statStreakEl.innerHTML = `${habitData.maxStreak}<span> days</span>`;
    
    // Update the habit overview list on the dashboard
    renderHabits(habitData.habitsForDashboard);
  }
   // Load & Update Goal Stats
  const goalData = await DataService.getGoalsStats();
  if (goalData) {
    const statGoalsActiveEl = $('#statGoalsActive');
    if (statGoalsActiveEl) statGoalsActiveEl.textContent = goalData.active;
  }

  // Load & Update Calendar Stats
  const calData = await DataService.getCalendarStats();
  if (calData) {
    // If you have a timeline section on your dashboard, update it here
    // For example, if you have a #timelineList, you can map calData into it
    // Otherwise, just log it or update a stat card if you add one.
    console.log('Calendar stats loaded for dashboard');
  }

  // Load & Update Note Stats
  const noteData = await DataService.getNotesStats();
  if (noteData) {
    // Update the existing dashboard notes list with real data
    if (typeof renderNotes === 'function') {
      renderNotes(noteData.recentNotes);
    }
  }

   // Load & Update Focus Stats
  const focusData = await DataService.getFocusStats();
  if (focusData) {
    // If you have a stat card for focus time, update it here
    // e.g., const statFocusEl = $('#statFocus'); 
    // if (statFocusEl) statFocusEl.textContent = formatDuration(focusData.todayMinutes);
    console.log(`Focus time today: ${focusData.todayMinutes} mins`);
  }
}



/* -------------------------------------------------------------
   20. NOTIFICATION BELL LOGIC
   ------------------------------------------------------------- */
async function initNotificationBell() {
  const bellBtn = document.getElementById('notifBellBtn');
  const notifDot = document.getElementById('notifDot');
  if (!bellBtn || !notifDot) return;

  async function updateBadge() {
    try {
      if (!window.NotificationService) return;
      const unread = await window.NotificationService.getUnread();
      if (unread.length > 0) {
        notifDot.hidden = false;
        notifDot.textContent = unread.length > 9 ? '9+' : unread.length;
      } else {
        notifDot.hidden = true;
      }
    } catch (e) {}
  }

  bellBtn.addEventListener('click', () => {
    window.location.href = 'notifications.html';
  });

  await updateBadge();
  
  if (window.NotificationService) {
    window.NotificationService.subscribeRealtime(updateBadge);
  }
}

/* -------------------------------------------------------------
   20. INIT
   ------------------------------------------------------------- */
async function init() {
  // 1. Check Authentication
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

  // 2. Initialize Shared UI Components
  ThemeManager.init();
  Clock.init();
  Sidebar.init();
  Fab.init();
  Search.init();
  Calendar.init();
   initNotificationBell(); // <-- ADD THIS LINE HERE

  // 3. Dashboard-Specific Logic (Only run if on Dashboard)
  if ($('#timelineList')) {
    const mockData = DataService.getMockData();
    renderTimeline(mockData.timeline);
    renderGoals(mockData.goals);
    renderNotes(mockData.notes);
    renderReminders(mockData.reminders);
    Charts.init(mockData.analytics);

    await loadDashboardData();

    if (window.supabaseClient) {
      window.supabaseClient
        .channel('dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
          loadDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, payload => {
          loadDashboardData();
        })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, payload => {
          loadDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, payload => {
          loadDashboardData();
        })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, payload => {
          loadDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, payload => {
          loadDashboardData();
        })
        .subscribe();   
    }
    
  }

  // 4. Attach Logout to User Pill
  $('#userPill')?.addEventListener('click', async () => {
    if (window.Auth) {
      await window.Auth.signOut();
      window.location.href = 'auth.html';
    }
  });

  // 5. Bind remaining interactions
  bindStatCards();
  Animations.init();

  // 6. Stagger initial animations
  setTimeout(() => {
    $$('.stat-card').forEach((card, i) => {
      card.style.animation = `none`;
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.5s var(--ease-out), transform 0.5s var(--ease-out)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + i * 60);
    });
  }, 100);
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}