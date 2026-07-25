/* =============================================================
   ATLAS — 3 6 9 MANIFESTATION LOGIC
   ============================================================= */

const MState = {
  record: null,
  intervalId: null,
  currentPhase: null
};

const Mels = {
  widgetBtn: document.getElementById('manifestWidgetBtn'),
  statusEl: document.getElementById('manifestStatus'),
  
  modalOverlay: document.getElementById('manifestModalOverlay'),
  closeBtn: document.getElementById('closeManifestBtn'),
  body: document.getElementById('manifestBody'),
  
  setupView: document.getElementById('manifestSetupView'),
  mainView: document.getElementById('manifestMainView'),
  saveSetupBtn: document.getElementById('saveSetupBtn'),
  editBtn: document.getElementById('editManifestBtn'),
  
  affirmationText: document.getElementById('manifestAffirmationText'),
  morningLabel: document.getElementById('morningTimeLabel'),
  afternoonLabel: document.getElementById('afternoonTimeLabel'),
  nightLabel: document.getElementById('nightTimeLabel'),
  taskBtns: document.querySelectorAll('.manifest-task'),
  
  writeOverlay: document.getElementById('writeManifestOverlay'),
  writeTitle: document.getElementById('writeManifestTitle'),
  writeText: document.getElementById('writeAffirmationText'),
  writeArea: document.getElementById('manifestWritingArea'),
  completeWriteBtn: document.getElementById('completeWritingBtn')
};

function defaultToast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = message;
  t.classList.add('toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    t.classList.remove('toast--show');
    t.innerHTML = '';
  }, 5000);
}

// Custom toast with a "Start Writing" button
function showActionToast(message, phaseKey, count) {
  const t = document.getElementById('toast');
  if (!t) return;
  
  t.innerHTML = `
    <span>${message}</span>
    <button id="manifestToastBtn" style="margin-left: 12px; background: var(--accent); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">Start Writing</button>
  `;
  t.classList.add('toast--show');
  
  const btn = document.getElementById('manifestToastBtn');
  if (btn) {
    btn.onclick = () => {
      MState.currentPhase = phaseKey;
      openWritingModal(count);
      t.classList.remove('toast--show');
      t.innerHTML = '';
    };
  }
  
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    t.classList.remove('toast--show');
    t.innerHTML = '';
  }, 10000); // Show for 10 seconds
}

// ---------- INITIALIZATION ----------
async function initManifestation() {
  await loadManifestation();
  
  // Ensure modals are closed on load
  Mels.modalOverlay.classList.remove('active');
  Mels.writeOverlay.classList.remove('active');
  
  startManifestationInterval();
}

async function loadManifestation() {
  try {
    // Fetches the single record (database unique constraint ensures 1 per user)
    MState.record = await window.ManifestationService.get();
    if (MState.record) {
      checkDailyReset();
      updateWidgetUI();
      updateMainView();
    } else {
      Mels.statusEl.textContent = 'Tap to setup';
    }
  } catch (error) {
    console.error('Error loading manifestation:', error);
  }
}

function checkDailyReset() {
  if (!MState.record) return;
  const today = new Date().toISOString().split('T')[0];
  if (MState.record.lastCompletedDate !== today) {
    MState.record.morningCompleted = false;
    MState.record.afternoonCompleted = false;
    MState.record.nightCompleted = false;
    MState.record.lastCompletedDate = today;
    
    window.ManifestationService.update(MState.record.id, {
      morningCompleted: false,
      afternoonCompleted: false,
      nightCompleted: false,
      lastCompletedDate: today
    });
  }
}

// ---------- REMINDER SCHEDULER ----------
function startManifestationInterval() {
  if (MState.intervalId) clearInterval(MState.intervalId);
  // Check every 15 seconds for accuracy
  MState.intervalId = setInterval(checkTimes, 15000);
  checkTimes(); // Initial check on load
}

