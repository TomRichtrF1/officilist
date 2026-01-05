import { create } from 'zustand';
import { db, Folder, Person, Task, TaskHistory, TaskDependency } from '../db/dexie';
import * as api from '../lib/api';

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
  loadFolders: () => Promise<void>;

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

  loadFolders: async () => {
    if (!get().isOnline || !api.isAuthenticated()) {
      // Offline - načíst z lokální DB
      const folders = await db.folders.toArray();
      set({ folders });
      return;
    }

    try {
      // Online - stáhnout ze serveru
      const folders = await api.getFolders();
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
            isArchived: f.isArchived || false,
            createdAt: f.createdAt,
          }))
        );
        set({ folders });
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      // Fallback na lokální data
      const folders = await db.folders.toArray();
      set({ folders });
    }
  },

  createTask: async (taskData) => {
    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Uložit lokálně
    await db.tasks.add(task);

    const history: TaskHistory = {
      id: crypto.randomUUID(),
      taskId: task.id,
      field: 'created',
      newValue: 'Task created',
      changedAt: new Date().toISOString(),
    };
    await db.taskHistory.add(history);

    // Přidat do sync fronty
    await db.syncQueue.add({
      operation: 'INSERT',
      table: 'tasks',
      recordId: task.id,
      data: task,
      timestamp: new Date().toISOString(),
    });

    set((state) => ({ tasks: [...state.tasks, task] }));

    // Synchronizovat s serverem
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

    // Automaticky nastavit completedAt při dokončení
    if (updates.status === 'HOTOVO' && !updatedTask.completedAt) {
      updatedTask.completedAt = new Date().toISOString();
    }

    // Automaticky změnit status na ZADANY při přiřazení vlastníka
    if (oldTask.status === 'NOVY' && updates.ownerId && !updates.status) {
      updatedTask.status = 'ZADANY';
    }

    await db.tasks.update(id, updatedTask);

    // Zaznamenat změny do historie
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
    if (get().isSyncing || !get().isOnline || !api.isAuthenticated()) return;

    set({ isSyncing: true });

    try {
      // Zpracovat frontu změn
      const queueItems = await db.syncQueue.toArray();

      for (const item of queueItems) {
        try {
          if (item.table === 'tasks') {
            if (item.operation === 'INSERT') {
              await api.createTask({
                folderId: item.data.folderId,
                title: item.data.title,
                type: item.data.type,
                description: item.data.description,
                url: item.data.url,
                ownerId: item.data.ownerId,
                isPriority: item.data.isPriority,
                dueDate: item.data.dueDate,
                reminderDate: item.data.reminderDate,
                reminderDaysBefore: item.data.reminderDaysBefore,
              });
            } else if (item.operation === 'UPDATE') {
              await api.updateTask(item.recordId, item.data);
            } else if (item.operation === 'DELETE') {
              await api.deleteTask(item.recordId);
            }
          } else if (item.table === 'persons') {
            if (item.operation === 'INSERT') {
              await api.createPerson({
                name: item.data.name,
                email: item.data.email,
                phone: item.data.phone,
              });
            } else if (item.operation === 'UPDATE') {
              await api.updatePerson(item.recordId, item.data);
            }
          }

          // Odstranit zpracovanou položku z fronty
          if (item.id) {
            await db.syncQueue.delete(item.id);
          }
        } catch (error) {
          console.error('Sync error for item:', item, error);
        }
      }

      // Stáhnout aktuální data ze serveru
      const folders = await api.getFolders();
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
            isArchived: f.isArchived || false,
            createdAt: f.createdAt,
          }))
        );
      }

      const persons = await api.getPersons();
      if (persons) {
        await db.persons.clear();
        await db.persons.bulkAdd(
          persons.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            isActive: p.isActive,
            createdAt: p.createdAt,
          }))
        );
      }

      const tasks = await api.getTasks();
      if (tasks) {
        await db.tasks.clear();
        await db.tasks.bulkAdd(
          tasks.map((t) => ({
            id: t.id,
            folderId: t.folderId,
            type: t.type,
            title: t.title,
            description: t.description,
            url: t.url,
            ownerId: t.ownerId,
            status: t.status,
            isPriority: t.isPriority,
            dueDate: t.dueDate,
            reminderDate: t.reminderDate,
            reminderDaysBefore: t.reminderDaysBefore,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            completedAt: t.completedAt,
          }))
        );
      }

      const lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastSyncTime', lastSyncTime);
      set({ lastSyncTime });

      // Načíst data do stavu
      await get().loadData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      set({ isSyncing: false });
    }
  },
}));

// Sledovat změny připojení
window.addEventListener('online', () => {
  useAppStore.getState().setOnline(true);
  useAppStore.getState().syncWithServer();
});

window.addEventListener('offline', () => {
  useAppStore.getState().setOnline(false);
});
