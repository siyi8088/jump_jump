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
    // ── TG Classic Paper Plane Geometry ──
    // 还原 TG 纸飞机的经典比例：机翼更宽，龙骨更深
    const geo = new THREE.BufferGeometry();
    const s = 1.6; // 整体缩放系数

    const vertices = new Float32Array([
      // 0: 机头 (Nose - 缩短一点，不那么尖)
       0.0,      0.0,     -1.2 * s,
      // 1: 左翼尖 (Left Wingtip - 展翼更宽)
      -1.2 * s,  0.5 * s,  0.8 * s,
      // 2: 右翼尖 (Right Wingtip)
       1.2 * s,  0.5 * s,  0.8 * s,
      // 3: 顶部中心折谷 (Center Top Valley - 折痕变浅)
       0.0,      0.1 * s,  0.4 * s,
      // 4: 底部龙骨尖端 (Bottom Keel - TG 特有的深邃底边，大幅度向下延伸)
       0.0,     -0.9 * s,  0.6 * s,
    ]);

    // 依然使用你原本绝佳的拓扑连接顺序
    const indices = [
      // Top Left Wing
      0, 1, 3,
      // Top Right Wing
      0, 3, 2,
      // Bottom Left Wing
      0, 4, 1,
      // Bottom Right Wing
      0, 2, 4,
      // Back Left
      1, 4, 3,
      // Back Right
      2, 3, 4,
    ];

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // ── 材质光影升级 ──
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,         // 保持纯白纸张基色
      emissive: 0x2AABEE,      // 替换为正宗的 Telegram 官方蓝 (Hex: #2AABEE)
      emissiveIntensity: 0.45, // 调高一点发光强度，在暗色调的赛博空间里更亮眼
      side: THREE.DoubleSide,  //
      flatShading: true,       // 必须保持 true 才能有清晰的折纸棱角
      roughness: 0.2,          // 纸张表面稍微光滑一点
      metalness: 0.1,          //
      clearcoat: 0.5,          // 增加一层清漆质感，反光时会有类似高级微拟物（Neumorphism）的高光
      clearcoatRoughness: 0.2, //[cite: 1]
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
