import { create } from 'zustand';
import { db, Folder, Person, Task, TaskHistory, TaskDependency } from '../db/dexie';
import { supabase } from '../lib/supabase';

interface AppState {
  folders: Folder[];
  persons: Person[];
  tasks: Task[];
  taskHistory: Record<string, TaskHistory[]>;
  taskDependencies: TaskDependency[];
  isAuthenticated: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;

  setAuthenticated: (value: boolean) => void;
  setOnline: (value: boolean) => void;

  loadData: () => Promise<void>;

  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  createPerson: (person: Omit<Person, 'id' | 'createdAt'>) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;

  loadTaskHistory: (taskId: string) => Promise<void>;

  syncWithServer: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  folders: [],
  persons: [],
  tasks: [],
  taskHistory: {},
  taskDependencies: [],
  isAuthenticated: false,
  isSyncing: false,
  isOnline: navigator.onLine,
  lastSyncTime: localStorage.getItem('lastSyncTime'),

  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setOnline: (value) => set({ isOnline: value }),

  loadData: async () => {
    const folders = await db.folders.toArray();
    const persons = await db.persons.toArray();
    const tasks = await db.tasks.toArray();
    const taskDependencies = await db.taskDependencies.toArray();

    set({ folders, persons, tasks, taskDependencies });
  },

  createTask: async (taskData) => {
    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.tasks.add(task);

    const history: TaskHistory = {
      id: crypto.randomUUID(),
      taskId: task.id,
      field: 'created',
      newValue: 'Task created',
      changedAt: new Date().toISOString(),
    };
    await db.taskHistory.add(history);

    await db.syncQueue.add({
      operation: 'INSERT',
      table: 'tasks',
      recordId: task.id,
      data: task,
      timestamp: new Date().toISOString(),
    });

    set((state) => ({ tasks: [...state.tasks, task] }));

    if (get().isOnline) {
      get().syncWithServer();
    }

    return task;
  },

  updateTask: async (id, updates) => {
    const oldTask = await db.tasks.get(id);
    if (!oldTask) return;

    const updatedTask = {
      ...oldTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.status === 'HOTOVO' && !updatedTask.completedAt) {
      updatedTask.completedAt = new Date().toISOString();
    }

    if (oldTask.status === 'NOVY' && updates.ownerId && !updates.status) {
      updatedTask.status = 'ZADANY';
    }

    await db.tasks.update(id, updatedTask);

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== (oldTask as any)[key]) {
        const history: TaskHistory = {
          id: crypto.randomUUID(),
          taskId: id,
          field: key,
          oldValue: String((oldTask as any)[key] || ''),
          newValue: String(value),
          changedAt: new Date().toISOString(),
        };
        await db.taskHistory.add(history);
      }
    }

    await db.syncQueue.add({
      operation: 'UPDATE',
      table: 'tasks',
      recordId: id,
      data: updatedTask,
      timestamp: new Date().toISOString(),
    });

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
    }));

    if (get().isOnline) {
      get().syncWithServer();
    }
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id);
    await db.taskHistory.where('taskId').equals(id).delete();
    await db.taskDependencies.where('taskId').equals(id).delete();
    await db.taskDependencies.where('dependsOnId').equals(id).delete();

    await db.syncQueue.add({
      operation: 'DELETE',
      table: 'tasks',
      recordId: id,
      data: null,
      timestamp: new Date().toISOString(),
    });

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      taskDependencies: state.taskDependencies.filter(
        (d) => d.taskId !== id && d.dependsOnId !== id
      ),
    }));

    if (get().isOnline) {
      get().syncWithServer();
    }
  },

  createPerson: async (personData) => {
    const person: Person = {
      ...personData,
      id: crypto.randomUUID(),
      isActive: personData.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    await db.persons.add(person);

    await db.syncQueue.add({
      operation: 'INSERT',
      table: 'persons',
      recordId: person.id,
      data: person,
      timestamp: new Date().toISOString(),
    });

    set((state) => ({ persons: [...state.persons, person] }));

    if (get().isOnline) {
      get().syncWithServer();
    }

    return person;
  },

  updatePerson: async (id, updates) => {
    await db.persons.update(id, updates);

    const person = await db.persons.get(id);
    if (person) {
      await db.syncQueue.add({
        operation: 'UPDATE',
        table: 'persons',
        recordId: id,
        data: person,
        timestamp: new Date().toISOString(),
      });
    }

    set((state) => ({
      persons: state.persons.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));

    if (get().isOnline) {
      get().syncWithServer();
    }
  },

  loadTaskHistory: async (taskId) => {
    const history = await db.taskHistory.where('taskId').equals(taskId).toArray();
    set((state) => ({
      taskHistory: { ...state.taskHistory, [taskId]: history },
    }));
  },

  syncWithServer: async () => {
    if (get().isSyncing || !get().isOnline) return;

    set({ isSyncing: true });

    try {
      const queueItems = await db.syncQueue.toArray();

      for (const item of queueItems) {
        try {
          if (item.table === 'tasks') {
            if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
              const { id, createdAt, updatedAt, ...taskData } = item.data;
              await supabase.from('tasks').upsert({
                id,
                ...taskData,
                folder_id: taskData.folderId,
                owner_id: taskData.ownerId,
                is_priority: taskData.isPriority,
                due_date: taskData.dueDate,
                created_at: createdAt,
                updated_at: updatedAt,
                completed_at: taskData.completedAt,
              });
            } else if (item.operation === 'DELETE') {
              await supabase.from('tasks').delete().eq('id', item.recordId);
            }
          } else if (item.table === 'persons') {
            if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
              const { id, createdAt, ...personData } = item.data;
              await supabase.from('persons').upsert({
                id,
                ...personData,
                is_active: personData.isActive,
                created_at: createdAt,
              });
            }
          }

          if (item.id) {
            await db.syncQueue.delete(item.id);
          }
        } catch (error) {
          console.error('Sync error for item:', item, error);
        }
      }

      const { data: folders } = await supabase.from('folders').select('*');
      if (folders) {
        await db.folders.clear();
        await db.folders.bulkAdd(
          folders.map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type,
            color: f.color,
            icon: f.icon,
            order: f.order,
            createdAt: f.created_at,
          }))
        );
      }

      const { data: persons } = await supabase.from('persons').select('*');
      if (persons) {
        await db.persons.clear();
        await db.persons.bulkAdd(
          persons.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            isActive: p.is_active,
            createdAt: p.created_at,
          }))
        );
      }

      const { data: tasks } = await supabase.from('tasks').select('*');
      if (tasks) {
        await db.tasks.clear();
        await db.tasks.bulkAdd(
          tasks.map((t) => ({
            id: t.id,
            folderId: t.folder_id,
            type: t.type,
            title: t.title,
            description: t.description,
            url: t.url,
            ownerId: t.owner_id,
            status: t.status,
            isPriority: t.is_priority,
            dueDate: t.due_date,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            completedAt: t.completed_at,
          }))
        );
      }

      const lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastSyncTime', lastSyncTime);
      set({ lastSyncTime });

      await get().loadData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      set({ isSyncing: false });
    }
  },
}));

window.addEventListener('online', () => {
  useAppStore.getState().setOnline(true);
  useAppStore.getState().syncWithServer();
});

window.addEventListener('offline', () => {
  useAppStore.getState().setOnline(false);
});