function getReminderState() {
  const todayStr = new Date().toISOString().split('T')[0];
  const state = JSON.parse(localStorage.getItem('manifestReminders') || '{}');
  
  // Reset state if it's a new day
  if (state.date !== todayStr) {
    state.date = todayStr;
    state.morning = null;
    state.afternoon = null;
    state.night = null;
  }
  
  return state;
}

function saveReminderState(state) {
  localStorage.setItem('manifestReminders', JSON.stringify(state));
}

function checkTimes() {
  if (!MState.record) return;
  
  const now = new Date();
  const hhmm = now.toTimeString().substring(0, 5);
  const state = getReminderState();
  
  const phases = [
    { key: 'morning', name: 'Morning', count: 3, time: MState.record.morningTime },
    { key: 'afternoon', name: 'Afternoon', count: 6, time: MState.record.afternoonTime },
    { key: 'night', name: 'Night', count: 9, time: MState.record.nightTime }
  ];

  phases.forEach(p => {
    // Stop if already completed today
    if (MState.record[`${p.key}Completed`]) return;
    if (!p.time) return;

    const isNow = hhmm === p.time;
    const isMissed = hhmm > p.time;
    const lastSent = state[p.key];
    
    // Condition 1: It's exactly time, and we haven't sent it yet
    // Condition 2: We missed it (app was closed), and we haven't sent the "missed" notification yet
    // Condition 3: It's a repeat reminder (30 mins have passed since last sent)
    const shouldFire = (isNow || isMissed) && (
      !lastSent || (Date.now() - lastSent >= 30 * 60 * 1000)
    );

    if (shouldFire) {
      const isFirstMissed = isMissed && !lastSent;
      triggerReminder(p.name, p.count, p.key, isFirstMissed);
      
      // Update state
      state[p.key] = Date.now();
      saveReminderState(state);
    }
  });
}

function triggerReminder(phaseName, count, phaseKey, isMissed) {
  const title = 'Atlas 3·6·9';
  let msg;
  
  if (isMissed) {
    msg = `You missed your ${phaseName} manifestation. Tap to complete it.`;
  } else {
    msg = `Reminder: Time for your ${phaseName} manifestation (${count}x)`;
  }
  
  // 1. Save to Notification Center
  if (window.NotificationService) {
    window.NotificationService.create({
      title: title,
      message: msg,
      module: 'manifestation',
      priority: 'high',
      icon: 'bell',
      actionUrl: 'index.html'
    }).catch(err => console.error("Failed to create notification:", err));
    
    // 2. Browser Notification
    window.NotificationService.sendBrowserNotification(title, msg);
  }
  
  // 3. Show App Toast with "Start Writing" button (DO NOT auto-open modal)
  showActionToast(msg, phaseKey, count);
}

// ---------- UI UPDATES ----------
function updateWidgetUI() {
  if (!MState.record) return;
  let doneCount = 0;
  if (MState.record.morningCompleted) doneCount++;
  if (MState.record.afternoonCompleted) doneCount++;
  if (MState.record.nightCompleted) doneCount++;
  
  if (doneCount === 3) {
    Mels.statusEl.textContent = 'Completed ✓';
  } else {
    Mels.statusEl.textContent = `${doneCount}/3 done`;
  }
}

function updateMainView() {
  if (!MState.record) return;
  Mels.affirmationText.textContent = `"${MState.record.affirmation}"`;
  Mels.morningLabel.textContent = MState.record.morningTime;
  Mels.afternoonLabel.textContent = MState.record.afternoonTime;
  Mels.nightLabel.textContent = MState.record.nightTime;
  
  Mels.taskBtns.forEach(btn => {
    const phase = btn.dataset.phase;
    const isDone = MState.record[`${phase}Completed`];
    btn.classList.toggle('manifest-task--done', isDone);
  });
}

