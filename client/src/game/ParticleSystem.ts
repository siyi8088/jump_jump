import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

/**
 * Simple 3D particle system for landing effects.
 */
export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private meshes: THREE.Mesh[] = [];
  private pool: THREE.Mesh[] = [];

  private geometry = new THREE.SphereGeometry(0.04, 4, 4);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Emit particles for a center landing (gold stars). */
  public emitCenterLanding(pos: THREE.Vector3): void {
    const colors = [
      new THREE.Color(0xffd700),
      new THREE.Color(0xffa500),
      new THREE.Color(0x2aabee),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < 20; i++) {
      this.spawn(pos, colors[i % colors.length], 0.06, 1.2);
    }
  }

  /** Emit particles for normal landing (subtle). */
  public emitNormalLanding(pos: THREE.Vector3): void {
    const color = new THREE.Color(0x888888);
    for (let i = 0; i < 6; i++) {
      this.spawn(pos, color, 0.03, 0.6);
    }
  }

  private spawn(origin: THREE.Vector3, color: THREE.Color, size: number, life: number): void {
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 4 + 1,
      (Math.random() - 0.5) * 3,
    );

    const particle: Particle = {
      position: origin.clone(),
      velocity,
      life,
      maxLife: life,
      color,
      size,
    };

    // Get or create mesh
    let mesh: THREE.Mesh;
    if (this.pool.length > 0) {
      mesh = this.pool.pop()!;
      (mesh.material as THREE.MeshBasicMaterial).color.copy(color);
      mesh.visible = true;
    } else {
      const mat = new THREE.MeshBasicMaterial({ color });
      mesh = new THREE.Mesh(this.geometry, mat);
      this.scene.add(mesh);
    }

    mesh.position.copy(origin);
    mesh.scale.setScalar(size / 0.04);
    this.meshes.push(mesh);
    this.particles.push(particle);
  }

  /** Update all particles. */
  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        // Return to pool
        const mesh = this.meshes[i];
        mesh.visible = false;
        this.pool.push(mesh);
        this.particles.splice(i, 1);
        this.meshes.splice(i, 1);
        continue;
      }

      // Physics
      p.velocity.y -= 8 * dt; // gravity
      p.position.addScaledVector(p.velocity, dt);

      // Update mesh
      const mesh = this.meshes[i];
      mesh.position.copy(p.position);

      // Fade out
      const alpha = p.life / p.maxLife;
      mesh.scale.setScalar((p.size / 0.04) * alpha);
    }
  }

  public clear(): void {
    for (const mesh of this.meshes) {
      mesh.visible = false;
      this.pool.push(mesh);
    }
    this.meshes = [];
    this.particles = [];
  }

  public dispose(): void {
    for (const mesh of [...this.meshes, ...this.pool]) {
      this.scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    }
    this.geometry.dispose();
  }
}
