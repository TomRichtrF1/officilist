import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { TaskCard } from '../components/TaskCard';
import { TaskDetail } from '../components/TaskDetail';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Task } from '../db/dexie';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';

export function PersonView() {
  const persons = useAppStore((state) => state.persons);
  const tasks = useAppStore((state) => state.tasks);
  const createPerson = useAppStore((state) => state.createPerson);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  // Získat aktuální verzi vybraného tasku ze store pro reaktivitu
  const currentTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) || null : null;

  const [newPersonData, setNewPersonData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const filteredPersons = persons
    .filter((p) => p.isActive)
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const togglePerson = (personId: string) => {
    const newExpanded = new Set(expandedPersons);
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId);
    } else {
      newExpanded.add(personId);
    }
    setExpandedPersons(newExpanded);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonData.name.trim()) return;

    await createPerson({
      name: newPersonData.name.trim(),
      email: newPersonData.email.trim() || undefined,
      phone: newPersonData.phone.trim() || undefined,
      isActive: true,
    });

    setNewPersonData({ name: '', email: '', phone: '' });
    setIsAddPersonOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lidé</h1>
        <Button variant="primary" size="sm" onClick={() => setIsAddPersonOpen(true)}>
          <Plus size={16} className="mr-2" />
          Přidat osobu
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Hledat osobu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        {filteredPersons.map((person) => {
          const personTasks = tasks.filter(
            (t) => t.ownerId === person.id && t.status !== 'HOTOVO' && t.status !== 'ZRUSEN'
          );
          const isExpanded = expandedPersons.has(person.id);

          return (
            <div key={person.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => togglePerson(person.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{person.name}</h3>
                    {(person.email || person.phone) && (
                      <p className="text-sm text-gray-500">
                        {person.email} {person.email && person.phone && '•'} {person.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">
                    {personTasks.length} {personTasks.length === 1 ? 'úkol' : 'úkolů'}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 bg-gray-50 border-t space-y-3">
                  {personTasks.length > 0 ? (
                    personTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">Žádné aktivní úkoly</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredPersons.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Žádné osoby nenalezeny</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        title="Přidat osobu"
        size="md"
      >
        <form onSubmit={handleAddPerson} className="space-y-4">
          <Input
            label="Jméno"
            required
            value={newPersonData.name}
            onChange={(e) => setNewPersonData({ ...newPersonData, name: e.target.value })}
            placeholder="Zadejte jméno"
            autoFocus
          />

          <Input
            type="email"
            label="Email"
            value={newPersonData.email}
            onChange={(e) => setNewPersonData({ ...newPersonData, email: e.target.value })}
            placeholder="email@example.com"
          />

          <Input
            type="tel"
            label="Telefon"
            value={newPersonData.phone}
            onChange={(e) => setNewPersonData({ ...newPersonData, phone: e.target.value })}
            placeholder="+420 123 456 789"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsAddPersonOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" variant="primary">
              Přidat
            </Button>
          </div>
        </form>
      </Modal>

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
