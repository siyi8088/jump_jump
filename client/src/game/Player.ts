import * as THREE from 'three';
import {
  PLAYER_SCALE,
  PLAYER_Y_OFFSET,
  SQUISH_AMOUNT,
  MAX_CHARGE_TIME,
  COLORS,
} from '../utils/Constants';

/**
 * Paper airplane player character (TG themed).
 * Built from BufferGeometry to look like a folded origami plane.
 */
export class Player {
  public group: THREE.Group;
  private body: THREE.Mesh;
  private glowTrail: THREE.Points | null = null;
  private trailPositions: THREE.Vector3[] = [];

  private baseY = PLAYER_Y_OFFSET;
  private chargeScale = 1.0;

  constructor() {
    this.group = new THREE.Group();
    this.body = this.createAirplane();
    this.group.add(this.body);
    this.group.scale.setScalar(PLAYER_SCALE);

    // Subtle shadow
    this.body.castShadow = true;
  }

  private createAirplane(): THREE.Mesh {
    const geo = new THREE.BufferGeometry();

    // Paper airplane vertices – a sleek dart shape
    const s = 2.5; // scale factor for model
    const vertices = new Float32Array([
      // 0: Nose (front tip)
       0,     0.08 * s,  -0.7 * s,
      // 1: Left wing tip
      -0.65 * s, -0.03 * s,  0.35 * s,
      // 2: Right wing tip
       0.65 * s, -0.03 * s,  0.35 * s,
      // 3: Ridge (fold line, raised center)
       0,     0.25 * s,  -0.05 * s,
      // 4: Tail center
       0,     0.1 * s,   0.5 * s,
      // 5: Left inner wing
      -0.12 * s,  0.06 * s,  0.35 * s,
      // 6: Right inner wing
       0.12 * s,  0.06 * s,  0.35 * s,
    ]);

    const indices = [
      // Left wing (top)
      0, 3, 1,
      // Right wing (top)
      0, 2, 3,
      // Left tail (top)
      3, 5, 1,
      1, 5, 4,
      // Right tail (top)
      3, 2, 6,
      6, 2, 4,
      // Body ridge left
      3, 4, 5,
      // Body ridge right
      3, 6, 4,
      // Bottom left wing
      0, 1, 5,
      0, 5, 4,
      // Bottom right wing
      0, 6, 2,
      0, 4, 6,
    ];

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhongMaterial({
      color: COLORS.PLAYER_WHITE,
      emissive: COLORS.PLAYER_ACCENT,
      emissiveIntensity: 0.08,
      side: THREE.DoubleSide,
      flatShading: true,
      shininess: 60,
    });

    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  /** Set position in world space. */
  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y + this.baseY, z);
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  /** Face toward a direction vector. */
  public faceDirection(dir: THREE.Vector3): void {
    const angle = Math.atan2(dir.x, dir.z);
    this.body.rotation.y = angle;
  }

  /** Update squish during charging. chargeRatio: 0..1 */
  public updateCharge(chargeTime: number): void {
    const ratio = Math.min(chargeTime / MAX_CHARGE_TIME, 1.0);
    const scaleY = 1.0 - ratio * SQUISH_AMOUNT;
    const scaleXZ = 1.0 + ratio * SQUISH_AMOUNT * 0.3;
    this.group.scale.set(
      PLAYER_SCALE * scaleXZ,
      PLAYER_SCALE * scaleY,
      PLAYER_SCALE * scaleXZ,
    );
    // Lower position as squished
    this.group.position.y = this.baseY * scaleY;
  }

  /** Reset to normal scale. */
  public resetScale(): void {
    this.group.scale.setScalar(PLAYER_SCALE);
  }

  /** Set raw world position (during jump animation). */
  public setWorldPosition(pos: THREE.Vector3): void {
    this.group.position.copy(pos);
    // Store trail
    this.trailPositions.push(pos.clone());
    if (this.trailPositions.length > 20) this.trailPositions.shift();
  }

  /** Tilt during jump for a "flying" feel. */
  public setJumpTilt(progress: number): void {
    // Tilt forward at start, level at peak, tilt forward at end
    const tilt = Math.sin(progress * Math.PI) * 0.3;
    this.body.rotation.x = -tilt;
    // Slight roll
    this.body.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;
  }

  /** Reset rotation after landing. */
  public resetRotation(): void {
    this.body.rotation.x = 0;
    this.body.rotation.z = 0;
  }

  /** Idle bob animation. */
  public updateIdle(time: number): void {
    this.group.position.y = this.baseY + Math.sin(time * 2) * 0.03;
  }

  public dispose(): void {
    this.body.geometry.dispose();
    (this.body.material as THREE.Material).dispose();
  }
}
