import * as THREE from 'three';

// ─── Directions (isometric) ───
export const DIR_RIGHT = new THREE.Vector3(1, 0, 0);
export const DIR_LEFT  = new THREE.Vector3(0, 0, 1);

// ─── Camera ───
export const CAMERA_DISTANCE  = 15;
export const CAMERA_ELEVATION = Math.PI / 5;   // ~36°
export const CAMERA_AZIMUTH   = Math.PI / 4;   // 45°
export const CAMERA_LERP_SPEED = 3.0;
export const CAMERA_FRUSTUM   = 6;

// ─── Player ───
export const PLAYER_Y_OFFSET    = 0.55;
export const CHARGE_SPEED       = 1.8;
export const MAX_CHARGE_TIME    = 2.0;
export const POWER_MULTIPLIER   = 2.2;
export const JUMP_HEIGHT        = 2.8;
export const JUMP_BASE_DURATION = 0.3;
export const JUMP_DIST_FACTOR   = 0.12;
export const SQUISH_AMOUNT      = 0.55;
export const PLAYER_SCALE       = 0.28;

// ─── Platforms ───
export const PLATFORM_HEIGHT     = 0.6;
export const PLATFORM_MIN_DIST   = 1.2;
export const PLATFORM_MAX_DIST   = 3.6;
export const PLATFORM_MIN_SIZE   = 0.8;
export const PLATFORM_MAX_SIZE   = 1.6;
export const PLATFORM_SINK_AMOUNT = 0.08;
export const MAX_VISIBLE_PLATFORMS = 8;

// ─── Scoring ───
export const CENTER_THRESHOLD  = 0.28;
export const BASE_SCORE        = 1;
export const CENTER_BONUS      = 2;
export const COMBO_INCREMENT   = 2;

// ─── Difficulty ───
export const DIFFICULTY_RAMP_INTERVAL = 15;
export const DIFFICULTY_DIST_INCREMENT = 0.08;
export const DIFFICULTY_SIZE_DECREMENT = 0.03;
export const MIN_PLATFORM_SIZE = 0.55;

// ─── Colors (Premium 3D Aesthetic) ───
export const COLORS = {
  BG_TOP:        0x0F172A, // Slate 900 (Tailwind)
  BG_BOTTOM:     0x020617, // Slate 950
  CYAN:          0x38BDF8, // Light Sky Blue
  CRIMSON:       0xF43F5E, // Rose
  PURPLE:        0xA855F7, // Purple
  TG_BLUE:       0x0EA5E9, // Sky 500
  TG_BLUE_DARK:  0x0369A1, // Sky 700
  TG_GREEN:      0x22C55E, // Green 500
  PADLOCK_GOLD:  0xF59E0B, // Amber 500
  SERVER_DARK:   0x1E293B, // Slate 800
  PLAYER_WHITE:  0xF8FAFC, // Clean white plane
  PLAYER_ACCENT: 0x38BDF8,
  SHADOW:        0x000000,
  AMBIENT:       0xFFFFFF,
  DIRECTIONAL:   0xFFFFFF,
  GROUND:        0x0F172A,
};

// ─── Platform Types ───
export enum PlatformType {
  BUBBLE    = 'bubble',
  CHECKMARK = 'checkmark',
  PADLOCK   = 'padlock',
  SERVER    = 'server',
}

export const PLATFORM_TYPE_WEIGHTS: { type: PlatformType; weight: number }[] = [
  { type: PlatformType.BUBBLE,    weight: 40 },
  { type: PlatformType.CHECKMARK, weight: 25 },
  { type: PlatformType.PADLOCK,   weight: 20 },
  { type: PlatformType.SERVER,    weight: 15 },
];
