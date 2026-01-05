import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { TaskCard } from '../components/TaskCard';
import { TaskDetail } from '../components/TaskDetail';
import { Task } from '../db/dexie';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';

export function CalendarView() {
  const tasks = useAppStore((state) => state.tasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Získat aktuální verzi vybraného tasku ze store pro reaktivitu
  const currentTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) || null : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const tasksWithDates = tasks.filter((t) => t.dueDate);

  const getTasksForDate = (date: Date) => {
    return tasksWithDates.filter((t) =>
      t.dueDate && isSameDay(new Date(t.dueDate), date)
    );
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kalendář</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentMonth, 'LLLL yyyy', { locale: cs })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`padding-${i}`} className="aspect-square border-b border-r bg-gray-50" />
          ))}

          {daysInMonth.map((day) => {
            const dayTasks = getTasksForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`aspect-square border-b border-r p-2 hover:bg-gray-50 transition-colors ${
                  !isSameMonth(day, currentMonth) ? 'text-gray-400' : ''
                } ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''} ${
                  isToday ? 'font-bold' : ''
                }`}
              >
                <div className="text-sm mb-1">{format(day, 'd')}</div>
                {dayTasks.length > 0 && (
                  <div className="flex justify-center gap-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.isPriority ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Úkoly pro {format(selectedDate, 'd. MMMM yyyy', { locale: cs })}
          </h2>
          {selectedDateTasks.length > 0 ? (
            <div className="space-y-3">
              {selectedDateTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Žádné úkoly pro tento den</p>
          )}
        </div>
      )}

      <TaskDetail
        task={currentTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onEdit={() => {}}
      />
    </div>
  );
}
