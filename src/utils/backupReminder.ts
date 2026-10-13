export interface BackupReminderConfig {
  intervalMs?: number;
  initialDelayMs?: number;
  onRemind: () => void;
}

export class BackupReminder {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private lastBackupTime: number = Date.now();
  private onRemindCallback: (() => void) | null = null;

  /**
   * Starts the reminder schedule:
   * First reminder after initialDelayMs (default 5 minutes),
   * then repeats every intervalMs (default 30 minutes).
   */
  public start(config: BackupReminderConfig): void {
    this.stop();

    this.onRemindCallback = config.onRemind;
    const initialDelay = config.initialDelayMs ?? 5 * 60 * 1000; // 5 min
    const interval = config.intervalMs ?? 30 * 60 * 1000; // 30 min

    this.timer = setTimeout(() => {
      if (this.onRemindCallback) {
        this.onRemindCallback();
      }

      // After the initial reminder fires, set recurring interval
      this.intervalTimer = setInterval(() => {
        if (this.onRemindCallback) {
          this.onRemindCallback();
        }
      }, interval);
    }, initialDelay);
  }

  /**
   * Clears all timers.
   */
  public stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Records a backup event to reset the clock.
   */
  public recordBackup(): void {
    this.lastBackupTime = Date.now();
  }

  /**
   * Returns milliseconds since the last backup.
   */
  public getTimeSinceLastBackup(): number {
    return Date.now() - this.lastBackupTime;
  }
}

export const backupReminder = new BackupReminder();
