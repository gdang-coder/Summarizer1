import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Download, Upload } from 'lucide-react';
import { SavedPrompt } from '../types';
import { dbService } from '../services/db';

export const PromptManager: React.FC = () => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Partial<SavedPrompt>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const data = await dbService.getAllPrompts();
      setPrompts(data);
    } catch (err) {
      console.error("Failed to load prompts", err);
    }
  };

  const handleEdit = (prompt?: SavedPrompt) => {
    if (prompt) {
      setCurrentPrompt(prompt);
    } else {
      setCurrentPrompt({ title: '', content: '' });
    }
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this prompt template?")) {
      await dbService.deletePrompt(id);
      loadPrompts();
    }
  };

  const handleSave = async () => {
    if (!currentPrompt.title || !currentPrompt.content) return;

    const promptToSave: SavedPrompt = {
      id: currentPrompt.id || crypto.randomUUID(),
      title: currentPrompt.title,
      content: currentPrompt.content,
      createdAt: currentPrompt.createdAt || Date.now(),
    };

    await dbService.savePrompt(promptToSave);
    setIsEditing(false);
    loadPrompts();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(prompts, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const importedPrompts = JSON.parse(json) as SavedPrompt[];
        
        if (!Array.isArray(importedPrompts)) throw new Error("Invalid format");
        
        let count = 0;
        for (const p of importedPrompts) {
          if (p.title && p.content) {
             // Ensure ID exists or generate new one to avoid collision if needed, 
             // but strictly we just overwrite or add.
             const pToSave = { ...p, id: p.id || crypto.randomUUID() };
             await dbService.savePrompt(pToSave);
             count++;
          }
        }
        alert(`Successfully imported ${count} prompts.`);
        loadPrompts();
      } catch (err) {
        alert("Failed to import. Please check the file format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white">Prompt Templates</h2>
            <p className="text-secondary">Manage the instructions used to analyze transcripts.</p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                className="hidden" 
                accept=".json"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors text-sm"
                title="Import Prompts"
            >
                <Upload className="w-4 h-4" />
                Import
            </button>
            <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors text-sm"
                title="Export Prompts"
            >
                <Download className="w-4 h-4" />
                Export
            </button>
            <button
            onClick={() => handleEdit()}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20 font-medium"
            >
            <Plus className="w-4 h-4" />
            New Prompt
            </button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{currentPrompt.id ? 'Edit Prompt' : 'Create Prompt'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={currentPrompt.title}
                  onChange={(e) => setCurrentPrompt({ ...currentPrompt, title: e.target.value })}
                  className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g., SWOT Analysis"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Instruction</label>
                <textarea
                  value={currentPrompt.content}
                  onChange={(e) => setCurrentPrompt({ ...currentPrompt, content: e.target.value })}
                  className="w-full h-40 bg-background border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary outline-none resize-none"
                  placeholder="e.g., Identify the candidate's top 3 strengths and 1 major weakness based on this text."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!currentPrompt.title || !currentPrompt.content}
                className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prompts.map(prompt => (
          <div key={prompt.id} className="bg-surface p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-white">{prompt.title}</h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(prompt)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(prompt.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
              {prompt.content}
            </p>
          </div>
        ))}
        {prompts.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-surface/50 rounded-xl border border-dashed border-white/10">
                <p>No prompt templates found. Create one to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
};