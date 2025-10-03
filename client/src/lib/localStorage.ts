export interface LocalGeneration {
  id: string;
  outputImageUrl: string;
  inputImageUrl?: string;
  modelId: string;
  createdAt: string;
}

export interface ApplyModelState {
  instances?: any[];
  inputImagePreview?: string;
  results?: { originalUrl: string; resultUrl: string }[];
  selectedResultIndex?: number;
}

const STORAGE_KEY = 'everart_generations';
const APPLY_MODEL_STATE_KEY = 'apply_model_state';
const MAX_GENERATIONS = 50; // Maximální počet uložených generací

export const localGenerationsStorage = {
  // Get all generations from localStorage
  getGenerations(): LocalGeneration[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  },

  // Save generation to localStorage with quota management
  saveGeneration(generation: LocalGeneration): void {
    try {
      let existing = this.getGenerations();
      
      // Kontrola, jestli už generace existuje (podle ID)
      const exists = existing.some(g => g.id === generation.id);
      if (exists) {
        console.log(`Generation ${generation.id} already exists, skipping save`);
        return;
      }
      
      // Přidat novou generaci na začátek
      let updated = [generation, ...existing];
      
      // Omezit na maximální počet (nejstarší se smažou)
      if (updated.length > MAX_GENERATIONS) {
        console.log(`Trimming generations from ${updated.length} to ${MAX_GENERATIONS}`);
        updated = updated.slice(0, MAX_GENERATIONS);
      }
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (quotaError: any) {
        // Pokud stále přesahuje kvótu, zkusit uložit s menším limitem
        if (quotaError.name === 'QuotaExceededError') {
          console.warn('Quota exceeded, reducing to last 20 generations');
          updated = updated.slice(0, 20);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } else {
          throw quotaError;
        }
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      // Jako poslední možnost - vymazat vše a zkusit uložit jen tuto generaci
      try {
        console.warn('Clearing all generations and saving only new one');
        localStorage.setItem(STORAGE_KEY, JSON.stringify([generation]));
      } catch (finalError) {
        console.error('Failed to save even after clearing:', finalError);
      }
    }
  },

  // Delete generation from localStorage
  deleteGeneration(id: string): void {
    try {
      const existing = this.getGenerations();
      const filtered = existing.filter(gen => gen.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }
  },

  // Clear all generations
  clearGenerations(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  // Get storage size info
  getStorageInfo(): { count: number; sizeKB: number } {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const count = stored ? JSON.parse(stored).length : 0;
      const sizeKB = stored ? (new Blob([stored]).size / 1024).toFixed(2) : 0;
      return { count, sizeKB: Number(sizeKB) };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { count: 0, sizeKB: 0 };
    }
  },

  // Clean old generations (keep only last N)
  cleanOldGenerations(keepLast: number = 20): number {
    try {
      const existing = this.getGenerations();
      if (existing.length <= keepLast) {
        return 0;
      }
      const toKeep = existing.slice(0, keepLast);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toKeep));
      return existing.length - toKeep.length;
    } catch (error) {
      console.error('Error cleaning old generations:', error);
      return 0;
    }
  }
};

// Apply Model State management
export const loadApplyModelState = (): ApplyModelState | null => {
  try {
    const stored = localStorage.getItem(APPLY_MODEL_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading apply model state:', error);
    return null;
  }
};

export const saveApplyModelState = (state: ApplyModelState): void => {
  try {
    localStorage.setItem(APPLY_MODEL_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving apply model state:', error);
  }
};