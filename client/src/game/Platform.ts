import * as THREE from 'three';
import {
  PLATFORM_HEIGHT,
  PLATFORM_SINK_AMOUNT,
  MAX_CHARGE_TIME,
  COLORS,
  PlatformType,
} from '../utils/Constants';

/**
 * Individual platform entity with TG-themed geometry.
 */
export class Platform {
  public group: THREE.Group;
  public type: PlatformType;
  public size: number;
  public isSpecial: boolean;
  public position: THREE.Vector3;

  private baseMesh: THREE.Mesh;
  private decorations: THREE.Group;
  private originalY: number;

  constructor(type: PlatformType, size: number, position: THREE.Vector3, isSpecial = false) {
    this.type = type;
    this.size = size;
    this.isSpecial = isSpecial;
    this.position = position.clone();

    this.group = new THREE.Group();
    this.decorations = new THREE.Group();

    this.baseMesh = this.createMesh();
    this.group.add(this.baseMesh);
    this.group.add(this.decorations);

    this.group.position.copy(position);
    this.originalY = position.y;

    this.baseMesh.castShadow = true;
    this.baseMesh.receiveShadow = true;
  }

  private createMesh(): THREE.Mesh {
    switch (this.type) {
      case PlatformType.BUBBLE:    return this.createBubble();
      case PlatformType.CHECKMARK: return this.createCheckmark();
      case PlatformType.PADLOCK:   return this.createPadlock();
      case PlatformType.SERVER:    return this.createServer();
      default:                     return this.createBubble();
    }
  }

