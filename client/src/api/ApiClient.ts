/**
 * API client for communicating with the Jump Jump backend.
 */
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private sessionId: string | null = null;

  constructor(baseUrl: string = '') {
    // Default to same origin in production, localhost:3001 in dev
    this.baseUrl = baseUrl || (
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : ''
    );
  }

  /** Set auth token after Telegram login. */
  public setToken(token: string): void {
    this.token = token;
  }

  /** Get current session ID. */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  /** Check if authenticated. */
  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Authenticate with Telegram initData.
   */
  public async authenticate(initData: string): Promise<{
    token: string;
    user: { id: number; telegramId: number; username?: string; firstName: string; photoUrl?: string };
  }> {
    const res = await this.post('/api/auth', { initData });
    this.token = res.token;
    return res;
  }

  /**
   * Start a new game session.
   */
  public async startGame(): Promise<string> {
    const res = await this.post('/api/game/start', {});
    this.sessionId = res.sessionId;
    return res.sessionId;
  }

  /**
   * Report a jump event (for anti-cheat tracking).
   * Fire-and-forget, don't block game loop.
   */
  public reportJump(chargeTime: number, score: number, combo: number): void {
    if (!this.sessionId) return;
    this.post('/api/game/jump', {
      sessionId: this.sessionId,
      chargeTime,
      score,
      combo,
    }).catch(() => {
      // Non-critical, don't break game
    });
  }

  /**
   * End game and submit score.
   */
  public async endGame(
    score: number,
    maxCombo: number,
    jumpCount: number,
    chatId?: number,
  ): Promise<{ valid: boolean; score: number; isRecord: boolean }> {
    if (!this.sessionId) {
      return { valid: false, score: 0, isRecord: false };
    }

    const result = await this.post('/api/game/end', {
      sessionId: this.sessionId,
      score,
      maxCombo,
      jumpCount,
      chatId,
    });

    this.sessionId = null;
    return result;
  }

  /**
   * Get leaderboard.
   */
  public async getLeaderboard(
    type: 'daily' | 'weekly' | 'all',
    chatId?: number,
  ): Promise<any> {
    const params = chatId ? `?chatId=${chatId}` : '';
    return this.get(`/api/leaderboard/${type}${params}`);
  }

  /**
   * Get user profile.
   */
  public async getUserProfile(): Promise<any> {
    return this.get('/api/user/profile');
  }

  // ─── HTTP helpers ───

  private async post(path: string, body: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  private async get(path: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }
}
