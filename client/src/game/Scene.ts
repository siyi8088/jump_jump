import * as THREE from 'three';
import { COLORS, CAMERA_FRUSTUM } from '../utils/Constants';

/**
 * Manages the Three.js scene, renderer, and lighting.
 */
export class GameScene {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.BG_TOP);
    this.scene.fog = new THREE.Fog(COLORS.BG_TOP, 20, 40);

    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // ── Lighting ──
    this.setupLights();

    // ── Ground plane ──
    this.setupGround();

    // ── Resize ──
    window.addEventListener('resize', this.onResize);
  }

  private setupLights(): void {
    // Ambient
    const ambient = new THREE.AmbientLight(COLORS.AMBIENT, 0.6);
    this.scene.add(ambient);

    // Hemisphere (sky / ground)
    const hemi = new THREE.HemisphereLight(0x8899cc, 0x223344, 0.4);
    this.scene.add(hemi);

    // Main directional (sun)
    const dir = new THREE.DirectionalLight(COLORS.DIRECTIONAL, 1.0);
    dir.position.set(8, 15, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left   = -CAMERA_FRUSTUM * 2;
    dir.shadow.camera.right  =  CAMERA_FRUSTUM * 2;
    dir.shadow.camera.top    =  CAMERA_FRUSTUM * 2;
    dir.shadow.camera.bottom = -CAMERA_FRUSTUM * 2;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far  = 40;
    dir.shadow.bias = -0.002;
    this.scene.add(dir);

    // Fill light (subtle blue tint from TG palette)
    const fill = new THREE.DirectionalLight(0x2aabee, 0.15);
    fill.position.set(-5, 3, -5);
    this.scene.add(fill);
  }

  private setupGround(): void {
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.GROUND,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  public render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
