import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import { dbService } from './services/db';
import { Analyzer } from './components/Analyzer';
import { KnowledgeBase } from './components/KnowledgeBase';
import { PromptManager } from './components/PromptManager';
import { LayoutDashboard, Database, Settings, BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.ANALYZER);
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    const init = async () => {
      await dbService.init();
      
      // Seed a default prompt if none exist
      const prompts = await dbService.getAllPrompts();
      if (prompts.length === 0) {
        await dbService.savePrompt({
          id: crypto.randomUUID(),
          title: "General Summary",
          content: "Summarize the following text. Highlight key points, main arguments, and any actionable insights.",
          createdAt: Date.now()
        });
      }
      setIsInit(true);
    };
    init();
  }, []);

  if (!isInit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
            <BrainCircuit className="w-12 h-12 text-primary animate-pulse" />
            <span className="font-medium text-gray-400">Initializing Database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-gray-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-surface border-r border-white/5 flex flex-col fixed h-full z-10 transition-all duration-300">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
            <BrainCircuit className="w-8 h-8 text-primary" />
            <span className="ml-3 font-bold text-xl tracking-tight hidden lg:block text-white">InsightVault</span>
        </div>

        <nav className="flex-1 py-8 flex flex-col gap-2 px-3">
          <NavButton 
            active={view === ViewState.ANALYZER} 
            onClick={() => setView(ViewState.ANALYZER)}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Analyzer"
          />
          <NavButton 
            active={view === ViewState.DATABASE} 
            onClick={() => setView(ViewState.DATABASE)}
            icon={<Database className="w-5 h-5" />}
            label="Knowledge Base"
          />
          <NavButton 
            active={view === ViewState.PROMPTS} 
            onClick={() => setView(ViewState.PROMPTS)}
            icon={<Settings className="w-5 h-5" />}
            label="Prompts"
          />
        </nav>

        <div className="p-4 border-t border-white/5">
            <div className="bg-gradient-to-br from-primary/20 to-accent/10 rounded-lg p-4 hidden lg:block">
                <h4 className="font-semibold text-sm text-white mb-1">Pro Tip</h4>
                <p className="text-xs text-gray-400">Use the Knowledge Base to chat with your saved interviews using AI.</p>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 lg:ml-64 p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto h-full">
            {view === ViewState.ANALYZER && (
            <Analyzer onSaveComplete={() => setView(ViewState.DATABASE)} />
            )}
            {view === ViewState.DATABASE && (
            <KnowledgeBase />
            )}
            {view === ViewState.PROMPTS && (
            <PromptManager />
            )}
        </div>
      </main>
    </div>
  );
};

// Helper for nav buttons
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-primary text-white shadow-lg shadow-blue-500/20' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className={`${!active && 'group-hover:scale-110'} transition-transform duration-200`}>
        {icon}
    </div>
    <span className="hidden lg:block font-medium">{label}</span>
  </button>
);

export default App;