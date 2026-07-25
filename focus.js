/* =============================================================
   ATLAS — FOCUS TIMER LOGIC
   ============================================================= */

const State = {
  sessions: [],
  currentSessionId: null,
  mode: 'pomodoro',
  plannedMinutes: 25,
  timeLeft: 25 * 60, // seconds
  isRunning: false,
  intervalId: null,
  links: { tasks: [], goals: [], habits: [] },
  audio: new Audio(),
  quotes: [
    "Discipline equals freedom.",
    "Focus is the new IQ.",
    "Deep work is the superpower of the 21st century.",
    "What you stay focused on will grow.",
    "Concentration is the secret of strength."
  ]
};

const els = {
  statToday: document.getElementById('statToday'),
  statWeekly: document.getElementById('statWeekly'),
  statCompleted: document.getElementById('statCompleted'),
  statLongest: document.getElementById('statLongest'),
  
  modePills: document.querySelectorAll('.focus-modes .pill'),
  timerTime: document.getElementById('timerTime'),
  timerStatus: document.getElementById('timerStatus'),
  timerRingProgress: document.getElementById('timerRingProgress'),
  
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  activateDistractionFree: document.getElementById('activateDistractionFree'),
  
  distractionFreeOverlay: document.getElementById('distractionFreeOverlay'),
  dfTime: document.getElementById('dfTime'),
  dfTimerRingProgress: document.getElementById('dfTimerRingProgress'),
  dfQuote: document.getElementById('dfQuote'),
  dfExitBtn: document.getElementById('dfExitBtn'),
  dfToggleBtn: document.getElementById('dfToggleBtn'),
  
  linkTask: document.getElementById('linkTask'),
  linkGoal: document.getElementById('linkGoal'),
  linkHabit: document.getElementById('linkHabit'),
  
  soundBtns: document.querySelectorAll('.sound-btn'),
  sessionList: document.getElementById('sessionList'),
  emptyState: document.getElementById('emptyState')
};

