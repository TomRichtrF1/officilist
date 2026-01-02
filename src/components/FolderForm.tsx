import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Folder } from '../db/dexie';
import { Archive } from 'lucide-react';

interface FolderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; type: string; icon: string; color: string }) => Promise<void>;
  onArchive?: () => Promise<void>;
  folder?: Folder | null;
}

const FOLDER_TYPES = [
  { value: 'COMPANY', label: 'Firma', icon: '🏢' },
  { value: 'PROJECT', label: 'Projekt', icon: '📁' },
  { value: 'PERSONAL', label: 'Osobní', icon: '🏠' },
];

const DEFAULT_COLORS = [
  '#2563EB', // blue
  '#7C3AED', // purple
  '#059669', // green
  '#EA580C', // orange
  '#DC2626', // red
  '#0891B2', // cyan
];

export function FolderForm({ isOpen, onClose, onSave, onArchive, folder }: FolderFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('PROJECT');
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (folder) {
        setName(folder.name);
        setType(folder.type);
      } else {
        setName('');
        setType('PROJECT');
      }
      setShowArchiveConfirm(false);
    }
  }, [isOpen, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const selectedType = FOLDER_TYPES.find((t) => t.value === type);
      await onSave({
        name: name.trim(),
        type,
        icon: folder?.icon || selectedType?.icon || '📁',
        color: folder?.color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      });
      onClose();
    } catch (error) {
      console.error('Error saving folder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!onArchive) return;
    
    setIsArchiving(true);
    try {
      await onArchive();
    } catch (error) {
      console.error('Error archiving folder:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={folder ? 'Upravit složku' : 'Nová složka'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Název složky"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="např. Nový projekt"
          autoFocus
          required
        />

        {!folder && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Typ složky
            </label>
            <div className="flex gap-2">
              {FOLDER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    type === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Archivace - pouze pro existující složky */}
        {folder && onArchive && (
          <div className="pt-2">
            {!showArchiveConfirm ? (
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <Archive size={16} />
                Archivovat složku
              </button>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 mb-3">
                  Opravdu chcete archivovat složku "{folder.name}"? 
                  Složka zmizí z menu, ale úkoly zůstanou zachovány.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleArchive}
                    disabled={isArchiving}
                  >
                    {isArchiving ? 'Archivuji...' : 'Ano, archivovat'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowArchiveConfirm(false)}
                  >
                    Zrušit
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving || !name.trim()}>
            {isSaving ? 'Ukládám...' : folder ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
