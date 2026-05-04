import * as THREE from 'three';
import { PlatformType } from './Constants';

export enum GameState {
  READY     = 'ready',
  CHARGING  = 'charging',
  JUMPING   = 'jumping',
  LANDING   = 'landing',
  FALLING   = 'falling',
  GAME_OVER = 'game_over',
}

export interface PlatformData {
  id: number;
  type: PlatformType;
  position: THREE.Vector3;
  size: number;
  mesh: THREE.Group;
  isSpecial: boolean;
}

export interface JumpResult {
  landed: boolean;
  isCenter: boolean;
  distanceFromCenter: number;
  platform: PlatformData | null;
}

export interface ScoreEvent {
  score: number;
  total: number;
  combo: number;
  isCenter: boolean;
  isSpecial: boolean;
}

export type GameEventCallback = (...args: any[]) => void;
