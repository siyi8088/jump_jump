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
      color: 0x44CCEE, // Bright cyan surface
      emissive: COLORS.CYAN,
      emissiveIntensity: 0.3,
      roughness: 0.05,
      metalness: 0.6,
    });

    // Glowing edge lines (MeshBasicMaterial so bloom picks them up)
    this.addGlowingEdges(geo, COLORS.CYAN);

    // Bottom glow ring
    this.addBottomGlow(s, COLORS.CYAN);

    return new THREE.Mesh(geo, mat);
  }

  /** Green verification checkmark cylinder */
  private createCheckmark(): THREE.Mesh {
    const r = this.size / 2;
    const geo = new THREE.CylinderGeometry(r, r, PLATFORM_HEIGHT, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x33DD44, // Bright green surface
      emissive: COLORS.TG_GREEN,
      emissiveIntensity: 0.4,
      roughness: 0.05,
      metalness: 0.5,
    });

    this.addGlowingEdges(geo, COLORS.TG_GREEN);
    this.addBottomGlow(r * 2, COLORS.TG_GREEN);

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
      color: 0xEEBB33, // Bright warm gold surface
      emissive: 0xDD9900,
      emissiveIntensity: 0.3,
      roughness: 0.05,
      metalness: 0.9,
    });

    this.addGlowingEdges(geo, COLORS.PADLOCK_GOLD);

    // Add lock shackle on top
    const shackleGeo = new THREE.TorusGeometry(s * 0.2, 0.04, 8, 16, Math.PI);
    const shackleMat = new THREE.MeshStandardMaterial({
      color: COLORS.PADLOCK_GOLD,
      emissive: COLORS.PADLOCK_GOLD,
      emissiveIntensity: 0.5,
      roughness: 0.05,
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
      color: 0x2A2A3E, // Dark indigo
      emissive: 0x1A1A2E,
      emissiveIntensity: 0.15,
      roughness: 0.05,
      metalness: 0.9,
    });

    this.addGlowingEdges(geo, 0x4488AA);

    // LED dots on top — bright emissive
    for (let i = 0; i < 3; i++) {
      const ledGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const ledColor = [0x00ff66, 0xff2244, 0xff8800][i];
      const ledMat = new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 3.0 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(-s * 0.2 + i * s * 0.2, PLATFORM_HEIGHT * 0.6 + 0.02, -s * 0.2);
      this.decorations.add(led);
    }

    // Horizontal rack lines — bright cyan
    for (let i = 0; i < 2; i++) {
      const lineGeo = new THREE.BoxGeometry(s * 0.8, 0.025, 0.025);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0x00C8FF, emissive: 0x00C8FF, emissiveIntensity: 1.0, roughness: 0.0, metalness: 0.0 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, PLATFORM_HEIGHT * 0.6 + 0.01, -s * 0.05 + i * s * 0.2);
      this.decorations.add(line);
    }

    return new THREE.Mesh(geo, mat);
  }

  /** Add glowing edge outlines using MeshBasicMaterial (participates in Bloom). */
  private addGlowingEdges(geo: THREE.BufferGeometry, color: number): void {
    const edgesGeo = new THREE.EdgesGeometry(geo);
    // Use MeshBasicMaterial — it outputs full brightness which triggers Bloom
    const edgesMat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.decorations.add(edges);

    // Additionally add thin glowing box outlines on top & bottom edges for Bloom pickup
    // Top edge glow strip
    const topGlowGeo = new THREE.BoxGeometry(
      geo.boundingBox ? geo.boundingBox.max.x * 2 : this.size,
      0.015,
      geo.boundingBox ? geo.boundingBox.max.z * 2 : this.size
    );
    geo.computeBoundingBox();
    const h = geo.boundingBox ? geo.boundingBox.max.y : PLATFORM_HEIGHT / 2;
    const topGlowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const topGlow = new THREE.Mesh(topGlowGeo, topGlowMat);
    topGlow.position.y = h;
    this.decorations.add(topGlow);
  }

  /** Add a subtle glow ring underneath a platform. */
  private addBottomGlow(size: number, color: number): void {
    const ringGeo = new THREE.RingGeometry(size * 0.4, size * 0.55, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -PLATFORM_HEIGHT / 2 - 0.01;
    this.decorations.add(ring);
  }

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
