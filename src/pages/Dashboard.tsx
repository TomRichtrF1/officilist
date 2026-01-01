import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { TaskCard } from '../components/TaskCard';
import { TaskForm } from '../components/TaskForm';
import { TaskDetail } from '../components/TaskDetail';
import { Task } from '../db/dexie';
import { isTaskUrgent } from '../lib/dateUtils';

interface DashboardProps {
  folderId?: string;
}

export function Dashboard({ folderId }: DashboardProps) {
  const tasks = useAppStore((state) => state.tasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredTasks = folderId
    ? tasks.filter((t) => t.folderId === folderId)
    : tasks;

  const activeTasks = filteredTasks.filter(
    (t) => t.status !== 'HOTOVO' && t.status !== 'ZRUSEN'
  );

  const urgentTasks = activeTasks.filter((t) => isTaskUrgent(t.dueDate, t.status));
  const regularTasks = activeTasks.filter((t) => !isTaskUrgent(t.dueDate, t.status));

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleEdit = () => {
    setEditingTask(selectedTask);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="space-y-6">
      {urgentTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔴</span>
            <h2 className="text-xl font-bold text-gray-900">URGENTNÍ</h2>
            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded">
              {urgentTasks.length}
            </span>
          </div>
          <div className="grid gap-3">
            {urgentTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">ÚKOLY</h2>
        {regularTasks.length > 0 ? (
          <div className="grid gap-3">
            {regularTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Žádné aktivní úkoly</p>
          </div>
        )}
      </div>

      <TaskForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        task={editingTask}
        defaultFolderId={folderId}
      />

      <TaskDetail
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        onEdit={handleEdit}
      />
    </div>
  );
}
