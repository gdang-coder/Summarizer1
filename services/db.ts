import { SavedPrompt, AnalysisEntry } from '../types';

const DB_NAME = 'InsightVaultDB';
const DB_VERSION = 2;
const STORE_PROMPTS = 'prompts';
const STORE_ENTRIES = 'entries';

class DBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROMPTS)) {
          db.createObjectStore(STORE_PROMPTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
          const entryStore = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
          entryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // --- Prompts ---

  async getAllPrompts(): Promise<SavedPrompt[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_PROMPTS, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePrompt(prompt: SavedPrompt): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_PROMPTS, 'readwrite');
      const request = store.put(prompt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePrompt(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_PROMPTS, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Entries ---

  async getAllEntries(): Promise<AnalysisEntry[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_ENTRIES, 'readonly');
      const index = store.index('timestamp');
      // Get all, but usually we want them in reverse chronological order
      // IDB returns ascending by default. We'll reverse in memory for simplicity 
      // as datasets are expected to be reasonable for a browser demo.
      const request = index.getAll(); 
      request.onsuccess = () => resolve(request.result.reverse());
      request.onerror = () => reject(request.error);
    });
  }

  async saveEntry(entry: AnalysisEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORE_ENTRIES, 'readwrite');
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async deleteEntry(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const store = this.getStore(STORE_ENTRIES, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DBService();