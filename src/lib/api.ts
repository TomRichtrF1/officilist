// src/lib/api.ts
// This file replaces supabase.ts - use this for all API calls

// V produkci (Heroku) je API na stejném serveru, takže použijeme relativní URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('officilist_token');
}

// Save token to localStorage
export function setToken(token: string): void {
  localStorage.setItem('officilist_token', token);
}

// Remove token from localStorage
export function removeToken(): void {
  localStorage.removeItem('officilist_token');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getToken();
}

// Generic fetch wrapper with auth
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ AUTH ============

export async function login(password: string): Promise<{ token: string }> {
  const result = await fetchAPI<{ success: boolean; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  
  if (result.token) {
    setToken(result.token);
  }
  
  return result;
}

export async function verifyToken(): Promise<boolean> {
  try {
    const result = await fetchAPI<{ valid: boolean }>('/auth/verify', {
      method: 'POST',
    });
    return result.valid;
  } catch {
    return false;
  }
}

export function logout(): void {
  removeToken();
}

// ============ FOLDERS ============

export interface Folder {
  id: string;
  name: string;
  type: 'COMPANY' | 'PROJECT' | 'PERSONAL';
  color: string;
  icon: string;
  order: number;
  isArchived?: boolean;
  createdAt: string;
}

export async function getFolders(): Promise<Folder[]> {
  return fetchAPI<Folder[]>('/folders');
}

export async function createFolder(data: Partial<Folder>): Promise<Folder> {
  return fetchAPI<Folder>('/folders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
  return fetchAPI<Folder>(`/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============ PERSONS ============

export interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export async function getPersons(search?: string): Promise<Person[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchAPI<Person[]>(`/persons${params}`);
}

export async function createPerson(data: { name: string; email?: string; phone?: string }): Promise<Person> {
  return fetchAPI<Person>('/persons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePerson(id: string, data: Partial<Person>): Promise<Person> {
  return fetchAPI<Person>(`/persons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePerson(id: string): Promise<void> {
  await fetchAPI(`/persons/${id}`, { method: 'DELETE' });
}

// ============ TASKS ============

export interface Task {
  id: string;
  folderId: string;
  folder?: Folder;
  type: 'TASK' | 'NOTE';
  title: string;
  description: string | null;
  url: string | null;
  ownerId: string | null;
  owner?: Person | null;
  status: 'NOVY' | 'ZADANY' | 'CEKAJICI' | 'HOTOVO' | 'ZRUSEN';
  isPriority: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  dependsOn?: TaskDependency[];
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  dependsOn?: Task;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  changedAt: string;
}

export interface TaskFilters {
  folder?: string;
  owner?: string;
  status?: string;
  from?: string;
  to?: string;
}

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.folder) params.set('folder', filters.folder);
  if (filters?.owner) params.set('owner', filters.owner);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  
  const query = params.toString();
  return fetchAPI<Task[]>(`/tasks${query ? `?${query}` : ''}`);
}

export async function getTask(id: string): Promise<Task> {
  return fetchAPI<Task>(`/tasks/${id}`);
}

export async function getTaskHistory(id: string): Promise<TaskHistory[]> {
  return fetchAPI<TaskHistory[]>(`/tasks/${id}/history`);
}

export async function createTask(data: {
  folderId: string;
  title: string;
  type?: 'TASK' | 'NOTE';
  description?: string;
  url?: string;
  ownerId?: string;
  isPriority?: boolean;
  dueDate?: string;
  dependsOnIds?: string[];
}): Promise<Task> {
  return fetchAPI<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return fetchAPI<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await fetchAPI(`/tasks/${id}`, { method: 'DELETE' });
}

// ============ DEPENDENCIES ============

export async function addDependency(taskId: string, dependsOnId: string): Promise<TaskDependency> {
  return fetchAPI<TaskDependency>(`/tasks/${taskId}/dependencies`, {
    method: 'POST',
    body: JSON.stringify({ dependsOnId }),
  });
}

export async function removeDependency(taskId: string, dependencyId: string): Promise<void> {
  await fetchAPI(`/tasks/${taskId}/dependencies/${dependencyId}`, { method: 'DELETE' });
}

// ============ MESSAGES ============

export type MessageType = 'summary' | 'reminder';
export type MessageChannel = 'email' | 'whatsapp';

export interface GenerateMessageParams {
  taskId: string;
  type: MessageType;
  channel: MessageChannel;
}

export async function generateMessage(params: GenerateMessageParams): Promise<string> {
  const result = await fetchAPI<{ text: string }>('/messages/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return result.text;
}
