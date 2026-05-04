import { Game } from './game/Game';
import { ApiClient } from './api/ApiClient';
import { TelegramSDK } from './telegram/TelegramSDK';
import { ScoreEvent } from './utils/Types';

/**
 * Entry point – wires up Game engine, API, Telegram SDK, and UI.
 */
class App {
  private game: Game;
  private api: ApiClient;
  private tg: TelegramSDK;

  // UI elements
  private startScreen    = document.getElementById('start-screen')!;
  private gameOverScreen = document.getElementById('gameover-screen')!;
  private scoreHud       = document.getElementById('score-hud')!;
  private currentScoreEl = document.getElementById('current-score')!;
  private comboDisplay   = document.getElementById('combo-display')!;
  private comboText      = document.getElementById('combo-text')!;
  private bestScoreEl    = document.getElementById('best-score-value')!;
  private finalScoreEl   = document.getElementById('final-score-value')!;
  private finalComboEl   = document.getElementById('final-combo')!;
  private finalJumpsEl   = document.getElementById('final-jumps')!;
  private newRecordEl    = document.getElementById('new-record')!;

  private comboTimeout: number | null = null;
  private chatId?: number;

  constructor() {
    const container = document.getElementById('game-container')!;
    this.game = new Game(container);
    this.api = new ApiClient();
    this.tg = new TelegramSDK();

    this.setupUI();
    this.setupGameCallbacks();
    this.setupLeaderboard();
    this.initTelegram();

    // Show local best score initially
    this.bestScoreEl.textContent = String(this.game.getBestScore());
  }

  /** Initialize Telegram integration if running inside TG. */
  private async initTelegram(): Promise<void> {
    if (this.tg.isInTelegram()) {
      this.tg.ready();
      this.chatId = this.tg.getChatId();

      try {
        const { user } = await this.api.authenticate(this.tg.getInitData());
        console.log('✅ Authenticated as', user.firstName);

        // Fetch server-side best score
        const profile = await this.api.getUserProfile();
        if (profile.best_score > 0) {
          this.bestScoreEl.textContent = String(profile.best_score);
        }
      } catch (err) {
        console.warn('TG auth failed, running in offline mode:', err);
      }
    } else {
      console.log('Not running in Telegram, offline mode.');
    }
  }

