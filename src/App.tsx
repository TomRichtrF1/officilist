import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PersonView } from './pages/PersonView';
import { CalendarView } from './pages/CalendarView';
import { ReportsView } from './pages/ReportsView';
import { Sidebar } from './components/Sidebar';
import { TaskForm } from './components/TaskForm';
import { TaskDetail } from './components/TaskDetail';
import { UrgentNotice } from './components/UrgentNotice';
import { useAppStore } from './stores/appStore';
import { isTaskUrgent } from './lib/dateUtils';
import { Task } from './db/dexie';
import { Menu, Plus, Wifi, WifiOff, RefreshCw } from 'lucide-react';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [showUrgentNotice, setShowUrgentNotice] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const tasks = useAppStore((state) => state.tasks);
  const isOnline = useAppStore((state) => state.isOnline);
  const isSyncing = useAppStore((state) => state.isSyncing);
  const syncWithServer = useAppStore((state) => state.syncWithServer);

  const urgentTaskCount = tasks.filter((t) =>
    isTaskUrgent(t.dueDate, t.status)
  ).length;

  // Zobrazit UrgentNotice při prvním načtení po přihlášení
  useEffect(() => {
    if (isAuthenticated && tasks.length > 0) {
      const hasUrgent = tasks.some((t) => 
        isTaskUrgent(t.dueDate, t.status) && t.status !== 'HOTOVO' && t.status !== 'ZRUSEN'
      );
      if (hasUrgent) {
        // Zobrazit pouze jednou za session
        const alreadyShown = sessionStorage.getItem('urgentNoticeShown');
        if (!alreadyShown) {
          setShowUrgentNotice(true);
          sessionStorage.setItem('urgentNoticeShown', 'true');
        }
      }
    }
  }, [isAuthenticated, tasks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsNewTaskOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
    if (currentView === 'reports') {
      return <ReportsView onTaskClick={handleTaskClick} />;
    }
    if (currentView === 'persons') {
      return <PersonView />;
    }
    if (currentView === 'calendar') {
      return <CalendarView />;
    }
    if (currentView.startsWith('folder:')) {
      const folderId = currentView.split(':')[1];
      return <Dashboard folderId={folderId} />;
    }
    return <Dashboard />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Officilist</h1>
              {urgentTaskCount > 0 && (
                <button
                  onClick={() => setShowUrgentNotice(true)}
                  className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition-colors"
                >
                  {urgentTaskCount}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isSyncing ? (
                  <RefreshCw size={18} className="text-yellow-500 animate-spin" />
                ) : isOnline ? (
                  <Wifi size={18} className="text-green-500" />
                ) : (
                  <WifiOff size={18} className="text-red-500" />
                )}
                <span className="text-xs text-gray-600 hidden sm:inline">
                  {isSyncing ? 'Synchronizace...' : isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {isOnline && !isSyncing && (
                <button
                  onClick={() => syncWithServer()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Synchronizovat"
                >
                  <RefreshCw size={18} className="text-gray-600" />
                </button>
              )}

              <button
                onClick={() => setIsNewTaskOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nový</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      <TaskForm
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        defaultFolderId={currentView.startsWith('folder:') ? currentView.split(':')[1] : undefined}
      />

      <UrgentNotice
        isOpen={showUrgentNotice}
        onClose={() => setShowUrgentNotice(false)}
        onTaskClick={handleTaskClick}
      />

      <TaskDetail
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onEdit={() => {
          setIsDetailOpen(false);
          setIsNewTaskOpen(true);
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