  private createBubble(): THREE.Mesh {
    const s = this.size;
    const geo = new THREE.BoxGeometry(s, PLATFORM_HEIGHT, s);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1A3848, // Dark teal base
      emissive: COLORS.CYAN,
      emissiveIntensity: 0.5,
      roughness: 0.15,
      metalness: 0.7,
    });

    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({ color: COLORS.CYAN });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.decorations.add(edges);

    // Add a small "tail" triangle (message bubble tail)
    const tailGeo = new THREE.ConeGeometry(0.12, 0.18, 3);
    const tailMat = new THREE.MeshStandardMaterial({ color: COLORS.CYAN, emissive: COLORS.CYAN, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.7 });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(-s / 2 - 0.06, -PLATFORM_HEIGHT / 2 + 0.08, -s / 2 + 0.2);
    tail.rotation.z = Math.PI / 2 + 0.3;
    tail.castShadow = true;
    this.decorations.add(tail);

    return new THREE.Mesh(geo, mat);
  }

  /** Green verification checkmark cylinder */
  private createCheckmark(): THREE.Mesh {
    const r = this.size / 2;
    const geo = new THREE.CylinderGeometry(r, r, PLATFORM_HEIGHT, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0A2A0A, // Dark green base
      emissive: COLORS.TG_GREEN,
      emissiveIntensity: 0.5,
      roughness: 0.15,
      metalness: 0.7,
    });

    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({ color: COLORS.TG_GREEN });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.decorations.add(edges);

    // Add checkmark on top
    this.addCheckmarkSymbol(r);

    return new THREE.Mesh(geo, mat);
  }

  private addCheckmarkSymbol(radius: number): void {
    const shape = new THREE.Shape();
    const s = radius * 0.5;
    // Simple "V" check shape
    shape.moveTo(-s * 0.6, 0);
    shape.lineTo(-s * 0.15, -s * 0.5);
    shape.lineTo(s * 0.7, s * 0.5);
    shape.lineTo(s * 0.55, s * 0.65);
    shape.lineTo(-s * 0.15, -s * 0.2);
    shape.lineTo(-s * 0.45, s * 0.15);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.1 });
    const check = new THREE.Mesh(geo, mat);
    check.rotation.x = -Math.PI / 2;
    check.position.y = PLATFORM_HEIGHT / 2 + 0.02;
    this.decorations.add(check);
  }

  /** Golden padlock */
  private createPadlock(): THREE.Mesh {
    const s = this.size;
    const geo = new THREE.BoxGeometry(s, PLATFORM_HEIGHT, s);
    
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3A2800, // Dark amber base
      emissive: COLORS.PADLOCK_GOLD,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.8,
    });

    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({ color: COLORS.PADLOCK_GOLD });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.decorations.add(edges);

    // Add lock shackle on top
    const shackleGeo = new THREE.TorusGeometry(s * 0.2, 0.04, 8, 16, Math.PI);
    const shackleMat = new THREE.MeshStandardMaterial({
      color: COLORS.PADLOCK_GOLD,
      emissive: COLORS.PADLOCK_GOLD,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.9,
    });
    const shackle = new THREE.Mesh(shackleGeo, shackleMat);
    shackle.position.y = PLATFORM_HEIGHT / 2 + s * 0.15;
    shackle.rotation.x = 0;
    this.decorations.add(shackle);

    // Keyhole
    const keyGeo = new THREE.CircleGeometry(s * 0.06, 12);
    const keyMat = new THREE.MeshStandardMaterial({ color: 0x0A0A0A, roughness: 0.8 });
    const keyhole = new THREE.Mesh(keyGeo, keyMat);
    keyhole.position.set(0, PLATFORM_HEIGHT / 2 + 0.01, s * 0.08);
    keyhole.rotation.x = -Math.PI / 2;
    this.decorations.add(keyhole);

    return new THREE.Mesh(geo, mat);
  }

  /** Dark server rack */
  private createServer(): THREE.Mesh {
    const s = this.size;
    const geo = new THREE.BoxGeometry(s, PLATFORM_HEIGHT * 1.2, s * 0.7);
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.SERVER_DARK,
      emissive: COLORS.CRIMSON,
      emissiveIntensity: 0.3,
      roughness: 0.15,
      metalness: 0.8,
    });

    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({ color: COLORS.CRIMSON });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.decorations.add(edges);

    // LED dots on top — bright emissive
    for (let i = 0; i < 3; i++) {
      const ledGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const ledColor = [0x00ff66, 0x00ff66, 0xff6600][i];
      const ledMat = new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 2.0 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(-s * 0.2 + i * s * 0.2, PLATFORM_HEIGHT * 0.6 + 0.02, -s * 0.2);
      this.decorations.add(led);
    }

    // Horizontal rack lines
    for (let i = 0; i < 2; i++) {
      const lineGeo = new THREE.BoxGeometry(s * 0.8, 0.02, 0.02);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0x4488AA, emissive: 0x224466, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.5 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, PLATFORM_HEIGHT * 0.6 + 0.01, -s * 0.05 + i * s * 0.2);
      this.decorations.add(line);
    }

    return new THREE.Mesh(geo, mat);
  }

  /** (Removed roundBoxEdges for sharp geometry) */

  /** Sink platform during charge. */
  public updateCharge(chargeTime: number): void {
    const ratio = Math.min(chargeTime / MAX_CHARGE_TIME, 1.0);
    this.group.position.y = this.originalY - ratio * PLATFORM_SINK_AMOUNT;
  }

  /** Reset to original height. */
  public resetSink(): void {
    this.group.position.y = this.originalY;
  }

  /** Check if a point (x, z) is on this platform. */
  public containsPoint(x: number, z: number): boolean {
    const px = this.position.x;
    const pz = this.position.z;

    if (this.type === PlatformType.CHECKMARK) {
      // Circular check
      const r = this.size / 2;
      const dx = x - px;
      const dz = z - pz;
      return (dx * dx + dz * dz) <= r * r;
    }

    // Rectangular check (BUBBLE, PADLOCK, SERVER)
    const halfSize = this.size / 2;
    const depthHalf = this.type === PlatformType.SERVER ? this.size * 0.35 : halfSize;
    return (
      x >= px - halfSize && x <= px + halfSize &&
      z >= pz - depthHalf && z <= pz + depthHalf
    );
  }

  /** Distance from center. */
  public distanceFromCenter(x: number, z: number): number {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  public dispose(): void {
    this.baseMesh.geometry.dispose();
    (this.baseMesh.material as THREE.Material).dispose();
    this.decorations.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
