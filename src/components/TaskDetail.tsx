import { useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Task } from '../db/dexie';
import { useAppStore } from '../stores/appStore';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Edit, Trash2, Check, Calendar, User, Link as LinkIcon, Clock } from 'lucide-react';

interface TaskDetailProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const STATUS_LABELS = {
  NOVY: 'Nový',
  ZADANY: 'Zadaný',
  CEKAJICI: 'Čekající',
  HOTOVO: 'Hotovo',
  ZRUSEN: 'Zrušen',
};

const STATUS_COLORS = {
  NOVY: 'bg-blue-100 text-blue-800',
  ZADANY: 'bg-yellow-100 text-yellow-800',
  CEKAJICI: 'bg-orange-100 text-orange-800',
  HOTOVO: 'bg-green-100 text-green-800',
  ZRUSEN: 'bg-gray-100 text-gray-800',
};

export function TaskDetail({ task, isOpen, onClose, onEdit }: TaskDetailProps) {
  const folders = useAppStore((state) => state.folders);
  const persons = useAppStore((state) => state.persons);
  const taskHistory = useAppStore((state) => state.taskHistory);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const loadTaskHistory = useAppStore((state) => state.loadTaskHistory);

  useEffect(() => {
    if (task && isOpen) {
      loadTaskHistory(task.id);
    }
  }, [task, isOpen, loadTaskHistory]);

  if (!task) return null;

  const folder = folders.find((f) => f.id === task.folderId);
  const owner = task.ownerId ? persons.find((p) => p.id === task.ownerId) : null;
  const history = taskHistory[task.id] || [];

  const handleStatusChange = async (newStatus: string) => {
    await updateTask(task.id, { status: newStatus as any });
  };

  const handleComplete = async () => {
    await updateTask(task.id, { status: 'HOTOVO' });
  };

  const handleDelete = async () => {
    if (window.confirm('Opravdu chcete smazat tento úkol?')) {
      await deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail úkolu" size="lg">
      <div className="space-y-6">
        <div>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex-1">{task.title}</h2>
            {task.isPriority && <span className="text-2xl">❗</span>}
          </div>

          <div className="flex flex-wrap gap-3">
            {folder && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <span>{folder.icon}</span>
                <span className="text-sm font-medium">{folder.name}</span>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
              </div>
            )}

            {owner && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <User size={16} />
                <span className="text-sm font-medium">{owner.name}</span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <Calendar size={16} />
                <span className="text-sm font-medium">
                  {format(new Date(task.dueDate), 'd. MMMM yyyy', { locale: cs })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Stav</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleStatusChange(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  task.status === key
                    ? STATUS_COLORS[key as keyof typeof STATUS_COLORS]
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Popis</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {task.url && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Odkaz</h3>
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <LinkIcon size={16} />
              <span className="text-sm break-all">{task.url}</span>
            </a>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Clock size={16} />
              Historie změn
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history
                .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                .map((h) => (
                  <div key={h.id} className="text-sm p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{h.field}</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(h.changedAt), 'd. M. yyyy HH:mm', { locale: cs })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      {h.oldValue && (
                        <>
                          <span className="line-through">{h.oldValue}</span>
                          <span>→</span>
                        </>
                      )}
                      <span className="font-medium">{h.newValue}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="danger" onClick={handleDelete} size="sm">
            <Trash2 size={16} className="mr-2" />
            Smazat
          </Button>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEdit} size="sm">
              <Edit size={16} className="mr-2" />
              Upravit
            </Button>

            {task.status !== 'HOTOVO' && (
              <Button variant="primary" onClick={handleComplete} size="sm">
                <Check size={16} className="mr-2" />
                Hotovo
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
