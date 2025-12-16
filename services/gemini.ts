import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisEntry } from '../types';

class GeminiService {
  private ai: GoogleGenAI;
  private modelId = 'gemini-2.5-flash';

  constructor() {
    // Assuming process.env.API_KEY is available as per instructions
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeText(text: string, promptInstruction: string): Promise<string> {
    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: this.modelId,
        contents: [
          {
            role: 'user',
            parts: [
              { text: `INSTRUCTION: ${promptInstruction}` },
              { text: `TRANSCRIPT/TEXT TO ANALYZE:\n${text}` }
            ]
          }
        ],
        config: {
            temperature: 0.3, // Lower temperature for more consistent analysis
        }
      });
      return response.text || "No response generated.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }

  /**
   * Searches the database using the LLM. 
   * We pass summaries of the entries to the context window.
   */
  async searchDatabase(query: string, entries: AnalysisEntry[]): Promise<string> {
    try {
      // Construct a context document from the entries
      // We limit to the most recent 20 entries or truncate if needed to fit context (simplified here)
      // Ideally, we would use embeddings/RAG, but for this constraint we use long-context window.
      
      const contextData = entries.slice(0, 50).map(entry => {
        return `
---
Entry ID: ${entry.id}
Date: ${new Date(entry.timestamp).toLocaleDateString()}
Title: ${entry.title}
Summary/Analysis: ${entry.analysis}
Original Excerpt (First 300 chars): ${entry.originalText.substring(0, 300)}...
---
        `;
      }).join('\n');

      const systemInstruction = `You are a knowledge base assistant. 
You have access to a list of analyzed interview transcripts/texts. 
Your job is to answer the user's question based ONLY on the provided database context.
If the answer is not in the context, say you don't know. 
Cite the Entry ID or Title when referencing specific information.`;

      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: this.modelId,
        contents: [
            {
                role: 'user',
                parts: [
                    { text: `DATABASE CONTEXT:\n${contextData}` },
                    { text: `USER QUESTION: ${query}` }
                ]
            }
        ],
        config: {
          systemInstruction: systemInstruction,
        },
      });

      return response.text || "I couldn't find an answer in your database.";
    } catch (error) {
      console.error("Gemini Search Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();