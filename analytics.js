/* =============================================================
   ATLAS — ANALYTICS PAGE LOGIC
   ============================================================= */

const State = {
  tasks: [],
  habits: [],
  goals: [],
  events: [],
  notes: [],
  startDate: new Date(Date.now() - 7 * 86400000),
  endDate: new Date(),
  charts: {}
};

const els = {
  filterPills: document.querySelectorAll('.pill'),
  customRangeWrapper: document.getElementById('customRangeWrapper'),
  startDateInput: document.getElementById('startDate'),
  endDateInput: document.getElementById('endDate'),
  applyCustomRangeBtn: document.getElementById('applyCustomRange'),
  insightsGrid: document.getElementById('insightsGrid'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  lastUpdated: document.getElementById('lastUpdated')
};

function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('toast--show'), 2600);
}

function isWithinRange(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  return date >= State.startDate && date <= State.endDate;
}

function isWithinRangeTimestamp(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return date >= State.startDate && date <= State.endDate;
}

async function loadAllData() {
  try {
    const [tasks, habits, goals, events, notes] = await Promise.all([
      window.TaskService.getAll(),
      window.HabitService.getAll(),
      window.GoalService.getAll(),
      window.CalendarService.getAll(),
      window.NoteService.getAll()
    ]);
    State.tasks = tasks;
    State.habits = habits;
    State.goals = goals;
    State.events = events;
    State.notes = notes;
  } catch (error) {
    console.error('Error loading analytics data:', error);
    toast('Failed to load analytics data.');
  }
}

function renderOverview() {
  const fTasks = State.tasks.filter(t => isWithinRange(t.dueDate) || isWithinRangeTimestamp(t.createdAt));
  const completedTasks = fTasks.filter(t => t.done).length;
  const activeGoals = State.goals.filter(g => !g.completed).length;
  const bestStreak = State.habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  const fEvents = State.events.filter(e => isWithinRange(e.startDate));
  const fNotes = State.notes.filter(n => isWithinRangeTimestamp(n.createdAt));
  
  const productivity = fTasks.length > 0 ? Math.round((completedTasks / fTasks.length) * 100) : 0;

  document.getElementById('statProductivity').textContent = `${productivity}%`;
  document.getElementById('statTotalTasks').textContent = fTasks.length;
  document.getElementById('statCompletedTasks').textContent = completedTasks;
  document.getElementById('statActiveGoals').textContent = activeGoals;
  document.getElementById('statCurrentStreak').textContent = bestStreak;
  document.getElementById('statEvents').textContent = fEvents.length;
  document.getElementById('statNotes').textContent = fNotes.length;
}

