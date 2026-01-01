import Dexie, { Table } from 'dexie';

export interface Folder {
  id: string;
  name: string;
  type: 'COMPANY' | 'PROJECT' | 'PERSONAL';
  color: string;
  icon: string;
  order: number;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  folderId: string;
  type: 'TASK' | 'NOTE';
  title: string;
  description?: string;
  url?: string;
  ownerId?: string;
  status: 'NOVY' | 'ZADANY' | 'CEKAJICI' | 'HOTOVO' | 'ZRUSEN';
  isPriority: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  field: string;
  oldValue?: string;
  newValue: string;
  changedAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  createdAt: string;
}

export interface SyncQueue {
  id?: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  data: any;
  timestamp: string;
}

export class OfficelistDB extends Dexie {
  folders!: Table<Folder, string>;
  persons!: Table<Person, string>;
  tasks!: Table<Task, string>;
  taskHistory!: Table<TaskHistory, string>;
  taskDependencies!: Table<TaskDependency, string>;
  syncQueue!: Table<SyncQueue, number>;

  constructor() {
    super('OfficelistDB');

    this.version(1).stores({
      folders: 'id, type, order',
      persons: 'id, name, isActive',
      tasks: 'id, folderId, ownerId, status, dueDate, isPriority, updatedAt',
      taskHistory: 'id, taskId, changedAt',
      taskDependencies: 'id, taskId, dependsOnId',
      syncQueue: '++id, timestamp, table'
    });
  }
}

export const db = new OfficelistDB();
