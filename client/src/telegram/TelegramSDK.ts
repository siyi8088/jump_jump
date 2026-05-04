/**
 * Telegram WebApp SDK wrapper.
 * Provides typed access to TG Mini App features.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      language_code?: string;
    };
    chat?: {
      id: number;
      type: string;
      title?: string;
    };
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;

  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;

  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };

  switchInlineQuery(query: string, chatTypes?: string[]): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
}

export class TelegramSDK {
  private webapp: TelegramWebApp | null = null;

  constructor() {
    this.webapp = window.Telegram?.WebApp || null;
  }

  /** Check if running inside Telegram. */
  public isInTelegram(): boolean {
    return this.webapp !== null && !!this.webapp.initData;
  }

  /** Signal that the app is ready. */
  public ready(): void {
    this.webapp?.ready();
    this.webapp?.expand();
    this.webapp?.enableClosingConfirmation();
  }

  /** Get initData string for backend auth. */
  public getInitData(): string {
    return this.webapp?.initData || '';
  }

  /** Get user info (unsafe, not validated). */
  public getUser() {
    return this.webapp?.initDataUnsafe?.user || null;
  }

  /** Get chat info (if launched from a group). */
  public getChat() {
    return this.webapp?.initDataUnsafe?.chat || null;
  }

  /** Get chat ID for group leaderboard. */
  public getChatId(): number | undefined {
    return this.webapp?.initDataUnsafe?.chat?.id;
  }

  /** Haptic feedback – light tap. */
  public hapticLight(): void {
    this.webapp?.HapticFeedback?.impactOccurred('light');
  }

  /** Haptic feedback – medium impact. */
  public hapticMedium(): void {
    this.webapp?.HapticFeedback?.impactOccurred('medium');
  }

  /** Haptic feedback – success notification. */
  public hapticSuccess(): void {
    this.webapp?.HapticFeedback?.notificationOccurred('success');
  }

  /** Share score via inline query. */
  public shareScore(score: number): void {
    if (!this.webapp) return;
    this.webapp.switchInlineQuery(
      `I scored ${score} in Jump Jump! Can you beat me? 🎯`,
      ['users', 'groups']
    );
  }

  /** Get theme (for potential UI adaptation). */
  public getColorScheme(): 'light' | 'dark' {
    return this.webapp?.colorScheme || 'dark';
  }
}
