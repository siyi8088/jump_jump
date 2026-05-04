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
export const PLAYER_SCALE       = 0.22;

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

// ─── Colors (Cyberpunk Theme) ───
export const COLORS = {
  BG_TOP:        0x0B1628, // Deep navy blue (matches poster atmosphere)
  BG_BOTTOM:     0x091220,
  CYAN:          0x00C8FF, // Vivid Cyan
  CRIMSON:       0xFF2244, // Bright Red
  PURPLE:        0xB026FF, // Electric Purple
  TG_BLUE:       0x2AABEE, // Telegram Blue — keep recognizable
  TG_BLUE_DARK:  0x0B1628,
  TG_GREEN:      0x39FF14, // Neon green
  PADLOCK_GOLD:  0xFFC800, // Brighter gold
  SERVER_DARK:   0x1A1A2E, // Dark indigo for server base
  PLAYER_WHITE:  0x2A2A3A, // Stealth grey-blue
  PLAYER_ACCENT: 0x00C8FF, // Cyan accent
  SHADOW:        0x000000,
  AMBIENT:       0x556688,
  DIRECTIONAL:   0xFFFFFF,
  GROUND:        0x0B1628,
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