function renderInsights() {
  const insights = [];

  // 1. Most productive day
  const dayCounts = {};
  State.tasks.filter(t => t.done && t.dueDate).forEach(t => {
    const day = new Date(t.dueDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  if (bestDay) insights.push(`You are most productive on <strong>${bestDay[0]}s</strong>, completing ${bestDay[1]} tasks.`);

  // 2. Longest habit streak
  const longestHabit = State.habits.sort((a, b) => (b.longestStreak || 0) - (a.longestStreak || 0))[0];
  if (longestHabit && longestHabit.longestStreak > 0) insights.push(`Your longest habit streak is <strong>${longestHabit.longestStreak} days</strong> for ${longestHabit.title}.`);

  // 3. High priority completion
  const highPriTasks = State.tasks.filter(t => t.priority === 'high');
  const highPriDone = highPriTasks.filter(t => t.done).length;
  if (highPriTasks.length > 0) {
    const rate = Math.round((highPriDone / highPriTasks.length) * 100);
    insights.push(`You complete <strong>${rate}%</strong> of your high-priority tasks.`);
  }

  // 4. Most common task category
  const catCounts = {};
  State.tasks.forEach(t => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCat) insights.push(`Most of your work is related to <strong>${topCat[0]}</strong> (${topCat[1]} tasks).`);

  // 5. Goal progress
  const activeGoals = State.goals.filter(g => !g.completed);
  if (activeGoals.length > 0) {
    const avgProgress = Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length);
    insights.push(`You are <strong>${avgProgress}%</strong> through your active goals on average.`);
  }

  if (insights.length === 0) {
    els.insightsGrid.innerHTML = `<div class="insight-skeleton">Not enough data to generate insights yet. Start adding tasks and habits!</div>`;
  } else {
    els.insightsGrid.innerHTML = insights.map(i => `<div class="insight-item">${i}</div>`).join('');
  }
}

function getChartColors() {
  const style = getComputedStyle(document.body);
  return {
    text: style.getPropertyValue('--fg-muted').trim(),
    grid: style.getPropertyValue('--border').trim(),
    accent: style.getPropertyValue('--accent').trim(),
    accent2: style.getPropertyValue('--accent-2').trim(),
    accent3: style.getPropertyValue('--accent-3').trim(),
    accent4: style.getPropertyValue('--accent-4').trim(),
    accent5: style.getPropertyValue('--accent-5').trim()
  };
}

function renderCharts() {
  const colors = getChartColors();
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: colors.text, font: { family: 'Inter' } }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'Inter' }
      }
    },
    scales: {
      x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
      y: { ticks: { color: colors.text }, grid: { color: colors.grid }, beginAtZero: true }
    }
  };

  // Destroy existing charts
  Object.values(State.charts).forEach(c => c && c.destroy());

  // 1. Task Daily Completion (Line)
  const taskDailyData = {};
  State.tasks.filter(t => t.done && t.dueDate && isWithinRange(t.dueDate)).forEach(t => {
    taskDailyData[t.dueDate] = (taskDailyData[t.dueDate] || 0) + 1;
  });
  const taskDailyLabels = Object.keys(taskDailyData).sort();
  const ctx1 = document.getElementById('chartTaskDaily').getContext('2d');
  State.charts.taskDaily = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: taskDailyLabels.map(d => new Date(d+'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Tasks Completed',
        data: taskDailyLabels.map(d => taskDailyData[d]),
        borderColor: colors.accent,
        backgroundColor: colors.accent + '33',
        fill: true,
        tension: 0.4
      }]
    },
    options: defaultOptions
  });

  // 2. Task Priority Distribution (Doughnut)
  const priorityCounts = { high: 0, med: 0, low: 0 };
  State.tasks.filter(t => isWithinRange(t.dueDate)).forEach(t => priorityCounts[t.priority]++);
  const ctx2 = document.getElementById('chartTaskPriority').getContext('2d');
  State.charts.taskPriority = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [priorityCounts.high, priorityCounts.med, priorityCounts.low],
        backgroundColor: [colors.accent5, colors.accent2, colors.accent3],
        borderWidth: 0
      }]
    },
    options: { ...defaultOptions, scales: {} }
  });

  // 3. Habit Success % (Bar)
  const habitLabels = State.habits.slice(0, 5).map(h => h.title);
  const habitData = State.habits.slice(0, 5).map(h => {
    if (!h.longestStreak) return 0;
    return Math.min(100, Math.round((h.streak / Math.max(h.longestStreak, 1)) * 100));
  });
  const ctx3 = document.getElementById('chartHabitSuccess').getContext('2d');
  State.charts.habitSuccess = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: habitLabels,
      datasets: [{
        label: 'Consistency %',
        data: habitData,
        backgroundColor: colors.accent3
      }]
    },
    options: defaultOptions
  });

  // 4. Habit Trend (Line - proxy with streaks)
  const ctx4 = document.getElementById('chartHabitTrend').getContext('2d');
  State.charts.habitTrend = new Chart(ctx4, {
    type: 'line',
    data: {
      labels: State.habits.map(h => h.title),
      datasets: [{
        label: 'Current Streak',
        data: State.habits.map(h => h.streak),
        borderColor: colors.accent2,
        backgroundColor: colors.accent2 + '33',
        fill: true
      }]
    },
    options: defaultOptions
  });

  // 5. Goal Progress (Bar)
  const ctx5 = document.getElementById('chartGoalProgress').getContext('2d');
  State.charts.goalProgress = new Chart(ctx5, {
    type: 'bar',
    data: {
      labels: State.goals.map(g => g.title.substring(0, 10) + '...'),
      datasets: [{
        label: 'Progress %',
        data: State.goals.map(g => g.progress),
        backgroundColor: colors.accent
      }]
    },
    options: defaultOptions
  });

  // 6. Event Categories (Doughnut)
  const eventCats = {};
  State.events.filter(e => isWithinRange(e.startDate)).forEach(e => {
    eventCats[e.category] = (eventCats[e.category] || 0) + 1;
  });
  const ctx6 = document.getElementById('chartEventCategories').getContext('2d');
  State.charts.eventCats = new Chart(ctx6, {
    type: 'doughnut',
    data: {
      labels: Object.keys(eventCats),
      datasets: [{
        data: Object.values(eventCats),
        backgroundColor: [colors.accent, colors.accent2, colors.accent3, colors.accent4, colors.accent5],
        borderWidth: 0
      }]
    },
    options: { ...defaultOptions, scales: {} }
  });
}

function renderAll() {
  renderOverview();
  renderInsights();
  renderCharts();
  if (els.lastUpdated) els.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

// Filters
els.filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    els.filterPills.forEach(p => p.classList.remove('pill--active'));
    pill.classList.add('pill--active');
    
    const range = pill.dataset.range;
    if (range === 'custom') {
      els.customRangeWrapper.hidden = false;
    } else {
      els.customRangeWrapper.hidden = true;
      const days = parseInt(range, 10);
      const today = new Date(); today.setHours(23, 59, 59, 999);
      if (days === 0) { // Today
        State.startDate = new Date(); State.startDate.setHours(0, 0, 0, 0);
      } else {
        State.startDate = new Date(today.getTime() - days * 86400000);
      }
      State.endDate = today;
      renderAll();
    }
  });
});

if (els.applyCustomRangeBtn) {
  els.applyCustomRangeBtn.addEventListener('click', () => {
    if (els.startDateInput.value && els.endDateInput.value) {
      State.startDate = new Date(els.startDateInput.value + 'T00:00:00');
      State.endDate = new Date(els.endDateInput.value + 'T23:59:59');
      renderAll();
    }
  });
}

// Exports
if (els.exportCsvBtn) {
  els.exportCsvBtn.addEventListener('click', () => {
    let csv = 'Type,Title,Status,Date,CreatedAt\n';
    State.tasks.forEach(t => csv += `Task,${t.title},${t.done ? 'Completed' : 'Pending'},${t.dueDate},${new Date(t.createdAt).toISOString()}\n`);
    State.habits.forEach(h => csv += `Habit,${h.title},${h.streak} day streak,,${new Date(h.createdAt).toISOString()}\n`);
    State.goals.forEach(g => csv += `Goal,${g.title},${g.progress}% complete,,${new Date(g.createdAt).toISOString()}\n`);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast('CSV exported successfully');
  });
}

if (els.exportPdfBtn) {
  els.exportPdfBtn.addEventListener('click', () => {
    toast('Preparing PDF...');
    setTimeout(() => window.print(), 500);
  });
}

async function initAnalytics() {
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

  await loadAllData();
  renderAll();

  // Realtime
  if (window.supabaseClient) {
    window.supabaseClient
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, loadAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, loadAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, loadAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, loadAllData)
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
  document.addEventListener('DOMContentLoaded', initAnalytics);
} else {
  initAnalytics();
}