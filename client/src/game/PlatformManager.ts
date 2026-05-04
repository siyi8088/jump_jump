import * as THREE from 'three';
import { Platform } from './Platform';
import {
  PLATFORM_MIN_DIST,
  PLATFORM_MAX_DIST,
  PLATFORM_MIN_SIZE,
  PLATFORM_MAX_SIZE,
  MAX_VISIBLE_PLATFORMS,
  DIFFICULTY_RAMP_INTERVAL,
  DIFFICULTY_DIST_INCREMENT,
  DIFFICULTY_SIZE_DECREMENT,
  MIN_PLATFORM_SIZE,
  DIR_RIGHT,
  DIR_LEFT,
  PlatformType,
  PLATFORM_TYPE_WEIGHTS,
} from '../utils/Constants';

/**
 * Generates and manages platform lifecycle.
 */
export class PlatformManager {
  private platforms: Platform[] = [];
  private scene: THREE.Scene;
  private nextId = 0;
  private currentIndex = 0;
  private difficulty = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Create the initial two platforms. */
  public init(): void {
    this.clear();
    this.difficulty = 0;
    this.currentIndex = 0;

    // First platform at origin
    const first = this.createPlatform(
      PlatformType.BUBBLE,
      1.4,
      new THREE.Vector3(0, 0, 0),
    );
    this.platforms.push(first);
    this.scene.add(first.group);

    // Second platform
    this.generateNext();
  }

  /** Generate a new platform ahead. */
  public generateNext(): Platform {
    const current = this.getCurrentPlatform();
    const dir = Math.random() > 0.5 ? DIR_RIGHT.clone() : DIR_LEFT.clone();

    // Distance with difficulty scaling
    const minDist = PLATFORM_MIN_DIST + this.difficulty * DIFFICULTY_DIST_INCREMENT;
    const maxDist = PLATFORM_MAX_DIST + this.difficulty * DIFFICULTY_DIST_INCREMENT * 0.5;
    const dist = minDist + Math.random() * (maxDist - minDist);

    // Size with difficulty scaling
    const maxSize = Math.max(MIN_PLATFORM_SIZE,
      PLATFORM_MAX_SIZE - this.difficulty * DIFFICULTY_SIZE_DECREMENT);
    const minSize = Math.max(MIN_PLATFORM_SIZE, PLATFORM_MIN_SIZE);
    const size = minSize + Math.random() * (maxSize - minSize);

    // Position
    const pos = current.position.clone().add(dir.multiplyScalar(dist));

    // Random type
    const type = this.randomType();
    const isSpecial = Math.random() < 0.08; // 8% chance for special (easter egg)

    const platform = this.createPlatform(type, size, pos, isSpecial);
    this.platforms.push(platform);
    this.scene.add(platform.group);

    // Cleanup old platforms
    this.pruneOld();

    return platform;
  }

  /** Move to next platform (after successful landing). */
  public advance(): void {
    this.currentIndex++;
    this.difficulty = Math.floor(this.currentIndex / DIFFICULTY_RAMP_INTERVAL);
  }

  public getCurrentPlatform(): Platform {
    return this.platforms[this.currentIndex];
  }

  public getNextPlatform(): Platform {
    return this.platforms[this.currentIndex + 1];
  }

  /** Get direction vector from current to next platform. */
  public getJumpDirection(): THREE.Vector3 {
    const current = this.getCurrentPlatform();
    const next = this.getNextPlatform();
    const dir = next.position.clone().sub(current.position);
    dir.y = 0;
    return dir.normalize();
  }

  /** Get distance from current to next platform. */
  public getJumpDistance(): number {
    const current = this.getCurrentPlatform();
    const next = this.getNextPlatform();
    const diff = next.position.clone().sub(current.position);
    diff.y = 0;
    return diff.length();
  }

  private createPlatform(
    type: PlatformType,
    size: number,
    position: THREE.Vector3,
    isSpecial = false,
  ): Platform {
    return new Platform(type, size, position, isSpecial);
  }

  private randomType(): PlatformType {
    const totalWeight = PLATFORM_TYPE_WEIGHTS.reduce((s, w) => s + w.weight, 0);
    let r = Math.random() * totalWeight;
    for (const { type, weight } of PLATFORM_TYPE_WEIGHTS) {
      r -= weight;
      if (r <= 0) return type;
    }
    return PlatformType.BUBBLE;
  }

  /** Remove platforms that are too far behind camera. */
  private pruneOld(): void {
    while (this.platforms.length > MAX_VISIBLE_PLATFORMS + this.currentIndex) {
      const old = this.platforms[0];
      if (this.platforms.indexOf(old) < this.currentIndex - 2) {
        this.scene.remove(old.group);
        old.dispose();
        this.platforms.shift();
        this.currentIndex--;
      } else {
        break;
      }
    }
  }

  public clear(): void {
    for (const p of this.platforms) {
      this.scene.remove(p.group);
      p.dispose();
    }
    this.platforms = [];
    this.nextId = 0;
    this.currentIndex = 0;
  }

  public dispose(): void {
    this.clear();
  }
}
