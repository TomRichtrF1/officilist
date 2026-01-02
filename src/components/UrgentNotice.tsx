import { X, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Task } from '../db/dexie';
import { useAppStore } from '../stores/appStore';
import { isTaskUrgent } from '../lib/dateUtils';

interface UrgentNoticeProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

export function UrgentNotice({ isOpen, onClose, onTaskClick }: UrgentNoticeProps) {
  const tasks = useAppStore((state) => state.tasks);
  const folders = useAppStore((state) => state.folders);
  const persons = useAppStore((state) => state.persons);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Úkoly po termínu
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'HOTOVO' || t.status === 'ZRUSEN' || !t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  // Úkoly s blížícím se termínem (do 3 pracovních dnů, ale ne po termínu)
  const upcomingTasks = tasks.filter((t) => {
    if (t.status === 'HOTOVO' || t.status === 'ZRUSEN' || !t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) return false; // Není po termínu
    return isTaskUrgent(t.dueDate, t.status);
  });

  const totalUrgent = overdueTasks.length + upcomingTasks.length;

  // Pokud nejsou žádné urgentní úkoly, nezobrazovat
  if (totalUrgent === 0) {
    return null;
  }

  const getFolder = (folderId: string) => folders.find((f) => f.id === folderId);
  const getPerson = (ownerId: string | null | undefined) => 
    ownerId ? persons.find((p) => p.id === ownerId) : null;

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'den' : 'dny'} po termínu`;
    } else if (diffDays === 0) {
      return 'Dnes';
    } else if (diffDays === 1) {
      return 'Zítra';
    } else {
      return `Za ${diffDays} ${diffDays < 5 ? 'dny' : 'dní'}`;
    }
  };

  const TaskItem = ({ task }: { task: Task }) => {
    const folder = getFolder(task.folderId);
    const owner = getPerson(task.ownerId);
    const isOverdue = task.dueDate && new Date(task.dueDate) < today;

    return (
      <button
        onClick={() => {
          onTaskClick(task);
          onClose();
        }}
        className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {task.isPriority && <span className="text-red-500">❗</span>}
              <span className="font-medium text-gray-900 truncate">{task.title}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {folder && (
                <span style={{ color: folder.color }}>
                  {folder.icon} {folder.name}
                </span>
              )}
              {owner && <span>👤 {owner.name}</span>}
            </div>
          </div>
          <div className={`text-sm font-medium whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
            {task.dueDate && formatDueDate(task.dueDate)}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Vyžaduje pozornost</h2>
              <p className="text-sm text-gray-600">{totalUrgent} urgentních úkolů</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Po termínu */}
          {overdueTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-red-500" />
                <h3 className="font-semibold text-red-700">
                  Po termínu ({overdueTasks.length})
                </h3>
              </div>
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Blíží se termín */}
          {upcomingTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={18} className="text-orange-500" />
                <h3 className="font-semibold text-orange-700">
                  Blíží se termín ({upcomingTasks.length})
                </h3>
              </div>
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Rozumím, zavřít
          </button>
        </div>
      </div>
    </div>
  );
}
