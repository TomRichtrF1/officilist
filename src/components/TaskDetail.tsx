import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Task } from '../db/dexie';
import { useAppStore } from '../stores/appStore';
import { generateMessage, MessageType, MessageChannel } from '../lib/api';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Edit, 
  Trash2, 
  Check, 
  Calendar, 
  User, 
  Link as LinkIcon, 
  Clock,
  Mail,
  MessageCircle,
  Copy,
  RefreshCw,
  X
} from 'lucide-react';

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
  const isOnline = useAppStore((state) => state.isOnline);

  // State pro generování zpráv
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>('summary');
  const [messageChannel, setMessageChannel] = useState<MessageChannel>('email');
  const [copySuccess, setCopySuccess] = useState(false);

  // State pro potvrzení změny stavu
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isWaitingModalOpen, setIsWaitingModalOpen] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState('');

  useEffect(() => {
    if (task && isOpen) {
      loadTaskHistory(task.id);
    }
  }, [task, isOpen, loadTaskHistory]);

  if (!task) return null;

  const folder = folders.find((f) => f.id === task.folderId);
  const owner = task.ownerId ? persons.find((p) => p.id === task.ownerId) : null;
  const history = taskHistory[task.id] || [];

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === task.status) return;

    setPendingStatus(newStatus);
    if (newStatus === 'CEKAJICI') {
      setWaitingForInput(task.waitingFor || '');
      setIsWaitingModalOpen(true);
    } else {
      setIsStatusConfirmOpen(true);
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    await updateTask(task.id, { status: pendingStatus as any });
    setIsStatusConfirmOpen(false);
    setPendingStatus(null);
  };

  const confirmWaitingStatus = async () => {
    if (!waitingForInput.trim()) return;
    await updateTask(task.id, {
      status: 'CEKAJICI' as any,
      waitingFor: waitingForInput.trim()
    });
    setIsWaitingModalOpen(false);
    setPendingStatus(null);
    setWaitingForInput('');
  };

  const cancelStatusChange = () => {
    setIsStatusConfirmOpen(false);
    setIsWaitingModalOpen(false);
    setPendingStatus(null);
    setWaitingForInput('');
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

  const handleGenerateMessage = async (type: MessageType, channel: MessageChannel) => {
    if (!isOnline) {
      alert('Pro generování zpráv je potřeba připojení k internetu.');
      return;
    }

    setMessageType(type);
    setMessageChannel(channel);
    setIsMessageModalOpen(true);
    setIsGenerating(true);
    setGeneratedMessage('');
    setCopySuccess(false);

    try {
      const text = await generateMessage({
        taskId: task.id,
        type,
        channel,
      });
      setGeneratedMessage(text);
    } catch (error) {
      console.error('Error generating message:', error);
      setGeneratedMessage('Chyba při generování zprávy. Zkuste to znovu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateMessage = async () => {
    setIsGenerating(true);
    setCopySuccess(false);

    try {
      const text = await generateMessage({
        taskId: task.id,
        type: messageType,
        channel: messageChannel,
      });
      setGeneratedMessage(text);
    } catch (error) {
      console.error('Error generating message:', error);
      setGeneratedMessage('Chyba při generování zprávy. Zkuste to znovu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getMessageTitle = () => {
    const typeLabel = messageType === 'summary' ? 'Shrnutí' : 'Připomenutí';
    const channelLabel = messageChannel === 'email' ? 'Email' : 'WhatsApp';
    return `${channelLabel} - ${typeLabel}`;
  };

  return (
    <>
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

          {task.status === 'CEKAJICI' && task.waitingFor && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Na co se čeká</h3>
              <p className="text-orange-600 font-medium">{task.waitingFor}</p>
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

          {/* Generování zpráv */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Generovat zprávu</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleGenerateMessage('summary', 'email')}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail size={16} />
                Email shrnutí
              </button>
              <button
                onClick={() => handleGenerateMessage('reminder', 'email')}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail size={16} />
                Email připomenutí
              </button>
              <button
                onClick={() => handleGenerateMessage('summary', 'whatsapp')}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle size={16} />
                WhatsApp shrnutí
              </button>
              <button
                onClick={() => handleGenerateMessage('reminder', 'whatsapp')}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle size={16} />
                WhatsApp připomenutí
              </button>
            </div>
            {!isOnline && (
              <p className="text-xs text-gray-500 mt-2">
                Pro generování zpráv je potřeba připojení k internetu.
              </p>
            )}
          </div>

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

      {/* Modal pro vygenerovanou zprávu */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{getMessageTitle()}</h3>
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={24} className="animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Generuji zprávu...</span>
                </div>
              ) : (
                <textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Vygenerovaná zpráva se zobrazí zde..."
                />
              )}
            </div>

            <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={handleRegenerateMessage}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                Vygenerovat znovu
              </button>

              <button
                onClick={handleCopyMessage}
                disabled={isGenerating || !generatedMessage}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  copySuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50`}
              >
                <Copy size={16} />
                {copySuccess ? 'Zkopírováno!' : 'Kopírovat text'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog pro potvrzení změny stavu */}
      {isStatusConfirmOpen && pendingStatus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Potvrdit změnu stavu</h3>
            </div>
            <div className="p-4">
              <p className="text-gray-600">
                Změnit stav z <strong>{STATUS_LABELS[task.status as keyof typeof STATUS_LABELS]}</strong> na{' '}
                <strong>{STATUS_LABELS[pendingStatus as keyof typeof STATUS_LABELS]}</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={cancelStatusChange}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Potvrdit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog pro zadání důvodu čekání */}
      {isWaitingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Změnit stav na Čekající</h3>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Na co se čeká:
              </label>
              <input
                type="text"
                value={waitingForInput}
                onChange={(e) => setWaitingForInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Zadejte důvod čekání..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={cancelStatusChange}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={confirmWaitingStatus}
                disabled={!waitingForInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Potvrdit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
