export interface AutoSaveStatus {
  isSaving: boolean;
  lastSaveTime: string;
  hasPendingChanges: boolean;
}

export class AutoSaver {
  private isSaving: boolean = false;
  private lastSaveTime: string = '';
  private hasPendingChanges: boolean = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private saveCallback: (() => Promise<void>) | null = null;
  private debounceMs: number = 2000;

  constructor(debounceMs: number = 2000) {
    this.debounceMs = debounceMs;
  }

  /**
   * Register the save callback that performs the actual persistence.
   */
  public onSave(callback: () => Promise<void>): void {
    this.saveCallback = callback;
  }

  /**
   * Called when data changes. Marks pending changes and resets the 2s debounce timer.
   */
  public onChange(): void {
    this.hasPendingChanges = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerSave();
    }, this.debounceMs);
  }

  /**
   * Triggers the registered save callback immediately.
   */
  public async triggerSave(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (!this.saveCallback) {
      return;
    }

    this.isSaving = true;
    try {
      await this.saveCallback();
      const now = new Date();
      this.lastSaveTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      this.hasPendingChanges = false;
    } catch (error) {
      console.error('AutoSave failed:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Returns current auto-save status.
   */
  public getStatus(): AutoSaveStatus {
    return {
      isSaving: this.isSaving,
      lastSaveTime: this.lastSaveTime,
      hasPendingChanges: this.hasPendingChanges,
    };
  }

  /**
   * Clean up timer if needed.
   */
  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

export const autoSaver = new AutoSaver(2000);
