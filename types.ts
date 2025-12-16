export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface AnalysisEntry {
  id: string;
  title: string;
  originalText: string;
  analysis: string;
  promptId: string; // The prompt used
  promptSnapshot: string; // The prompt text at the time of analysis
  timestamp: number;
}

export enum ViewState {
  ANALYZER = 'ANALYZER',
  DATABASE = 'DATABASE',
  PROMPTS = 'PROMPTS'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}