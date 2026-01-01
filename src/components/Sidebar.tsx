import { Users, Calendar, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  const folders = useAppStore((state) => state.folders);

  const companyFolders = folders.filter((f) => f.type === 'COMPANY').sort((a, b) => a.order - b.order);
  const projectFolders = folders.filter((f) => f.type === 'PROJECT').sort((a, b) => a.order - b.order);
  const personalFolders = folders.filter((f) => f.type === 'PERSONAL').sort((a, b) => a.order - b.order);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b lg:hidden flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Menu</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Firmy</h3>
              <div className="space-y-1">
                {companyFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleViewChange(`folder:${folder.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentView === `folder:${folder.id}`
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{folder.icon}</span>
                    <span className="text-sm font-medium truncate">{folder.name}</span>
                    <div
                      className="w-2 h-2 rounded-full ml-auto"
                      style={{ backgroundColor: folder.color }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Projekty</h3>
              <div className="space-y-1">
                {projectFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleViewChange(`folder:${folder.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentView === `folder:${folder.id}`
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{folder.icon}</span>
                    <span className="text-sm font-medium truncate">{folder.name}</span>
                    <div
                      className="w-2 h-2 rounded-full ml-auto"
                      style={{ backgroundColor: folder.color }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Osobní</h3>
              <div className="space-y-1">
                {personalFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleViewChange(`folder:${folder.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentView === `folder:${folder.id}`
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{folder.icon}</span>
                    <span className="text-sm font-medium truncate">{folder.name}</span>
                    <div
                      className="w-2 h-2 rounded-full ml-auto"
                      style={{ backgroundColor: folder.color }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-1">
              <button
                onClick={() => handleViewChange('persons')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'persons'
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Users size={20} />
                <span className="text-sm font-medium">Lidé</span>
              </button>

              <button
                onClick={() => handleViewChange('calendar')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'calendar'
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Calendar size={20} />
                <span className="text-sm font-medium">Kalendář</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
