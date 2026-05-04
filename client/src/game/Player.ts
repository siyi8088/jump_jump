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
    // 稍微放大一点，让它在方块上更有存在感
    const s = 1.5; 

    // ── 真正的 3D 对称折纸模型 ──
    const vertices = new Float32Array([
      // 0: 机头 (Nose) - 尖端向前
       0.0,       0.0,      -1.5 * s,
      // 1: 左翼尖 (Left Wingtip) - 展翼拉宽，体现 TG 飞机的宽大感
      -1.2 * s,   0.3 * s,   1.0 * s,
      // 2: 右翼尖 (Right Wingtip)
       1.2 * s,   0.3 * s,   1.0 * s,
      // 3: 顶部中心折谷 (Center Top Valley) - 微微下沉，形成机翼的上扬角
       0.0,       0.1 * s,   1.0 * s,
      // 4: 底部龙骨 (Bottom Keel) - 极其关键！深深向下突出，创造出巨大的 3D 体积感
       0.0,      -0.8 * s,   0.8 * s,
    ]);

    const indices = [
      0, 1, 3, // 顶部左翼
      0, 3, 2, // 顶部右翼
      0, 4, 1, // 底部左侧 (受光面/背光面)
      0, 2, 4, // 底部右侧 (受光面/背光面)
      1, 4, 3, // 尾部左侧
      2, 3, 4, // 尾部右侧
    ];

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    
    // 自动计算法线，这是产生 3D 光影的前提！
    geo.computeVertexNormals();

    // ── 材质：纯正 TG 蓝 + 强烈的折纸光影 ──
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2AABEE,        // 纯正 Telegram 蓝
      roughness: 0.2,         // 纸张微带反光
      metalness: 0.1,
      flatShading: true,      // 绝对不能删！这是展现“折纸棱角”的灵魂属性
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);

    // ── 保留高光白边 ──
    // 给所有物理折痕加上白边，增强赛博感
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true,
      opacity: 0.8
    });
    const lineSegments = new THREE.LineSegments(edges, lineMat);
    mesh.add(lineSegments);

    // 清除掉上一版里乱七八糟的初始旋转！
    // 让它默认笔直朝前，方向交给游戏逻辑 (faceDirection) 去控制
    mesh.rotation.set(0, 0, 0);

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
