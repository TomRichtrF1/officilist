import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PersonView } from './pages/PersonView';
import { CalendarView } from './pages/CalendarView';
import { Sidebar } from './components/Sidebar';
import { TaskForm } from './components/TaskForm';
import { useAppStore } from './stores/appStore';
import { isTaskUrgent } from './lib/dateUtils';
import { Menu, Plus, Wifi, WifiOff, RefreshCw } from 'lucide-react';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const tasks = useAppStore((state) => state.tasks);
  const isOnline = useAppStore((state) => state.isOnline);
  const isSyncing = useAppStore((state) => state.isSyncing);
  const syncWithServer = useAppStore((state) => state.syncWithServer);

  const urgentTaskCount = tasks.filter((t) =>
    isTaskUrgent(t.dueDate, t.status)
  ).length;

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

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
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
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                  {urgentTaskCount}
                </span>
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
