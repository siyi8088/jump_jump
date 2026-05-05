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
    const s = 1.25; 
    // 设定纸张厚度，让边缘在光照下产生高光
    const t = 0.06 * s; 

    // ── ✨ 终极带厚度实体折纸模型 (12顶点) ✨ ──
    const vertices = new Float32Array([
        // --- 上层表面 (Top Layer) : 保持你微调的完美比例 ---
        0.0,       0.0,      -1.0 * s, // 0: 机头 (Nose)
      -0.95 * s,  0.15 * s,   1.3 * s, // 1: 左翼尖
        0.95 * s,  0.15 * s,   1.3 * s, // 2: 右翼尖
      -0.21 * s,   0.2 * s,   1.0 * s, // 3: 左机背折痕 
        0.21 * s,   0.2 * s,   1.0 * s, // 4: 右机背折痕 
        0.0,      -0.4 * s,   1.0 * s, // 5: 底部深龙骨 

        // --- 下层表面 (Bottom Layer) : 整体在Y轴向下平移厚度 t ---
        0.0,       0.0 - t,      -1.0 * s, // 6: 底机头
      -0.95 * s,  0.15 * s - t,   1.3 * s, // 7: 底左翼尖
        0.95 * s,  0.15 * s - t,   1.3 * s, // 8: 底右翼尖
      -0.21 * s,   0.2 * s - t,   1.0 * s, // 9: 底左机背
        0.21 * s,   0.2 * s - t,   1.0 * s, // 10:底右机背
        0.0,      -0.4 * s - t,   1.0 * s, // 11:底龙骨
    ]);

    // 完美缝合的 20 个三角面，构成完整的封闭外壳
    const indices = [
      // --- 上表面 ---
      0, 1, 3, 
      0, 4, 2, 
      0, 3, 5, 
      0, 5, 4,
      
      // --- 下表面 (反向缠绕，确保法线朝外) ---
      6, 9, 7,   
      6, 8, 10,  
      6, 11, 9,  
      6, 10, 11,
      
      // --- 侧面四周封边 (缝合上下层) ---
      0, 6, 8,   0, 8, 2,   // 右前边缘 (0->2)
      2, 8, 10,  2, 10, 4,  // 右后翼边缘 (2->4)
      4, 10, 11, 4, 11, 5,  // 右机腹边缘 (4->5)
      5, 11, 9,  5, 9, 3,   // 左机腹边缘 (5->3)
      3, 9, 7,   3, 7, 1,   // 左后翼边缘 (3->1)
      1, 7, 6,   1, 6, 0    // 左前边缘 (1->0)
    ];

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    
    // 自动计算法线，产生实体 3D 光影
    geo.computeVertexNormals();
    
    // 💡【修复】将几何体旋转 180 度，使得机头朝向与移动方向 (dir) 一致
    geo.rotateY(Math.PI);

    // ── 材质：抗过曝、纯正纸张漫反射 ──
    const mat = new THREE.MeshStandardMaterial({
      color: 0x289FE9,        // 保持你想要的 TG 蓝本体
      emissive: 0x062845,     // 💡【核心修改】换成极深的暗蓝色！只给阴影微微垫底，绝不让受光面过曝
      emissiveIntensity: 0.8, // 配合深色，保持阴影不死黑
      roughness: 0.5,         // 💡【核心修改】调高粗糙度！纸张表面是粗糙的，这样能彻底消除那种“塑料反光”
      metalness: 0.0,         // 💡【核心修改】纸飞机不导电，金属度设为 0
      flatShading: true,      
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);

    // ── 保留高光白边 ──
    // 给所有物理折痕和厚度切面加上白边，增强赛博感
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true,
      opacity: 0.8
    });
    const lineSegments = new THREE.LineSegments(edges, lineMat);
    mesh.add(lineSegments);

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