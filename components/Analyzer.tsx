import React, { useState, useEffect } from 'react';
import { Play, Save, FileText, Loader2, AlertCircle } from 'lucide-react';
import { SavedPrompt, AnalysisEntry } from '../types';
import { geminiService } from '../services/gemini';
import { dbService } from '../services/db';

interface AnalyzerProps {
  onSaveComplete: () => void;
}

export const Analyzer: React.FC<AnalyzerProps> = ({ onSaveComplete }) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [title, setTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const data = await dbService.getAllPrompts();
      setPrompts(data);
      if (data.length > 0) {
        setSelectedPromptId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load prompts", err);
    }
  };

  const handleRunAnalysis = async () => {
    if (!inputText.trim()) {
      setError("Please enter text to analyze.");
      return;
    }
    if (!selectedPromptId) {
      setError("Please select a prompt.");
      return;
    }

    const promptObj = prompts.find(p => p.id === selectedPromptId);
    if (!promptObj) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const output = await geminiService.analyzeText(inputText, promptObj.content);
      setResult(output);
    } catch (err) {
        console.error(err);
      setError("Failed to generate analysis. Please check your connection and API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !selectedPromptId) return;

    const promptObj = prompts.find(p => p.id === selectedPromptId);
    if (!promptObj) return;

    const newEntry: AnalysisEntry = {
      id: crypto.randomUUID(),
      title: title || `Analysis - ${new Date().toLocaleString()}`,
      originalText: inputText,
      analysis: result,
      promptId: promptObj.id,
      promptSnapshot: promptObj.content,
      timestamp: Date.now(),
    };

    await dbService.saveEntry(newEntry);
    
    // Reset form
    setInputText('');
    setResult(null);
    setTitle('');
    onSaveComplete();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">New Analysis</h2>
        <p className="text-secondary">Paste a transcript, select a prompt, and let Gemini generate insights.</p>
      </header>

      {/* Configuration Card */}
      <div className="bg-surface p-6 rounded-xl border border-white/5 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Select Prompt</label>
            <select
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary outline-none"
            >
              {prompts.length === 0 && <option value="">No prompts saved</option>}
              {prompts.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Reference Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Candidate John Doe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Transcript / Text</label>
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste interview transcript here..."
                className="w-full h-48 bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none resize-y font-mono text-sm"
            />
        </div>

        <div className="flex justify-end">
            <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || prompts.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${
                    isAnalyzing || prompts.length === 0
                    ? 'bg-secondary/20 text-gray-500 cursor-not-allowed'
                    : 'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                }`}
            >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
        </div>
        
        {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
            </div>
        )}
      </div>

      {/* Result Area */}
      {result && (
        <div className="bg-surface p-6 rounded-xl border border-white/5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent" />
                    <h3 className="text-lg font-semibold text-white">Generated Analysis</h3>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Save className="w-4 h-4" />
                    Save to Database
                </button>
            </div>
            <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed bg-background/50 p-4 rounded-lg border border-white/5">
                    {result}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};