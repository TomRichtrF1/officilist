import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Person } from '../db/dexie';
import { Archive } from 'lucide-react';

interface PersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email?: string; phone?: string }) => Promise<void>;
  onArchive?: () => Promise<void>;
  person?: Person | null;
}

export function PersonForm({ isOpen, onClose, onSave, onArchive, person }: PersonFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (person) {
        setName(person.name);
        setEmail(person.email || '');
        setPhone(person.phone || '');
      } else {
        setName('');
        setEmail('');
        setPhone('');
      }
      setShowArchiveConfirm(false);
    }
  }, [isOpen, person]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!onArchive) return;

    setIsArchiving(true);
    try {
      await onArchive();
      onClose();
    } catch (error) {
      console.error('Error deactivating person:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={person ? 'Upravit osobu' : 'Přidat osobu'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Jméno"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zadejte jméno"
          autoFocus
        />

        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />

        <Input
          type="tel"
          label="Telefon"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+420 123 456 789"
        />

        {person && onArchive && (
          <div className="pt-2">
            {!showArchiveConfirm ? (
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <Archive size={16} />
                Deaktivovat osobu
              </button>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 mb-3">
                  Opravdu chcete deaktivovat osobu "{person.name}"?
                  Osoba zmizí ze seznamu, ale úkoly zůstanou zachovány.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleArchive}
                    disabled={isArchiving}
                  >
                    {isArchiving ? 'Deaktivuji...' : 'Ano, deaktivovat'}
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
            {isSaving ? 'Ukládám...' : person ? 'Uložit' : 'Přidat'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
