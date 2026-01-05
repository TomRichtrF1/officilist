import { Calendar, User } from 'lucide-react';
import { Task } from '../db/dexie';
import { useAppStore } from '../stores/appStore';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const folders = useAppStore((state) => state.folders);
  const persons = useAppStore((state) => state.persons);

  const folder = folders.find((f) => f.id === task.folderId);
  const owner = task.ownerId ? persons.find((p) => p.id === task.ownerId) : null;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {task.isPriority && (
          <span className="text-red-500 text-lg shrink-0">❗</span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 mb-2">{task.title}</h3>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {folder && (
              <div className="flex items-center gap-1.5">
                <span>{folder.icon}</span>
                <span className="truncate">{folder.name}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: folder.color }}
                />
              </div>
            )}

            {owner && (
              <div className="flex items-center gap-1.5">
                <User size={14} />
                <span className="truncate">{owner.name}</span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{format(new Date(task.dueDate), 'd. M. yyyy', { locale: cs })}</span>
              </div>
            )}
          </div>

          {task.status === 'CEKAJICI' && task.waitingFor && (
            <div className="mt-2 text-sm text-orange-600 font-medium">
              ⏳ Čeká na: {task.waitingFor}
            </div>
          )}

          {task.description && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
