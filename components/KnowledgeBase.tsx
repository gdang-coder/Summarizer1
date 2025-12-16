import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, ChevronDown, ChevronUp, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { AnalysisEntry, ChatMessage } from '../types';
import { dbService } from '../services/db';
import { geminiService } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

export const KnowledgeBase: React.FC = () => {
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // LLM Chat State
  const [chatQuery, setChatQuery] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadEntries = async () => {
    try {
      const data = await dbService.getAllEntries();
      setEntries(data);
    } catch (err) {
      console.error("Failed to load entries", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this entry?")) {
      await dbService.deleteEntry(id);
      await loadEntries();
    }
  };

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: chatQuery, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setIsChatting(true);
    setChatQuery('');

    try {
        // Send request to Gemini
        const responseText = await geminiService.searchDatabase(userMsg.text, entries);
        const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
        setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
        setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error searching your database.", timestamp: Date.now() }]);
    } finally {
        setIsChatting(false);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.analysis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] flex gap-6">
      
      {/* Left Column: List of Entries */}
      <div className="w-2/3 flex flex-col gap-4 overflow-hidden h-full">
        <div className="flex-shrink-0">
            <h2 className="text-2xl font-bold text-white mb-4">Knowledge Base</h2>
            <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
                type="text"
                placeholder="Filter by keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-primary outline-none"
            />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {filteredEntries.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-surface/50 rounded-xl border border-dashed border-white/10">
                    <p>No entries found.</p>
                </div>
            )}
            {filteredEntries.map(entry => (
            <div 
                key={entry.id} 
                className="bg-surface rounded-xl border border-white/5 overflow-hidden transition-all hover:border-white/10"
            >
                <div className="flex items-stretch">
                    <div 
                        className="flex-1 p-4 cursor-pointer hover:bg-white/5 transition-colors min-w-0"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-white truncate">{entry.title}</h3>
                            <span className="text-xs text-gray-500 bg-background px-2 py-0.5 rounded-full">
                                {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate mt-1">{entry.analysis.substring(0, 100)}...</p>
                    </div>

                    <div className="flex items-center px-3 border-l border-white/5 bg-surface/50 gap-2">
                        <button 
                            type="button"
                            onClick={(e) => handleDelete(entry.id, e)}
                            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors p-2 rounded-lg"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            className="text-gray-500 hover:text-white transition-colors p-2"
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        >
                            {expandedId === entry.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {expandedId === entry.id && (
                <div className="p-4 border-t border-white/10 bg-background/50 text-sm">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <h4 className="text-accent font-medium mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> AI Analysis
                            </h4>
                            <div className="prose prose-invert max-w-none text-gray-300 text-sm whitespace-pre-wrap">
                                {entry.analysis}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-secondary font-medium mb-2">Original Transcript Excerpt</h4>
                            <div className="bg-background p-3 rounded border border-white/5 text-gray-500 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                                {entry.originalText}
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
            ))}
        </div>
      </div>

      {/* Right Column: LLM Search */}
      <div className="w-1/3 flex flex-col bg-surface rounded-xl border border-white/5 shadow-xl h-full">
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-white">Ask your Data</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Ask questions about your saved interviews. e.g., "What are the common strengths?"</p>
                </div>
            )}
            {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-lg p-3 text-sm ${
                        msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-background border border-white/10 text-gray-200 rounded-bl-none'
                    }`}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                </div>
            ))}
            {isChatting && (
                <div className="flex justify-start">
                    <div className="bg-background border border-white/10 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-75" />
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-150" />
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5">
            <form onSubmit={handleSmartSearch} className="relative">
                <input
                    type="text"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={isChatting}
                    className="w-full bg-background border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm text-white focus:ring-2 focus:ring-accent outline-none disabled:opacity-50"
                />
                <button 
                    type="submit" 
                    disabled={isChatting || !chatQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded-md transition-colors disabled:opacity-0"
                >
                    <Sparkles className="w-4 h-4" />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};