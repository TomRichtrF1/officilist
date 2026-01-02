import { useState } from 'react';
import { Users, Calendar, X, BarChart3, Plus, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { FolderForm } from './FolderForm';
import { Folder } from '../db/dexie';
import * as api from '../lib/api';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  const folders = useAppStore((state) => state.folders);
  const loadFolders = useAppStore((state) => state.loadFolders);
  
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Filtrovat archivované složky
  const activeFolders = folders.filter((f) => !f.isArchived);
  
  const companyFolders = activeFolders.filter((f) => f.type === 'COMPANY').sort((a, b) => a.order - b.order);
  const projectFolders = activeFolders.filter((f) => f.type === 'PROJECT').sort((a, b) => a.order - b.order);
  const personalFolders = activeFolders.filter((f) => f.type === 'PERSONAL').sort((a, b) => a.order - b.order);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    onClose();
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setIsFolderFormOpen(true);
  };

  const handleEditFolder = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setIsFolderFormOpen(true);
  };

  const handleSaveFolder = async (data: { name: string; type: string; icon: string; color: string }) => {
    if (editingFolder) {
      // Update existing folder
      await api.updateFolder(editingFolder.id, { name: data.name });
    } else {
      // Create new folder
      await api.createFolder({
        name: data.name,
        type: data.type as 'COMPANY' | 'PROJECT' | 'PERSONAL',
        icon: data.icon,
        color: data.color,
        order: folders.length + 1,
      });
    }
    // Reload folders
    await loadFolders();
  };

  const handleArchiveFolder = async (folderId: string) => {
    await api.updateFolder(folderId, { isArchived: true });
    await loadFolders();
    setIsFolderFormOpen(false);
    setEditingFolder(null);
  };

  const handleMoveFolder = async (folder: Folder, direction: 'up' | 'down', folderList: Folder[], e: React.MouseEvent) => {
    e.stopPropagation();
    
    const currentIndex = folderList.findIndex((f) => f.id === folder.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= folderList.length) return;
    
    const targetFolder = folderList[targetIndex];
    
    // Swap orders
    await api.updateFolder(folder.id, { order: targetFolder.order });
    await api.updateFolder(targetFolder.id, { order: folder.order });
    
    await loadFolders();
  };

  const FolderButton = ({ folder, folderList }: { folder: Folder; folderList: Folder[] }) => {
    const currentIndex = folderList.findIndex((f) => f.id === folder.id);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex < folderList.length - 1;
    
    return (
      <div className="group relative">
        <button
          onClick={() => handleViewChange(`folder:${folder.id}`)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            currentView === `folder:${folder.id}`
              ? 'bg-blue-50 text-blue-700'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <span className="text-lg">{folder.icon}</span>
          <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: folder.color }}
          />
        </button>
        
        {/* Ovládací prvky - zobrazí se při hoveru */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canMoveUp && (
            <button
              onClick={(e) => handleMoveFolder(folder, 'up', folderList, e)}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Posunout nahoru"
            >
              <ChevronUp size={14} className="text-gray-500" />
            </button>
          )}
          {canMoveDown && (
            <button
              onClick={(e) => handleMoveFolder(folder, 'down', folderList, e)}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Posunout dolů"
            >
              <ChevronDown size={14} className="text-gray-500" />
            </button>
          )}
          <button
            onClick={(e) => handleEditFolder(folder, e)}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Upravit složku"
          >
            <Pencil size={14} className="text-gray-500" />
          </button>
        </div>
      </div>
    );
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
            {companyFolders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Firmy</h3>
                <div className="space-y-1">
                  {companyFolders.map((folder) => (
                    <FolderButton key={folder.id} folder={folder} folderList={companyFolders} />
                  ))}
                </div>
              </div>
            )}

            {projectFolders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Projekty</h3>
                <div className="space-y-1">
                  {projectFolders.map((folder) => (
                    <FolderButton key={folder.id} folder={folder} folderList={projectFolders} />
                  ))}
                </div>
              </div>
            )}

            {personalFolders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Osobní</h3>
                <div className="space-y-1">
                  {personalFolders.map((folder) => (
                    <FolderButton key={folder.id} folder={folder} folderList={personalFolders} />
                  ))}
                </div>
              </div>
            )}

            {/* Tlačítko pro přidání složky */}
            <div className="mb-6">
              <button
                onClick={handleCreateFolder}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-dashed border-gray-300"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">Nová složka</span>
              </button>
            </div>

            <div className="border-t pt-4 space-y-1">
              <button
                onClick={() => handleViewChange('reports')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'reports'
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <BarChart3 size={20} />
                <span className="text-sm font-medium">Reporty</span>
              </button>

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

      <FolderForm
        isOpen={isFolderFormOpen}
        onClose={() => {
          setIsFolderFormOpen(false);
          setEditingFolder(null);
        }}
        onSave={handleSaveFolder}
        onArchive={editingFolder ? () => handleArchiveFolder(editingFolder.id) : undefined}
        folder={editingFolder}
      />
    </>
  );
}