function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function updateTimerUI() {
  const timeStr = formatTime(State.timeLeft);
  els.timerTime.textContent = timeStr;
  if (els.dfTime) els.dfTime.textContent = timeStr;
  
  const totalSeconds = State.plannedMinutes * 60;
  const progress = (totalSeconds - State.timeLeft) / totalSeconds;
  const circumference = 578;
  const offset = circumference - (progress * circumference);
  
  els.timerRingProgress.style.strokeDashoffset = offset;
  if (els.dfTimerRingProgress) els.dfTimerRingProgress.style.strokeDashoffset = offset;
  
  els.timerStatus.textContent = State.isRunning ? 'In Progress' : (State.timeLeft === totalSeconds ? 'Ready to focus' : 'Paused');
  els.startBtn.innerHTML = State.isRunning 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Pause</span>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Start</span>`;
  
  if (els.dfToggleBtn) els.dfToggleBtn.textContent = State.isRunning ? 'Pause' : 'Resume';
}

async function startTimer() {
  if (State.isRunning) {
    pauseTimer();
    return;
  }

  if (State.timeLeft === 0 || State.timeLeft === State.plannedMinutes * 60) {
    // Fresh start
    State.timeLeft = State.plannedMinutes * 60;
    
    try {
      const newSession = await window.FocusService.create({
        sessionName: `${State.mode.replace('_', ' ')} Session`,
        focusType: State.mode,
        plannedMinutes: State.plannedMinutes,
        status: 'active',
        startedAt: Date.now(),
        taskId: els.linkTask.value || null,
        goalId: els.linkGoal.value || null,
        habitId: els.linkHabit.value || null
      });
      State.currentSessionId = newSession.id;
      State.sessions.unshift(newSession);
      renderSessions();
      toast('Focus session started!');
    } catch (error) {
      toast('Error starting session');
      return;
    }
  } else {
    // Resume
    if (State.currentSessionId) {
      await window.FocusService.update(State.currentSessionId, { status: 'active' });
    }
  }

  State.isRunning = true;
  State.intervalId = setInterval(async () => {
    State.timeLeft--;
    updateTimerUI();
    
    if (State.timeLeft <= 0) {
      clearInterval(State.intervalId);
      State.isRunning = false;
      await completeSession();
    }
  }, 1000);
  
  updateTimerUI();
}

async function pauseTimer() {
  clearInterval(State.intervalId);
  State.isRunning = false;
  
  if (State.currentSessionId) {
    const elapsedMin = Math.floor((State.plannedMinutes * 60 - State.timeLeft) / 60);
    try {
      await window.FocusService.update(State.currentSessionId, { 
        status: 'paused', 
        pauseCount: 1, // Simplified: increments by 1 per pause action
        actualMinutes: elapsedMin 
      });
    } catch (error) {}
  }
  updateTimerUI();
}

async function resetTimer() {
  clearInterval(State.intervalId);
  State.isRunning = false;
  
  if (State.currentSessionId) {
    const elapsedMin = Math.floor((State.plannedMinutes * 60 - State.timeLeft) / 60);
    try {
      await window.FocusService.update(State.currentSessionId, { 
        status: 'abandoned', 
        completed: false,
        endedAt: Date.now(),
        actualMinutes: elapsedMin 
      });
    } catch (error) {}
  }
  
  State.currentSessionId = null;
  State.timeLeft = State.plannedMinutes * 60;
  updateTimerUI();
  toast('Timer reset');
}

async function completeSession() {
  const elapsedMin = State.plannedMinutes; // Full session
  State.timeLeft = 0;
  
  try {
    if (State.currentSessionId) {
      await window.FocusService.update(State.currentSessionId, { 
        status: 'completed', 
        completed: true,
        endedAt: Date.now(),
        actualMinutes: elapsedMin 
      });
      
      // Update linked items
      const session = State.sessions.find(s => s.id === State.currentSessionId);
      if (session) {
        session.completed = true;
        session.status = 'completed';
        session.actualMinutes = elapsedMin;
        
        if (session.taskId) {
          await window.TaskService.update(session.taskId, { progress: 100, done: true });
        }
        if (session.habitId) {
          await window.HabitService.update(session.habitId, { completedToday: true });
        }
        if (session.goalId) {
          const goal = State.links.goals.find(g => g.id === session.goalId);
          if (goal) {
            const newProgress = Math.min(100, goal.progress + 5); // Bump goal progress by 5%
            await window.GoalService.update(session.goalId, { progress: newProgress });
          }
        }
      }
      
      toast('Session completed! 🎉');
      loadStats(); // Refresh stats
    }
  } catch (error) {
    toast('Error completing session');
  }
  
  State.currentSessionId = null;
  State.timeLeft = State.plannedMinutes * 60;
  renderSessions();
  updateTimerUI();
}

// Mode Switching
els.modePills.forEach(pill => {
  pill.addEventListener('click', () => {
    if (State.isRunning) {
      toast('Please reset the current timer first.');
      return;
    }
    els.modePills.forEach(p => p.classList.remove('pill--active'));
    pill.classList.add('pill--active');
    State.mode = pill.dataset.mode;
    State.plannedMinutes = parseInt(pill.dataset.minutes, 10);
    State.timeLeft = State.plannedMinutes * 60;
    updateTimerUI();
  });
});

// Controls
els.startBtn.addEventListener('click', startTimer);
els.resetBtn.addEventListener('click', resetTimer);

// Distraction Free Mode
function toggleDistractionFree(forceShow = false) {
  const isHidden = els.distractionFreeOverlay.hidden;
  if (isHidden || forceShow) {
    els.distractionFreeOverlay.hidden = false;
    els.dfQuote.textContent = `"${State.quotes[Math.floor(Math.random() * State.quotes.length)]}"`;
  } else {
    els.distractionFreeOverlay.hidden = true;
  }
}

els.fullscreenBtn.addEventListener('click', () => toggleDistractionFree(true));
els.activateDistractionFree.addEventListener('click', () => toggleDistractionFree(true));
els.dfExitBtn.addEventListener('click', () => toggleDistractionFree(false));
els.dfToggleBtn.addEventListener('click', startTimer);

// Sound Controls
els.soundBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    els.soundBtns.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const sound = btn.dataset.sound;
    
    if (sound === 'off') {
      State.audio.pause();
    } else {
      // In a real app, you'd have actual audio files.
      // State.audio.src = `/sounds/${sound}.mp3`;
      // State.audio.loop = true;
      // State.audio.play();
      toast(`Playing ${sound} sounds (placeholder)`);
    }
  });
});

async function loadLinkableItems() {
  try {
    const [tasks, goals, habits] = await Promise.all([
      window.TaskService.getAll(),
      window.GoalService.getAll(),
      window.HabitService.getAll()
    ]);
    
    State.links.tasks = tasks;
    State.links.goals = goals;
    State.links.habits = habits;

    els.linkTask.innerHTML = '<option value="">None</option>' + tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
    els.linkGoal.innerHTML = '<option value="">None</option>' + goals.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
    els.linkHabit.innerHTML = '<option value="">None</option>' + habits.map(h => `<option value="${h.id}">${h.title}</option>`).join('');
  } catch (error) {
    console.error('Error loading linkable items:', error);
  }
}

function renderSessions() {
  const completed = State.sessions.filter(s => s.completed);
  if (completed.length === 0) {
    els.sessionList.innerHTML = '';
    els.emptyState.hidden = false;
    return;
  }
  
  els.emptyState.hidden = true;
  els.sessionList.innerHTML = completed.slice(0, 10).map(s => `
    <div class="session-item">
      <div class="session-item__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/></svg>
      </div>
      <div class="session-item__main">
        <div class="session-item__title">${s.sessionName}</div>
        <div class="session-item__meta">${formatDuration(s.actualMinutes)} · ${new Date(s.startedAt).toLocaleDateString()}</div>
      </div>
    </div>
  `).join('');
}

async function loadStats() {
  try {
    const sessions = await window.FocusService.getAll();
    State.sessions = sessions;
    renderSessions();
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    
    const todaysSessions = sessions.filter(s => s.completed && new Date(s.startedAt).toISOString().split('T')[0] === todayStr);
    const weeklySessions = sessions.filter(s => s.completed && new Date(s.startedAt) >= weekAgo);
    
    const todayMin = todaysSessions.reduce((sum, s) => sum + s.actualMinutes, 0);
    const weeklyMin = weeklySessions.reduce((sum, s) => sum + s.actualMinutes, 0);
    const longestMin = sessions.reduce((max, s) => Math.max(max, s.actualMinutes || 0), 0);
    
    els.statToday.textContent = formatDuration(todayMin);
    els.statWeekly.textContent = formatDuration(weeklyMin);
    els.statCompleted.textContent = sessions.filter(s => s.completed).length;
    els.statLongest.textContent = formatDuration(longestMin);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function initFocus() {
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

  updateTimerUI();
  await Promise.all([loadStats(), loadLinkableItems()]);

  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:focus_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, payload => {
        loadStats();
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
  document.addEventListener('DOMContentLoaded', initFocus);
} else {
  initFocus();
}