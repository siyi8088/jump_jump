import {
  BASE_SCORE,
  CENTER_BONUS,
  COMBO_INCREMENT,
} from '../utils/Constants';
import { ScoreEvent } from '../utils/Types';

/**
 * Score tracking with combo system.
 */
export class ScoreManager {
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private jumps = 0;
  private bestScore = 0;

  private listeners: ((event: ScoreEvent) => void)[] = [];

  constructor() {
    // Load best score from localStorage
    this.bestScore = parseInt(localStorage.getItem('jump_best_score') || '0', 10);
  }

  /** Register a successful landing. */
  public addScore(isCenter: boolean, isSpecial: boolean): ScoreEvent {
    this.jumps++;
    let gained = BASE_SCORE;

    if (isCenter) {
      this.combo++;
      gained += CENTER_BONUS + (this.combo - 1) * COMBO_INCREMENT;
    } else {
      this.combo = 0;
    }

    if (isSpecial) {
      gained += 30;
    }

    this.score += gained;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const event: ScoreEvent = {
      score: gained,
      total: this.score,
      combo: this.combo,
      isCenter,
      isSpecial,
    };

    // Notify listeners
    for (const cb of this.listeners) cb(event);

    return event;
  }

  public getScore(): number { return this.score; }
  public getCombo(): number { return this.combo; }
  public getMaxCombo(): number { return this.maxCombo; }
  public getJumps(): number { return this.jumps; }
  public getBestScore(): number { return this.bestScore; }

  /** Finalize game: check & save best score. Returns true if new record. */
  public finalize(): boolean {
    const isRecord = this.score > this.bestScore;
    if (isRecord) {
      this.bestScore = this.score;
      localStorage.setItem('jump_best_score', String(this.bestScore));
    }
    return isRecord;
  }

  public reset(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.jumps = 0;
  }

  public onScore(cb: (event: ScoreEvent) => void): void {
    this.listeners.push(cb);
  }
}
