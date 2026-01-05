import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { Task } from '../db/dexie';
import { useAppStore } from '../stores/appStore';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultFolderId?: string;
}

export function TaskForm({ isOpen, onClose, task, defaultFolderId }: TaskFormProps) {
  const folders = useAppStore((state) => state.folders);
  const persons = useAppStore((state) => state.persons);
  const createTask = useAppStore((state) => state.createTask);
  const updateTask = useAppStore((state) => state.updateTask);

  const [showMore, setShowMore] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || '',
    folderId: task?.folderId || defaultFolderId || folders[0]?.id || '',
    type: task?.type || 'TASK',
    ownerId: task?.ownerId || '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    isPriority: task?.isPriority || false,
    description: task?.description || '',
    url: task?.url || '',
    reminderType: task?.reminderDate ? 'date' : task?.reminderDaysBefore ? 'days' : 'none',
    reminderDate: task?.reminderDate ? task.reminderDate.split('T')[0] : '',
    reminderTime: task?.reminderDate ? task.reminderDate.split('T')[1]?.slice(0, 5) || '09:00' : '09:00',
    reminderDaysBefore: task?.reminderDaysBefore?.toString() || '3',
  });

  // Synchronizace folderId když se načtou složky
  useEffect(() => {
    if (!formData.folderId && folders.length > 0 && !task) {
      setFormData(prev => ({ ...prev, folderId: defaultFolderId || folders[0].id }));
    }
  }, [folders, defaultFolderId, task]);

  // Reset formuláře při otevření
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Editace existujícího úkolu
        setFormData({
          title: task.title || '',
          folderId: task.folderId || defaultFolderId || folders[0]?.id || '',
          type: task.type || 'TASK',
          ownerId: task.ownerId || '',
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
          isPriority: task.isPriority || false,
          description: task.description || '',
          url: task.url || '',
          reminderType: task.reminderDate ? 'date' : task.reminderDaysBefore ? 'days' : 'none',
          reminderDate: task.reminderDate ? task.reminderDate.split('T')[0] : '',
          reminderTime: task.reminderDate ? task.reminderDate.split('T')[1]?.slice(0, 5) || '09:00' : '09:00',
          reminderDaysBefore: task.reminderDaysBefore?.toString() || '3',
        });
      } else {
        // Nový úkol - prázdný formulář
        setFormData({
          title: '',
          folderId: defaultFolderId || folders[0]?.id || '',
          type: 'TASK',
          ownerId: '',
          dueDate: '',
          isPriority: false,
          description: '',
          url: '',
          reminderType: 'none',
          reminderDate: '',
          reminderTime: '09:00',
          reminderDaysBefore: '3',
        });
      }
      setShowMore(false);
    }
  }, [isOpen, task, defaultFolderId, folders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) return;

    // Připravit reminder data
    let reminderDate: string | undefined;
    let reminderDaysBefore: number | undefined;

    if (formData.reminderType === 'date' && formData.reminderDate) {
      const dateTime = `${formData.reminderDate}T${formData.reminderTime || '09:00'}:00`;
      reminderDate = new Date(dateTime).toISOString();
    } else if (formData.reminderType === 'days' && formData.reminderDaysBefore) {
      reminderDaysBefore = parseInt(formData.reminderDaysBefore, 10);
    }

    const taskData = {
      title: formData.title.trim(),
      folderId: formData.folderId,
      type: formData.type as 'TASK' | 'NOTE',
      ownerId: formData.ownerId || undefined,
      status: (task?.status || 'NOVY') as any,
      isPriority: formData.isPriority,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      description: formData.description.trim() || undefined,
      url: formData.url.trim() || undefined,
      reminderDate,
      reminderDaysBefore,
    };

    if (task) {
      await updateTask(task.id, taskData);
    } else {
      await createTask(taskData);
    }

    onClose();
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Upravit úkol' : 'Nový úkol'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Název"
          required
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Zadejte název úkolu"
          autoFocus
        />

        <Select
          label="Složka"
          value={formData.folderId}
          onChange={(e) => handleChange('folderId', e.target.value)}
          options={folders.map((f) => ({ value: f.id, label: `${f.icon} ${f.name}` }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vlastník
            </label>
            <select
              value={formData.ownerId}
              onChange={(e) => handleChange('ownerId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">👤 Vybrat</option>
              {persons
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <Input
            type="date"
            label="Termín"
            value={formData.dueDate}
            onChange={(e) => handleChange('dueDate', e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="TASK"
                checked={formData.type === 'TASK'}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Úkol</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="NOTE"
                checked={formData.type === 'NOTE'}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Poznámka</span>
            </label>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPriority}
              onChange={(e) => handleChange('isPriority', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-gray-700">❗ Prioritní</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Více možností
        </button>

        {showMore && (
          <div className="space-y-4 pt-2">
            {/* Připomenutí */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700">
                🔔 Připomenutí
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reminderType"
                    value="none"
                    checked={formData.reminderType === 'none'}
                    onChange={(e) => handleChange('reminderType', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Žádné</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reminderType"
                    value="days"
                    checked={formData.reminderType === 'days'}
                    onChange={(e) => handleChange('reminderType', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Dní před termínem</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reminderType"
                    value="date"
                    checked={formData.reminderType === 'date'}
                    onChange={(e) => handleChange('reminderType', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Konkrétní datum</span>
                </label>
              </div>

              {formData.reminderType === 'days' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.reminderDaysBefore}
                    onChange={(e) => handleChange('reminderDaysBefore', e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">pracovních dní před termínem</span>
                </div>
              )}

              {formData.reminderType === 'date' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    label="Datum"
                    value={formData.reminderDate}
                    onChange={(e) => handleChange('reminderDate', e.target.value)}
                  />
                  <Input
                    type="time"
                    label="Čas"
                    value={formData.reminderTime}
                    onChange={(e) => handleChange('reminderTime', e.target.value)}
                  />
                </div>
              )}
            </div>

            <Textarea
              label="Popis"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              placeholder="Podrobný popis úkolu..."
            />

            <Input
              type="url"
              label="Odkaz URL"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" variant="primary">
            ✓ Uložit
          </Button>
        </div>
      </form>
    </Modal>
  );
}
