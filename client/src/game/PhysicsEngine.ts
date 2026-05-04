import * as THREE from 'three';
import { Player } from './Player';
import { Platform } from './Platform';
import {
  POWER_MULTIPLIER,
  JUMP_HEIGHT,
  JUMP_BASE_DURATION,
  JUMP_DIST_FACTOR,
  PLAYER_Y_OFFSET,
  CENTER_THRESHOLD,
} from '../utils/Constants';
import { JumpResult } from '../utils/Types';

/**
 * Handles jump trajectory, animation, and collision detection.
 */
export class PhysicsEngine {
  // Jump state
  private jumping = false;
  private jumpProgress = 0;       // 0 → 1
  private jumpDuration = 0;
  private jumpStartPos = new THREE.Vector3();
  private jumpEndPos = new THREE.Vector3();
  private jumpDirection = new THREE.Vector3();
  private jumpDistance = 0;

  private player: Player;
  private targetPlatform: Platform;

  constructor() {
    this.player = null!;
    this.targetPlatform = null!;
  }

  /**
   * Start a jump.
   * @param player    The player to animate.
   * @param chargeTime How long the player charged.
   * @param direction Normalized direction toward next platform.
   * @param startPos  Player start position (on current platform).
   * @param target    The next platform to potentially land on.
   */
  public startJump(
    player: Player,
    chargeTime: number,
    direction: THREE.Vector3,
    startPos: THREE.Vector3,
    target: Platform,
  ): void {
    this.player = player;
    this.targetPlatform = target;
    this.jumping = true;
    this.jumpProgress = 0;

    // Calculate distance from charge
    this.jumpDistance = chargeTime * POWER_MULTIPLIER;

    // Jump end point (might overshoot or undershoot target)
    this.jumpStartPos.set(startPos.x, PLAYER_Y_OFFSET, startPos.z);
    this.jumpDirection.copy(direction).normalize();
    this.jumpEndPos.set(
      startPos.x + direction.x * this.jumpDistance,
      PLAYER_Y_OFFSET,
      startPos.z + direction.z * this.jumpDistance,
    );

    // Duration proportional to distance
    this.jumpDuration = JUMP_BASE_DURATION + this.jumpDistance * JUMP_DIST_FACTOR;
  }

  /**
   * Update jump each frame.
   * @returns JumpResult when landing, null while still in air.
   */
  public update(dt: number): JumpResult | null {
    if (!this.jumping) return null;

    this.jumpProgress += dt / this.jumpDuration;

    if (this.jumpProgress >= 1.0) {
      this.jumpProgress = 1.0;
      this.jumping = false;
      return this.checkLanding();
    }

    // Parametric position
    const t = this.jumpProgress;
    const pos = new THREE.Vector3();

    // Horizontal: linear interpolation
    pos.x = this.jumpStartPos.x + this.jumpDirection.x * this.jumpDistance * t;
    pos.z = this.jumpStartPos.z + this.jumpDirection.z * this.jumpDistance * t;

    // Vertical: parabolic arc  y = baseY + height * 4t(1-t)
    pos.y = PLAYER_Y_OFFSET + JUMP_HEIGHT * 4 * t * (1 - t);

    this.player.setWorldPosition(pos);
    this.player.setJumpTilt(t);

    return null;
  }

  /** Check landing at jump end position. */
  private checkLanding(): JumpResult {
    const landX = this.jumpEndPos.x;
    const landZ = this.jumpEndPos.z;

    // Check if on target platform
    if (this.targetPlatform.containsPoint(landX, landZ)) {
      const dist = this.targetPlatform.distanceFromCenter(landX, landZ);
      const isCenter = dist < CENTER_THRESHOLD;

      // Set final position on platform
      this.player.setWorldPosition(new THREE.Vector3(
        landX,
        PLAYER_Y_OFFSET,
        landZ,
      ));
      this.player.resetRotation();

      return {
        landed: true,
        isCenter,
        distanceFromCenter: dist,
        platform: null, // Will be set by Game
      };
    }

    // Missed – set position at landing point for fall animation
    this.player.setWorldPosition(new THREE.Vector3(
      landX,
      PLAYER_Y_OFFSET,
      landZ,
    ));

    return {
      landed: false,
      isCenter: false,
      distanceFromCenter: 999,
      platform: null,
    };
  }

  public isJumping(): boolean {
    return this.jumping;
  }

  public getJumpProgress(): number {
    return this.jumpProgress;
  }
}