// ---------- MODAL CONTROLS ----------
Mels.widgetBtn.addEventListener('click', () => {
  if (MState.record) {
    Mels.setupView.hidden = true;
    Mels.mainView.hidden = false;
  } else {
    Mels.setupView.hidden = false;
    Mels.mainView.hidden = true;
  }
  Mels.modalOverlay.classList.add('active');
});

Mels.closeBtn.addEventListener('click', () => {
  Mels.modalOverlay.classList.remove('active');
});

Mels.modalOverlay.addEventListener('click', (e) => {
  if (e.target === Mels.modalOverlay) Mels.modalOverlay.classList.remove('active');
});

Mels.editBtn.addEventListener('click', () => {
  document.getElementById('setupAffirmation').value = MState.record.affirmation;
  document.getElementById('setupMorningTime').value = MState.record.morningTime;
  document.getElementById('setupAfternoonTime').value = MState.record.afternoonTime;
  document.getElementById('setupNightTime').value = MState.record.nightTime;
  Mels.setupView.hidden = false;
  Mels.mainView.hidden = true;
});

Mels.saveSetupBtn.addEventListener('click', async () => {
  const data = {
    affirmation: document.getElementById('setupAffirmation').value.trim(),
    morningTime: document.getElementById('setupMorningTime').value,
    afternoonTime: document.getElementById('setupAfternoonTime').value,
    nightTime: document.getElementById('setupNightTime').value
  };
  
  if (!data.affirmation) {
    defaultToast('Please enter an affirmation');
    return;
  }
  
  try {
    if (MState.record) {
      // UPDATE EXISTING (Prevents duplicates)
      await window.ManifestationService.update(MState.record.id, data);
      Object.assign(MState.record, data);
    } else {
      // CREATE NEW (Only happens once per user)
      const newRec = await window.ManifestationService.create(data);
      MState.record = newRec;
    }
    
    // Reset reminders for today if times changed
    const state = getReminderState();
    state.morning = null;
    state.afternoon = null;
    state.night = null;
    saveReminderState(state);
    
    updateMainView();
    updateWidgetUI();
    Mels.setupView.hidden = true;
    Mels.mainView.hidden = false;
    defaultToast('Manifestation saved!');
  } catch (error) {
    defaultToast('Error saving manifestation');
    console.error(error);
  }
});

// ---------- WRITING LOGIC ----------
Mels.taskBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('manifest-task--done')) return;
    const phase = btn.dataset.phase;
    const count = parseInt(btn.dataset.count, 10);
    MState.currentPhase = phase;
    openWritingModal(count);
  });
});

function openWritingModal(count) {
  Mels.writeTitle.textContent = `Write ${count} Times`;
  Mels.writeText.textContent = `"${MState.record.affirmation}"`;
  
  Mels.writeArea.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'manifest-writing-input';
    input.placeholder = `${i + 1}. ${MState.record.affirmation}`;
    input.dataset.index = i + 1;
    Mels.writeArea.appendChild(input);
  }
  
  Mels.writeOverlay.classList.add('active');
}

Mels.completeWriteBtn.addEventListener('click', async () => {
  const inputs = Mels.writeArea.querySelectorAll('.manifest-writing-input');
  let allFilled = true;
  inputs.forEach(input => {
    if (!input.value.trim()) allFilled = false;
  });
  
  if (!allFilled) {
    defaultToast('Please fill in all fields');
    return;
  }
  
  const updateData = {
    [`${MState.currentPhase}Completed`]: true
  };
  
  try {
    await window.ManifestationService.update(MState.record.id, updateData);
    MState.record[`${MState.currentPhase}Completed`] = true;
    
    // Mark as completed in reminder state so it NEVER fires again today
    const state = getReminderState();
    state[MState.currentPhase] = 'completed';
    saveReminderState(state);
    
    updateWidgetUI();
    updateMainView();
    Mels.writeOverlay.classList.remove('active');
    defaultToast('Manifestation complete! ✨');
  } catch (error) {
    defaultToast('Error saving progress');
  }
});

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initManifestation);
} else {
  initManifestation();
}