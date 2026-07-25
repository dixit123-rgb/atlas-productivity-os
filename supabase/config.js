// supabase/config.js
// Initialize Supabase globally for non-module scripts
const SUPABASE_URL = 'https://leidqebsnufcsvnrutjp.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'sb_publishable_EF4kKqFBhnhMqnE74z-_Kg_HFuuc8G_'; // Replace with your Supabase Anon Key

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication Helper
window.Auth = {
  async getSession() {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  },
  
  async signIn(email, password) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signUp(email, password) {
    const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
    return { data, error };
  },

  async signOut() {
    const { error } = await window.supabaseClient.auth.signOut();
    return { error };
  }
};

// Database Helper for Tasks
window.TaskService = {
  async getAll() {
    const { data, error } = await window.supabaseClient
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(t => window.TaskService.mapDbToJs(t));
  },

  async create(taskData) {
    const dbData = window.TaskService.mapJsToDb(taskData);
    const { data, error } = await window.supabaseClient
      .from('tasks')
      .insert(dbData)
      .select();
    
    if (error) throw error;
    return window.TaskService.mapDbToJs(data[0]);
  },

  async update(id, updates) {
    const dbUpdates = window.TaskService.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return window.TaskService.mapDbToJs(data[0]);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Map database snake_case to JS camelCase
  mapDbToJs(dbTask) {
    return {
      id: dbTask.id,
      title: dbTask.title,
      desc: dbTask.description || '',
      category: dbTask.category || 'personal',
      priority: dbTask.priority || 'med',
      dueDate: dbTask.due_date || '',
      dueTime: dbTask.due_time || '',
      reminder: String(dbTask.reminder || 'none'),
      duration: dbTask.estimated_duration || 0,
      notes: dbTask.notes || '',
      progress: dbTask.progress || 0,
      status: dbTask.status || 'pending',
      done: dbTask.completed || false,
      createdAt: new Date(dbTask.created_at).getTime()
    };
  },

  // Map JS camelCase to database snake_case
  mapJsToDb(jsTask) {
    const dbData = {};
    if (jsTask.title !== undefined) dbData.title = jsTask.title;
    if (jsTask.desc !== undefined) dbData.description = jsTask.desc;
    if (jsTask.category !== undefined) dbData.category = jsTask.category;
    if (jsTask.priority !== undefined) dbData.priority = jsTask.priority;
    if (jsTask.dueDate !== undefined) dbData.due_date = jsTask.dueDate;
    if (jsTask.dueTime !== undefined) dbData.due_time = jsTask.dueTime;
    if (jsTask.reminder !== undefined) dbData.reminder = jsTask.reminder;
    if (jsTask.duration !== undefined) dbData.estimated_duration = parseInt(jsTask.duration, 10) || 0;
    if (jsTask.notes !== undefined) dbData.notes = jsTask.notes;
    if (jsTask.progress !== undefined) dbData.progress = jsTask.progress;
    if (jsTask.status !== undefined) dbData.status = jsTask.status;
    if (jsTask.done !== undefined) dbData.completed = jsTask.done;
    return dbData;
  }
};


// Add this to the bottom of supabase/config.js
window.HabitService = {
  async getAll() {
    const { data, error } = await window.supabaseClient
      .from('habits')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(h => window.HabitService.mapDbToJs(h));
  },

  async create(habitData) {
    const dbData = window.HabitService.mapJsToDb(habitData);
    const { data, error } = await window.supabaseClient
      .from('habits')
      .insert(dbData)
      .select();
    
    if (error) throw error;
    return window.HabitService.mapDbToJs(data[0]);
  },

  async update(id, updates) {
    const dbUpdates = window.HabitService.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('habits')
      .update(dbUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return window.HabitService.mapDbToJs(data[0]);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('habits')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  mapDbToJs(dbHabit) {
    return {
      id: dbHabit.id,
      title: dbHabit.title,
      desc: dbHabit.description || '',
      category: dbHabit.category || 'personal',
      color: dbHabit.color || '#FF5C39',
      icon: dbHabit.icon || 'leaf',
      frequency: dbHabit.frequency || 'Daily',
      targetValue: dbHabit.target_value || 1,
      currentValue: dbHabit.current_value || 0,
      streak: dbHabit.streak || 0,
      longestStreak: dbHabit.longest_streak || 0,
      completedToday: dbHabit.completed_today || false,
      lastCompletedAt: dbHabit.last_completed_at || null,
      reminderEnabled: dbHabit.reminder_enabled || false,
      reminderTime: dbHabit.reminder_time || '',
      notes: dbHabit.notes || '',
      createdAt: new Date(dbHabit.created_at).getTime()
    };
  },

  mapJsToDb(jsHabit) {
    const dbData = {};
    if (jsHabit.title !== undefined) dbData.title = jsHabit.title;
    if (jsHabit.desc !== undefined) dbData.description = jsHabit.desc;
    if (jsHabit.category !== undefined) dbData.category = jsHabit.category;
    if (jsHabit.color !== undefined) dbData.color = jsHabit.color;
    if (jsHabit.icon !== undefined) dbData.icon = jsHabit.icon;
    if (jsHabit.frequency !== undefined) dbData.frequency = jsHabit.frequency;
    if (jsHabit.targetValue !== undefined) dbData.target_value = parseInt(jsHabit.targetValue, 10) || 1;
    if (jsHabit.currentValue !== undefined) dbData.current_value = parseInt(jsHabit.currentValue, 10) || 0;
    if (jsHabit.streak !== undefined) dbData.streak = parseInt(jsHabit.streak, 10) || 0;
    if (jsHabit.longestStreak !== undefined) dbData.longest_streak = parseInt(jsHabit.longestStreak, 10) || 0;
    if (jsHabit.completedToday !== undefined) dbData.completed_today = jsHabit.completedToday;
    if (jsHabit.lastCompletedAt !== undefined) dbData.last_completed_at = jsHabit.lastCompletedAt;
    if (jsHabit.reminderEnabled !== undefined) dbData.reminder_enabled = jsHabit.reminderEnabled;
    if (jsHabit.reminderTime !== undefined) dbData.reminder_time = jsHabit.reminderTime;
    if (jsHabit.notes !== undefined) dbData.notes = jsHabit.notes;
    return dbData;
  }
};


// Add this to the bottom of supabase/config.js
window.GoalService = {
  async getAll() {
    const { data, error } = await window.supabaseClient
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(g => window.GoalService.mapDbToJs(g));
  },

  async create(goalData) {
    const dbData = window.GoalService.mapJsToDb(goalData);
    const { data, error } = await window.supabaseClient
      .from('goals')
      .insert(dbData)
      .select();
    
    if (error) throw error;
    return window.GoalService.mapDbToJs(data[0]);
  },

  async update(id, updates) {
    const dbUpdates = window.GoalService.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('goals')
      .update(dbUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return window.GoalService.mapDbToJs(data[0]);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('goals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  mapDbToJs(dbGoal) {
    return {
      id: dbGoal.id,
      title: dbGoal.title,
      desc: dbGoal.description || '',
      category: dbGoal.category || 'personal',
      priority: dbGoal.priority || 'med',
      status: dbGoal.status || 'active',
      progress: dbGoal.progress || 0,
      targetDate: dbGoal.target_date || '',
      completed: dbGoal.completed || false,
      notes: dbGoal.notes || '',
      createdAt: new Date(dbGoal.created_at).getTime()
    };
  },

  mapJsToDb(jsGoal) {
    const dbData = {};
    if (jsGoal.title !== undefined) dbData.title = jsGoal.title;
    if (jsGoal.desc !== undefined) dbData.description = jsGoal.desc;
    if (jsGoal.category !== undefined) dbData.category = jsGoal.category;
    if (jsGoal.priority !== undefined) dbData.priority = jsGoal.priority;
    if (jsGoal.status !== undefined) dbData.status = jsGoal.status;
    if (jsGoal.progress !== undefined) dbData.progress = parseInt(jsGoal.progress, 10) || 0;
    if (jsGoal.targetDate !== undefined) dbData.target_date = jsGoal.targetDate;
    if (jsGoal.completed !== undefined) dbData.completed = jsGoal.completed;
    if (jsGoal.notes !== undefined) dbData.notes = jsGoal.notes;
    return dbData;
  }
};

// Add this to the bottom of supabase/config.js
window.CalendarService = {
  async getAll() {
    const { data, error } = await window.supabaseClient
      .from('calendar_events')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data.map(e => window.CalendarService.mapDbToJs(e));
  },

  async create(eventData) {
    const dbData = window.CalendarService.mapJsToDb(eventData);
    const { data, error } = await window.supabaseClient
      .from('calendar_events')
      .insert(dbData)
      .select();
    
    if (error) throw error;
    return window.CalendarService.mapDbToJs(data[0]);
  },

  async update(id, updates) {
    const dbUpdates = window.CalendarService.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('calendar_events')
      .update(dbUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return window.CalendarService.mapDbToJs(data[0]);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('calendar_events')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  mapDbToJs(dbEvent) {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      desc: dbEvent.description || '',
      category: dbEvent.category || 'general',
      startDate: dbEvent.start_date || '',
      endDate: dbEvent.end_date || '',
      startTime: dbEvent.start_time || '',
      endTime: dbEvent.end_time || '',
      allDay: dbEvent.all_day || false,
      location: dbEvent.location || '',
      color: dbEvent.color || '#FF5C39',
      repeatType: dbEvent.repeat_type || 'none',
      reminderMinutes: dbEvent.reminder_minutes || 0,
      goalId: dbEvent.goal_id || null,
      taskId: dbEvent.task_id || null,
      habitId: dbEvent.habit_id || null,
      completed: dbEvent.completed || false,
      createdAt: new Date(dbEvent.created_at).getTime()
    };
  },

  mapJsToDb(jsEvent) {
    const dbData = {};
    if (jsEvent.title !== undefined) dbData.title = jsEvent.title;
    if (jsEvent.desc !== undefined) dbData.description = jsEvent.desc;
    if (jsEvent.category !== undefined) dbData.category = jsEvent.category;
    if (jsEvent.startDate !== undefined) dbData.start_date = jsEvent.startDate;
    if (jsEvent.endDate !== undefined) dbData.end_date = jsEvent.endDate;
    if (jsEvent.startTime !== undefined) dbData.start_time = jsEvent.startTime;
    if (jsEvent.endTime !== undefined) dbData.end_time = jsEvent.endTime;
    if (jsEvent.allDay !== undefined) dbData.all_day = jsEvent.allDay;
    if (jsEvent.location !== undefined) dbData.location = jsEvent.location;
    if (jsEvent.color !== undefined) dbData.color = jsEvent.color;
    if (jsEvent.repeatType !== undefined) dbData.repeat_type = jsEvent.repeatType;
    if (jsEvent.reminderMinutes !== undefined) dbData.reminder_minutes = parseInt(jsEvent.reminderMinutes, 10) || 0;
    if (jsEvent.goalId !== undefined) dbData.goal_id = jsEvent.goalId || null;
    if (jsEvent.taskId !== undefined) dbData.task_id = jsEvent.taskId || null;
    if (jsEvent.habitId !== undefined) dbData.habit_id = jsEvent.habitId || null;
    if (jsEvent.completed !== undefined) dbData.completed = jsEvent.completed;
    return dbData;
  }
};


// Add this to the bottom of supabase/config.js
window.NoteService = {
  async getAll() {
    const { data, error } = await window.supabaseClient
      .from('notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data.map(n => window.NoteService.mapDbToJs(n));
  },

  async create(noteData) {
    const dbData = window.NoteService.mapJsToDb(noteData);
    const { data, error } = await window.supabaseClient
      .from('notes')
      .insert(dbData)
      .select();
    
    if (error) throw error;
    return window.NoteService.mapDbToJs(data[0]);
  },

  async update(id, updates) {
    const dbUpdates = window.NoteService.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('notes')
      .update(dbUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return window.NoteService.mapDbToJs(data[0]);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('notes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  mapDbToJs(dbNote) {
    return {
      id: dbNote.id,
      title: dbNote.title || '',
      content: dbNote.content || '',
      category: dbNote.category || 'general',
      color: dbNote.color || '#FF5C39',
      favorite: dbNote.favorite || false,
      pinned: dbNote.pinned || false,
      tags: dbNote.tags || [],
      goalId: dbNote.goal_id || null,
      taskId: dbNote.task_id || null,
      habitId: dbNote.habit_id || null,
      calendarEventId: dbNote.calendar_event_id || null,
      archived: dbNote.archived || false,
      deletedAt: dbNote.deleted_at || null,
      updatedAt: new Date(dbNote.updated_at).getTime()
    };
  },

  mapJsToDb(jsNote) {
    const dbData = {};
    if (jsNote.title !== undefined) dbData.title = jsNote.title;
    if (jsNote.content !== undefined) dbData.content = jsNote.content;
    if (jsNote.category !== undefined) dbData.category = jsNote.category;
    if (jsNote.color !== undefined) dbData.color = jsNote.color;
    if (jsNote.favorite !== undefined) dbData.favorite = jsNote.favorite;
    if (jsNote.pinned !== undefined) dbData.pinned = jsNote.pinned;
    if (jsNote.tags !== undefined) dbData.tags = jsNote.tags;
    if (jsNote.goalId !== undefined) dbData.goal_id = jsNote.goalId || null;
    if (jsNote.taskId !== undefined) dbData.task_id = jsNote.taskId || null;
    if (jsNote.habitId !== undefined) dbData.habit_id = jsNote.habitId || null;
    if (jsNote.calendarEventId !== undefined) dbData.calendar_event_id = jsNote.calendarEventId || null;
    if (jsNote.archived !== undefined) dbData.archived = jsNote.archived;
    if (jsNote.deletedAt !== undefined) dbData.deleted_at = jsNote.deletedAt;
    return dbData;
  }
};


// Add this to the bottom of supabase/config.js
window.FocusService = {
  async getAll() {
    const { data, error } = await window.supabaseClient
      .from('focus_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(s => window.FocusService.mapDbToJs(s));
  },

  async create(sessionData) {
    const dbData = window.FocusService.mapJsToDb(sessionData);
    const { data, error } = await window.supabaseClient
      .from('focus_sessions')
      .insert(dbData)
      .select();
    
    if (error) throw error;
    return window.FocusService.mapDbToJs(data[0]);
  },

  async update(id, updates) {
    const dbUpdates = window.FocusService.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('focus_sessions')
      .update(dbUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return window.FocusService.mapDbToJs(data[0]);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('focus_sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  mapDbToJs(dbSession) {
    return {
      id: dbSession.id,
      taskId: dbSession.task_id || null,
      goalId: dbSession.goal_id || null,
      habitId: dbSession.habit_id || null,
      sessionName: dbSession.session_name || 'Focus Session',
      focusType: dbSession.focus_type || 'pomodoro',
      plannedMinutes: dbSession.planned_minutes || 25,
      actualMinutes: dbSession.actual_minutes || 0,
      status: dbSession.status || 'active',
      startedAt: new Date(dbSession.started_at).getTime(),
      endedAt: dbSession.ended_at ? new Date(dbSession.ended_at).getTime() : null,
      completed: dbSession.completed || false,
      pauseCount: dbSession.pause_count || 0,
      notes: dbSession.notes || '',
      createdAt: new Date(dbSession.created_at).getTime()
    };
  },

  mapJsToDb(jsSession) {
    const dbData = {};
    if (jsSession.taskId !== undefined) dbData.task_id = jsSession.taskId || null;
    if (jsSession.goalId !== undefined) dbData.goal_id = jsSession.goalId || null;
    if (jsSession.habitId !== undefined) dbData.habit_id = jsSession.habitId || null;
    if (jsSession.sessionName !== undefined) dbData.session_name = jsSession.sessionName;
    if (jsSession.focusType !== undefined) dbData.focus_type = jsSession.focusType;
    if (jsSession.plannedMinutes !== undefined) dbData.planned_minutes = parseInt(jsSession.plannedMinutes, 10) || 25;
    if (jsSession.actualMinutes !== undefined) dbData.actual_minutes = parseInt(jsSession.actualMinutes, 10) || 0;
    if (jsSession.status !== undefined) dbData.status = jsSession.status;
    if (jsSession.startedAt !== undefined) dbData.started_at = new Date(jsSession.startedAt).toISOString();
    if (jsSession.endedAt !== undefined) dbData.ended_at = jsSession.endedAt ? new Date(jsSession.endedAt).toISOString() : null;
    if (jsSession.completed !== undefined) dbData.completed = jsSession.completed;
    if (jsSession.pauseCount !== undefined) dbData.pause_count = parseInt(jsSession.pauseCount, 10) || 0;
    if (jsSession.notes !== undefined) dbData.notes = jsSession.notes;
    return dbData;
  }
};

// Add this to the bottom of supabase/config.js
window.ManifestationService = {
  async get() {
    const { data, error } = await window.supabaseClient
      .from('manifestation_369')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data ? this.mapDbToJs(data) : null;
  },

  async create(data) {
    const dbData = this.mapJsToDb(data);
    const { data: result, error } = await window.supabaseClient
      .from('manifestation_369')
      .insert(dbData)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return this.mapDbToJs(result);
  },

  async update(id, updates) {
    const dbUpdates = this.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('manifestation_369')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return this.mapDbToJs(data);
  },

  mapDbToJs(dbRec) {
    return {
      id: dbRec.id,
      affirmation: dbRec.affirmation || '',
      morningCompleted: dbRec.morning_completed || false,
      afternoonCompleted: dbRec.afternoon_completed || false,
      nightCompleted: dbRec.night_completed || false,
      morningTime: dbRec.morning_time || '08:00',
      afternoonTime: dbRec.afternoon_time || '14:00',
      nightTime: dbRec.night_time || '20:00',
      lastCompletedDate: dbRec.last_completed_date || null,
      createdAt: new Date(dbRec.created_at).getTime()
    };
  },

  mapJsToDb(jsRec) {
    const dbData = {};
    if (jsRec.affirmation !== undefined) dbData.affirmation = jsRec.affirmation;
    if (jsRec.morningCompleted !== undefined) dbData.morning_completed = jsRec.morningCompleted;
    if (jsRec.afternoonCompleted !== undefined) dbData.afternoon_completed = jsRec.afternoonCompleted;
    if (jsRec.nightCompleted !== undefined) dbData.night_completed = jsRec.nightCompleted;
    if (jsRec.morningTime !== undefined) dbData.morning_time = jsRec.morningTime;
    if (jsRec.afternoonTime !== undefined) dbData.afternoon_time = jsRec.afternoonTime;
    if (jsRec.nightTime !== undefined) dbData.night_time = jsRec.nightTime;
    if (jsRec.lastCompletedDate !== undefined) dbData.last_completed_date = jsRec.lastCompletedDate;
    return dbData;
  }
};

// Future-ready Notification Service
window.NotificationService = {
  async init() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  },
  async send(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
    // Future: Add Telegram/WhatsApp API calls here
  }
};


window.ManifestationService = {
  async get() {
    const { data, error } = await window.supabaseClient
      .from('manifestation_369')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data ? window.ManifestationService.mapDbToJs(data) : null;
  },

  async create(manifestData) {
    const dbData = window.ManifestationService.mapJsToDb(manifestData);
    const { data, error } = await window.supabaseClient
      .from('manifestation_369')
      .insert(dbData)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return window.ManifestationService.mapDbToJs(data);
  },

  async update(id, updates) {
    const dbUpdates = window.ManifestationService.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('manifestation_369')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return window.ManifestationService.mapDbToJs(data);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('manifestation_369')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  mapDbToJs(dbRec) {
    return {
      id: dbRec.id,
      affirmation: dbRec.affirmation || '',
      morningCompleted: dbRec.morning_completed || false,
      afternoonCompleted: dbRec.afternoon_completed || false,
      nightCompleted: dbRec.night_completed || false,
      morningTime: dbRec.morning_time || '08:00',
      afternoonTime: dbRec.afternoon_time || '14:00',
      nightTime: dbRec.night_time || '20:00',
      lastCompletedDate: dbRec.last_completed_date || null,
      createdAt: new Date(dbRec.created_at).getTime()
    };
  },

  mapJsToDb(jsRec) {
    const dbData = {};
    if (jsRec.affirmation !== undefined) dbData.affirmation = jsRec.affirmation;
    if (jsRec.morningCompleted !== undefined) dbData.morning_completed = jsRec.morningCompleted;
    if (jsRec.afternoonCompleted !== undefined) dbData.afternoon_completed = jsRec.afternoonCompleted;
    if (jsRec.nightCompleted !== undefined) dbData.night_completed = jsRec.nightCompleted;
    if (jsRec.morningTime !== undefined) dbData.morning_time = jsRec.morningTime;
    if (jsRec.afternoonTime !== undefined) dbData.afternoon_time = jsRec.afternoonTime;
    if (jsRec.nightTime !== undefined) dbData.night_time = jsRec.nightTime;
    if (jsRec.lastCompletedDate !== undefined) dbData.last_completed_date = jsRec.lastCompletedDate;
    return dbData;
  }
};

// Add this to the bottom of supabase/config.js
window.SettingsService = {
  async get() {
    const { data, error } = await window.supabaseClient
      .from('user_settings')
      .select('*')
      .maybeSingle();
    
    if (error) throw error;
    return data ? this.mapDbToJs(data) : null;
  },

  async create(settingsData) {
    const dbData = this.mapJsToDb(settingsData);
    const { data, error } = await window.supabaseClient
      .from('user_settings')
      .insert(dbData)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return this.mapDbToJs(data);
  },

  async update(updates) {
    // RLS ensures this only updates the user's own row
    const dbUpdates = this.mapJsToDb(updates);
    const { data, error } = await window.supabaseClient
      .from('user_settings')
      .update(dbUpdates)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return this.mapDbToJs(data);
  },

  mapDbToJs(dbRec) {
    return {
      id: dbRec.id,
      fullName: dbRec.full_name || '',
      username: dbRec.username || '',
      profilePhoto: dbRec.profile_photo || '',
      bio: dbRec.bio || '',
      theme: dbRec.theme || 'dark',
      accentColor: dbRec.accent_color || '#FF5C39',
      language: dbRec.language || 'en',
      timezone: dbRec.timezone || 'UTC',
      dateFormat: dbRec.date_format || 'MM/DD/YYYY',
      timeFormat: dbRec.time_format || '12h',
      startPage: dbRec.start_page || 'dashboard',
      defaultCalendarView: dbRec.default_calendar_view || 'month',
      defaultFocusMode: dbRec.default_focus_mode || 'pomodoro',
      defaultReminderSound: dbRec.default_reminder_sound || 'none',
      notificationEnabled: dbRec.notification_enabled ?? true,
      browserNotifications: dbRec.browser_notifications ?? false,
      emailNotifications: dbRec.email_notifications ?? false,
      autoBackup: dbRec.auto_backup ?? false,
      analyticsEnabled: dbRec.analytics_enabled ?? true,
      compactMode: dbRec.compact_mode ?? false,
      animationsEnabled: dbRec.animations_enabled ?? true
    };
  },

  mapJsToDb(jsRec) {
    const dbData = {};
    if (jsRec.fullName !== undefined) dbData.full_name = jsRec.fullName;
    if (jsRec.username !== undefined) dbData.username = jsRec.username;
    if (jsRec.profilePhoto !== undefined) dbData.profile_photo = jsRec.profilePhoto;
    if (jsRec.bio !== undefined) dbData.bio = jsRec.bio;
    if (jsRec.theme !== undefined) dbData.theme = jsRec.theme;
    if (jsRec.accentColor !== undefined) dbData.accent_color = jsRec.accentColor;
    if (jsRec.language !== undefined) dbData.language = jsRec.language;
    if (jsRec.timezone !== undefined) dbData.timezone = jsRec.timezone;
    if (jsRec.dateFormat !== undefined) dbData.date_format = jsRec.dateFormat;
    if (jsRec.timeFormat !== undefined) dbData.time_format = jsRec.timeFormat;
    if (jsRec.startPage !== undefined) dbData.start_page = jsRec.startPage;
    if (jsRec.defaultCalendarView !== undefined) dbData.default_calendar_view = jsRec.defaultCalendarView;
    if (jsRec.defaultFocusMode !== undefined) dbData.default_focus_mode = jsRec.defaultFocusMode;
    if (jsRec.defaultReminderSound !== undefined) dbData.default_reminder_sound = jsRec.defaultReminderSound;
    if (jsRec.notificationEnabled !== undefined) dbData.notification_enabled = jsRec.notificationEnabled;
    if (jsRec.browserNotifications !== undefined) dbData.browser_notifications = jsRec.browserNotifications;
    if (jsRec.emailNotifications !== undefined) dbData.email_notifications = jsRec.emailNotifications;
    if (jsRec.autoBackup !== undefined) dbData.auto_backup = jsRec.autoBackup;
    if (jsRec.analyticsEnabled !== undefined) dbData.analytics_enabled = jsRec.analyticsEnabled;
    if (jsRec.compactMode !== undefined) dbData.compact_mode = jsRec.compactMode;
    if (jsRec.animationsEnabled !== undefined) dbData.animations_enabled = jsRec.animationsEnabled;
    return dbData;
  }
};


// Add this to the bottom of supabase/config.js
// This replaces the placeholder NotificationService from the Manifestation module
window.NotificationService = {
  _listeners: [],

  async create(data) {
    const dbData = this.mapJsToDb(data);
    const { data: result, error } = await window.supabaseClient
      .from('notifications')
      .insert(dbData)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    const mapped = this.mapDbToJs(result);
    this._notifyListeners(mapped);
    return mapped;
  },

  async getAll(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error } = await window.supabaseClient
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return data.map(n => this.mapDbToJs(n));
  },

  async getUnread() {
    const { data, error } = await window.supabaseClient
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(n => this.mapDbToJs(n));
  },

  async markRead(id) {
    const { data, error } = await window.supabaseClient
      .from('notifications')
      .update({ is_read: true, read_time: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return this.mapDbToJs(data);
  },

  async markUnread(id) {
    const { data, error } = await window.supabaseClient
      .from('notifications')
      .update({ is_read: false, read_time: null })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return this.mapDbToJs(data);
  },

  async archive(id) {
    const { data, error } = await window.supabaseClient
      .from('notifications')
      .update({ is_archived: true })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return this.mapDbToJs(data);
  },

  async pin(id, isPinned) {
    const { data, error } = await window.supabaseClient
      .from('notifications')
      .update({ is_pinned: isPinned })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return this.mapDbToJs(data);
  },

  async snooze(id, snoozeUntilTime) {
    const { data, error } = await window.supabaseClient
      .from('notifications')
      .update({ 
        status: 'snoozed', 
        scheduled_time: snoozeUntilTime,
        is_archived: false 
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return this.mapDbToJs(data);
  },

  async delete(id) {
    const { error } = await window.supabaseClient
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return true;
  },

  async clearRead() {
    const { error } = await window.supabaseClient
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .eq('is_pinned', false);
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return true;
  },

  async clearAll() {
    const { error } = await window.supabaseClient
      .from('notifications')
      .delete()
      .neq('is_pinned', true); // Keep pinned items
    
    if (error) throw error;
    this._triggerGlobalUpdate();
    return true;
  },

  subscribeRealtime(callback) {
    this._listeners.push(callback);
    
    const subscription = window.supabaseClient
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
        this._triggerGlobalUpdate();
      })
      .subscribe();
      
    return subscription;
  },

  _triggerGlobalUpdate() {
    if (this._listeners && this._listeners.length > 0) {
      this._listeners.forEach(cb => cb());
    }
  },

  _notifyListeners(notification) {
    // Also trigger global update for inserts
    this._triggerGlobalUpdate();
  },

  async sendBrowserNotification(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
    // Future: Add Push (PWA), Telegram, WhatsApp, Email hooks here
  },

  mapDbToJs(dbRec) {
    return {
      id: dbRec.id,
      title: dbRec.title,
      message: dbRec.message || '',
      module: dbRec.module || 'general',
      moduleRecordId: dbRec.module_record_id || null,
      priority: dbRec.priority || 'medium',
      type: dbRec.notification_type || 'general',
      status: dbRec.status || 'delivered',
      scheduledTime: dbRec.scheduled_time ? new Date(dbRec.scheduled_time).getTime() : null,
      deliveredTime: dbRec.delivered_time ? new Date(dbRec.delivered_time).getTime() : null,
      readTime: dbRec.read_time ? new Date(dbRec.read_time).getTime() : null,
      isRead: dbRec.is_read || false,
      isArchived: dbRec.is_archived || false,
      isPinned: dbRec.is_pinned || false,
      actionUrl: dbRec.action_url || '#',
      icon: dbRec.icon || 'bell',
      payload: dbRec.payload || {},
      createdAt: new Date(dbRec.created_at).getTime()
    };
  },

  mapJsToDb(jsRec) {
    const dbData = {};
    if (jsRec.title !== undefined) dbData.title = jsRec.title;
    if (jsRec.message !== undefined) dbData.message = jsRec.message;
    if (jsRec.module !== undefined) dbData.module = jsRec.module;
    if (jsRec.moduleRecordId !== undefined) dbData.module_record_id = jsRec.moduleRecordId;
    if (jsRec.priority !== undefined) dbData.priority = jsRec.priority;
    if (jsRec.type !== undefined) dbData.notification_type = jsRec.type;
    if (jsRec.status !== undefined) dbData.status = jsRec.status;
    if (jsRec.scheduledTime !== undefined) dbData.scheduled_time = jsRec.scheduledTime ? new Date(jsRec.scheduledTime).toISOString() : null;
    if (jsRec.isRead !== undefined) dbData.is_read = jsRec.isRead;
    if (jsRec.isArchived !== undefined) dbData.is_archived = jsRec.isArchived;
    if (jsRec.isPinned !== undefined) dbData.is_pinned = jsRec.isPinned;
    if (jsRec.actionUrl !== undefined) dbData.action_url = jsRec.actionUrl;
    if (jsRec.icon !== undefined) dbData.icon = jsRec.icon;
    if (jsRec.payload !== undefined) dbData.payload = jsRec.payload;
    return dbData;
  }
};