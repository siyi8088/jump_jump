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
    // ── 绝对正宗的 TG Logo 几何体 (不对称 3D 建模) ──
    const geo = new THREE.BufferGeometry();
    const s = 1.3; 

    // 严格按照 TG Logo 的三个块面进行顶点映射
    const vertices = new Float32Array([
      // 0: 机头 (Nose - 永远指向前)
       0.0 * s,   0.0 * s,  -1.5 * s,
      // 1: 左翼尖 (Left Wing - 标志性的宽大左翼，向后延伸)
      -1.2 * s,   0.2 * s,   1.0 * s,
      // 2: 右翼尖 (Right Wing - 较窄且靠前的右翼)
       0.8 * s,   0.3 * s,  -0.2 * s,
      // 3: 内部折返点 (Inner Fold - 视错觉的交汇处)
      -0.4 * s,  -0.2 * s,   0.6 * s,
      // 4: 底部阴影垂翼 (Bottom Flap - Logo 下方的那块深色三角)
      -0.3 * s,  -0.8 * s,   0.8 * s,
    ]);

    const indices = [
      0, 1, 3, // 面1：主左翼 (Logo 面积最大的浅蓝色部分)
      0, 3, 2, // 面2：副右翼 (Logo 右侧的中蓝色部分)
      1, 4, 3, // 面3：底部下垂翼 (Logo 下方的深蓝色阴影部分)
    ];

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // ── 纯正的 TG 蓝材质 ──
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2AABEE,        // 换成纯正的 TG 蓝本体！
      roughness: 0.1,         // 稍微光滑一点
      metalness: 0.2,
      side: THREE.DoubleSide, // 极其重要：因为是不对称开放图形，必须双面渲染
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);

    // ── 点睛之笔：保留极客白边 ──
    // 加上白色的描边，让它在暗色背景里极其锐利，完美贴合你发来的 icon 质感
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    });
    const lineSegments = new THREE.LineSegments(edges, lineMat);
    mesh.add(lineSegments);

    // 因为是不对称图形，稍微调整一下初始倾角，让它在正交相机下完美呈现 Logo 的角度
    mesh.rotation.z = Math.PI / 16; 
    mesh.rotation.x = -Math.PI / 24;

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