  private setupUI(): void {
    // Start button
    document.getElementById('btn-start')!.addEventListener('click', () => {
      this.startGame();
    });

    // Restart button
    document.getElementById('btn-restart')!.addEventListener('click', () => {
      this.startGame();
    });

    // Share button
    document.getElementById('btn-share')!.addEventListener('click', () => {
      const score = this.finalScoreEl.textContent || '0';
      if (this.tg.isInTelegram()) {
        this.tg.shareScore(parseInt(score, 10));
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard?.writeText(`I scored ${score} in Jump Jump! 🎯`);
        alert('Score copied to clipboard!');
      }
    });

    // Sound toggle
    const btnSound = document.getElementById('btn-sound')!;
    btnSound.addEventListener('click', () => {
      const muted = this.game.getAudio().toggleMute();
      btnSound.textContent = muted ? '🔇' : '🔊';
    });

    // Leaderboard buttons
    document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
      this.showLeaderboard('start');
    });
    document.getElementById('btn-leaderboard2')?.addEventListener('click', () => {
      this.showLeaderboard('gameover');
    });
  }

  private setupGameCallbacks(): void {
    this.game.onScoreUpdate = (event: ScoreEvent) => {
      this.currentScoreEl.textContent = String(event.total);

      // Animate score pop
      this.currentScoreEl.classList.remove('score-pop');
      void this.currentScoreEl.offsetWidth;
      this.currentScoreEl.classList.add('score-pop');

      // Haptic feedback
      if (event.isCenter) {
        this.tg.hapticSuccess();
      } else {
        this.tg.hapticLight();
      }

      // Report jump to server (fire-and-forget)
      this.api.reportJump(0, event.total, event.combo);
    };

    this.game.onCombo = (combo: number) => {
      this.comboText.textContent = `COMBO ×${combo}`;
      this.comboDisplay.classList.remove('hidden');
      this.comboDisplay.classList.remove('combo-animate');
      void this.comboDisplay.offsetWidth;
      this.comboDisplay.classList.add('combo-animate');

      this.tg.hapticMedium();

      if (this.comboTimeout) clearTimeout(this.comboTimeout);
      this.comboTimeout = window.setTimeout(() => {
        this.comboDisplay.classList.add('hidden');
      }, 1200);
    };

    this.game.onGameOver = async (score, isRecord, combo, jumps) => {
      this.scoreHud.classList.add('hidden');
      this.gameOverScreen.classList.remove('hidden');
      this.finalScoreEl.textContent = String(score);
      this.finalComboEl.textContent = String(combo);
      this.finalJumpsEl.textContent = String(jumps);

      // Submit score to server
      if (this.api.isAuthenticated()) {
        try {
          const result = await this.api.endGame(score, combo, jumps, this.chatId);
          if (result.isRecord) {
            this.newRecordEl.classList.remove('hidden');
            this.bestScoreEl.textContent = String(score);
          } else {
            this.newRecordEl.classList.add('hidden');
          }
        } catch (err) {
          console.warn('Failed to submit score:', err);
          // Fall back to local record
          this.newRecordEl.classList.toggle('hidden', !isRecord);
          if (isRecord) this.bestScoreEl.textContent = String(score);
        }
      } else {
        this.newRecordEl.classList.toggle('hidden', !isRecord);
        if (isRecord) this.bestScoreEl.textContent = String(score);
      }
    };
  }

  private async startGame(): Promise<void> {
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.scoreHud.classList.remove('hidden');
    this.currentScoreEl.textContent = '0';
    this.comboDisplay.classList.add('hidden');

    // Create server session if authenticated
    if (this.api.isAuthenticated()) {
      try {
        await this.api.startGame();
      } catch (err) {
        console.warn('Failed to start server session:', err);
      }
    }

    this.game.start();
  }

  private leaderboardScreen = document.getElementById('leaderboard-screen')!;
  private lbList            = document.getElementById('lb-list')!;
  private lbUserRank        = document.getElementById('lb-user-rank')!;
  private lbUserRankValue   = document.getElementById('lb-user-rank-value')!;
  private lbUserScoreValue  = document.getElementById('lb-user-score-value')!;
  private currentLbType: 'daily' | 'weekly' | 'all' = 'daily';
  private previousScreen: string = 'start'; // tracks which screen opened leaderboard

  private setupLeaderboard(): void {
    // Back button
    document.getElementById('btn-lb-back')!.addEventListener('click', () => {
      this.leaderboardScreen.classList.add('hidden');
      if (this.previousScreen === 'gameover') {
        this.gameOverScreen.classList.remove('hidden');
      } else {
        this.startScreen.classList.remove('hidden');
      }
    });

    // Tab buttons
    document.querySelectorAll('.lb-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const type = (tab as HTMLElement).dataset.type as 'daily' | 'weekly' | 'all';
        if (type === this.currentLbType) return;

        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentLbType = type;
        this.loadLeaderboard(type);
      });
    });
  }

  private async showLeaderboard(from: 'start' | 'gameover' = 'start'): Promise<void> {
    this.previousScreen = from;

    // Hide other screens, show leaderboard
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.leaderboardScreen.classList.remove('hidden');

    // Reset to daily tab
    this.currentLbType = 'daily';
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.lb-tab[data-type="daily"]')?.classList.add('active');

    await this.loadLeaderboard('daily');
  }

  private async loadLeaderboard(type: 'daily' | 'weekly' | 'all'): Promise<void> {
    this.lbList.innerHTML = '<div class="lb-loading">Loading...</div>';
    this.lbUserRank.classList.add('hidden');

    if (!this.api.isAuthenticated()) {
      this.lbList.innerHTML = '<div class="lb-empty">Open in Telegram to see leaderboard</div>';
      return;
    }

    try {
      const data = await this.api.getLeaderboard(type, this.chatId);

      if (!data.entries || data.entries.length === 0) {
        this.lbList.innerHTML = '<div class="lb-empty">No scores yet. Be the first! 🚀</div>';
      } else {
        this.renderLeaderboardEntries(data.entries);
      }

      // User rank footer
      if (data.userRank) {
        this.lbUserRank.classList.remove('hidden');
        this.lbUserRankValue.textContent = `#${data.userRank}`;
        this.lbUserScoreValue.textContent = String(data.userScore || 0);
      }
    } catch (err) {
      console.warn('Failed to load leaderboard:', err);
      this.lbList.innerHTML = '<div class="lb-empty">Failed to load. Try again later.</div>';
    }
  }

  private renderLeaderboardEntries(entries: any[]): void {
    const rankIcons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

    this.lbList.innerHTML = entries.map((entry: any, index: number) => {
      const rank = entry.rank || index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const rankText = rankIcons[rank] || `${rank}`;
      const initial = (entry.firstName || '?')[0].toUpperCase();
      const name = entry.username
        ? `@${entry.username}`
        : [entry.firstName, entry.lastName].filter(Boolean).join(' ');
      const avatar = entry.photoUrl
        ? `<img src="${entry.photoUrl}" alt="" />`
        : initial;

      return `
        <div class="lb-entry" style="--i: ${index}">
          <div class="lb-rank ${rankClass}">${rankText}</div>
          <div class="lb-avatar">${avatar}</div>
          <div class="lb-info">
            <div class="lb-name">${this.escapeHtml(name)}</div>
            <div class="lb-combo-label">Best combo: ${entry.maxCombo || 0}</div>
          </div>
          <div class="lb-score">${entry.score}</div>
        </div>
      `;
    }).join('');
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
