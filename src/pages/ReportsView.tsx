import { useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { isTaskUrgent } from '../lib/dateUtils';
import { Task } from '../db/dexie';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ListTodo,
  TrendingUp,
  Users,
  Calendar,
  Folder,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ReportsViewProps {
  onTaskClick?: (task: Task) => void;
}

export function ReportsView({ onTaskClick }: ReportsViewProps) {
  const tasks = useAppStore((state) => state.tasks);
  const folders = useAppStore((state) => state.folders);
  const persons = useAppStore((state) => state.persons);

  // State pro rozbalené sekce
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const togglePerson = (personId: string) => {
    setExpandedPersons((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'HOTOVO').length;
    const cancelled = tasks.filter((t) => t.status === 'ZRUSEN').length;
    const active = tasks.filter((t) => t.status !== 'HOTOVO' && t.status !== 'ZRUSEN').length;
    
    const overdue = tasks.filter((t) => {
      if (t.status === 'HOTOVO' || t.status === 'ZRUSEN' || !t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    const urgent = tasks.filter((t) => 
      isTaskUrgent(t.dueDate, t.status) && t.status !== 'HOTOVO' && t.status !== 'ZRUSEN'
    ).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, cancelled, active, overdue, urgent, completionRate };
  }, [tasks]);

  // Statistiky podle folderů
  const folderStats = useMemo(() => {
    return folders.map((folder) => {
      const folderTasks = tasks.filter((t) => t.folderId === folder.id);
      const activeTasks = folderTasks.filter((t) => t.status !== 'HOTOVO' && t.status !== 'ZRUSEN');
      const completed = folderTasks.filter((t) => t.status === 'HOTOVO').length;
      const total = folderTasks.length;
      return { ...folder, activeTasks, active: activeTasks.length, completed, total };
    }).sort((a, b) => b.active - a.active);
  }, [tasks, folders]);

  // Statistiky podle osob
  const personStats = useMemo(() => {
    return persons
      .filter((p) => p.isActive)
      .map((person) => {
        const personTasks = tasks.filter((t) => t.ownerId === person.id);
        const activeTasks = personTasks.filter((t) => t.status !== 'HOTOVO' && t.status !== 'ZRUSEN');
        const completed = personTasks.filter((t) => t.status === 'HOTOVO').length;
        const overdue = personTasks.filter((t) => {
          if (t.status === 'HOTOVO' || t.status === 'ZRUSEN' || !t.dueDate) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDate = new Date(t.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today;
        }).length;
        const total = personTasks.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...person, activeTasks, active: activeTasks.length, completed, overdue, total, completionRate };
      })
      .sort((a, b) => b.active - a.active);
  }, [tasks, persons]);

  // Nadcházející úkoly (příštích 14 dní)
  const upcomingTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    return tasks
      .filter((t) => {
        if (t.status === 'HOTOVO' || t.status === 'ZRUSEN' || !t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= twoWeeks;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 10);
  }, [tasks]);

  const getFolder = (folderId: string) => folders.find((f) => f.id === folderId);
  const getPerson = (ownerId: string | null | undefined) => 
    ownerId ? persons.find((p) => p.id === ownerId) : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Dnes';
    if (diffDays === 1) return 'Zítra';
    if (diffDays < 7) return `Za ${diffDays} dní`;
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  };

  // Komponenta pro mini seznam úkolů
  const TaskMiniList = ({ taskList }: { taskList: Task[] }) => (
    <div className="mt-2 ml-6 space-y-1">
      {taskList.map((task) => {
        const owner = getPerson(task.ownerId);
        return (
          <button
            key={task.id}
            onClick={() => onTaskClick?.(task)}
            className="w-full flex items-center justify-between p-2 text-sm rounded-lg bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              {task.isPriority && <span className="text-red-500">❗</span>}
              <span className="truncate text-gray-700">{task.title}</span>
            </div>
            {owner && (
              <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                {owner.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📊 Reporty</h1>

      {/* Hlavní statistiky */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ListTodo className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Celkem úkolů</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Aktivních</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Hotových</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              <p className="text-sm text-gray-500">Po termínu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Completion rate */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <TrendingUp className="text-blue-600" size={20} />
          <h2 className="font-semibold text-gray-900">Míra dokončení</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <span className="text-lg font-bold text-gray-900 w-16 text-right">
            {stats.completionRate}%
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Podle folderů */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Folder className="text-purple-600" size={20} />
            <h2 className="font-semibold text-gray-900">Podle složek</h2>
          </div>
          <div className="space-y-2">
            {folderStats.map((folder) => {
              const isExpanded = expandedFolders.has(folder.id);
              const hasActiveTasks = folder.active > 0;
              
              return (
                <div key={folder.id}>
                  <button
                    onClick={() => hasActiveTasks && toggleFolder(folder.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      hasActiveTasks ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {hasActiveTasks ? (
                      isExpanded ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )
                    ) : (
                      <span className="w-4" />
                    )}
                    <span className="text-lg">{folder.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {folder.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {folder.active} aktivních
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: folder.total > 0 ? `${(folder.completed / folder.total) * 100}%` : '0%',
                            backgroundColor: folder.color 
                          }}
                        />
                      </div>
                    </div>
                  </button>
                  {isExpanded && folder.activeTasks.length > 0 && (
                    <TaskMiniList taskList={folder.activeTasks} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Podle osob */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-indigo-600" size={20} />
            <h2 className="font-semibold text-gray-900">Podle lidí</h2>
          </div>
          <div className="space-y-2">
            {personStats.length > 0 ? (
              personStats.slice(0, 10).map((person) => {
                const isExpanded = expandedPersons.has(person.id);
                const hasActiveTasks = person.active > 0;
                
                return (
                  <div key={person.id}>
                    <button
                      onClick={() => hasActiveTasks && togglePerson(person.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        hasActiveTasks ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {hasActiveTasks ? (
                          isExpanded ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="text-gray-400">👤</span>
                        <span className="text-sm font-medium text-gray-700">{person.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-yellow-600" title="Aktivní">
                          {person.active} 📋
                        </span>
                        {person.overdue > 0 && (
                          <span className="text-red-600" title="Po termínu">
                            {person.overdue} ⚠️
                          </span>
                        )}
                        <span className="text-gray-400 w-12 text-right">
                          {person.completionRate}%
                        </span>
                      </div>
                    </button>
                    {isExpanded && person.activeTasks.length > 0 && (
                      <TaskMiniList taskList={person.activeTasks} />
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Žádní lidé s úkoly
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Nadcházející úkoly */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="text-orange-600" size={20} />
          <h2 className="font-semibold text-gray-900">Nadcházející termíny (14 dní)</h2>
        </div>
        {upcomingTasks.length > 0 ? (
          <div className="space-y-2">
            {upcomingTasks.map((task) => {
              const folder = getFolder(task.folderId);
              const owner = getPerson(task.ownerId);
              return (
                <button 
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {task.isPriority && <span className="text-red-500">❗</span>}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {folder && (
                          <span style={{ color: folder.color }}>
                            {folder.icon} {folder.name}
                          </span>
                        )}
                        {owner && <span>• {owner.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-orange-600 whitespace-nowrap ml-3">
                    {formatDate(task.dueDate!)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Žádné úkoly s termínem v příštích 14 dnech
          </p>
        )}
      </div>
    </div>
  );
}
