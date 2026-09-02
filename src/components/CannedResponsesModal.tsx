import React, { useState } from 'react';
import { Zap, X, Plus, Search, Check, Copy } from 'lucide-react';
import { CannedResponse } from '../types';

interface CannedResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cannedResponses: CannedResponse[];
  onSelectResponse: (content: string) => void;
  onAddResponse: (resp: CannedResponse) => void;
}

export const CannedResponsesModal: React.FC<CannedResponsesModalProps> = ({
  isOpen,
  onClose,
  cannedResponses,
  onSelectResponse,
  onAddResponse
}) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Ventas');

  if (!isOpen) return null;

  const filtered = cannedResponses.filter(
    c =>
      c.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcut.trim() || !content.trim()) return;

    const newResp: CannedResponse = {
      id: `canned_${Date.now()}`,
      shortcut: shortcut.startsWith('/') ? shortcut : `/${shortcut}`,
      title: title || shortcut,
      content,
      category
    };

    onAddResponse(newResp);
    setShowAddForm(false);
    setShortcut('');
    setTitle('');
    setContent('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-5 space-y-4 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Respuestas Rápidas & Plantillas</h3>
              <p className="text-xs text-slate-400">Inserta respuestas predefinidas con 1 clic o escribiendo el atajo.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Add New Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por atajo /ejemplo o texto..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancelar' : 'Nueva Plantilla'}</span>
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Atajo (ej. /precios):</label>
                <input
                  type="text"
                  required
                  placeholder="/atajo"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Título:</label>
                <input
                  type="text"
                  placeholder="ej. Precios y Planes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Categoría:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                >
                  <option value="Ventas">Ventas</option>
                  <option value="Soporte">Soporte</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Texto de la Respuesta:</label>
              <textarea
                required
                rows={3}
                placeholder="Escribe el mensaje completo que se enviará..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Guardar Respuesta
              </button>
            </div>
          </form>
        )}

        {/* Responses List */}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {filtered.map((resp) => (
            <div
              key={resp.id}
              onClick={() => {
                onSelectResponse(resp.content);
                onClose();
              }}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/30">
                    {resp.shortcut}
                  </span>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                    {resp.title}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {resp.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                {resp.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
