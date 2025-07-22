export interface LocalGeneration {
  id: string;
  outputImageUrl: string;
  inputImageUrl?: string;
  modelId: string;
  createdAt: string;
}

export interface ApplyModelState {
  instances?: any[];
  selectedModelId?: string | null;
  inputImagePreview?: string;
  results?: { originalUrl: string; resultUrl: string }[];
  selectedResultIndex?: number;
}

const STORAGE_KEY = 'everart_generations';
const APPLY_MODEL_STATE_KEY = 'apply_model_state';

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

  // Save generation to localStorage
  saveGeneration(generation: LocalGeneration): void {
    try {
      const existing = this.getGenerations();
      const updated = [generation, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
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