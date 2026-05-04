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
    this.scene.fog = new THREE.Fog(COLORS.BG_TOP, 10, 35);

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
    this.renderer.toneMappingExposure = 1.0; // Normal exposure
    container.appendChild(this.renderer.domElement);

    // ── Lighting ──
    this.setupLights();

    // ── Ground plane ──
    this.setupGround();

    // ── Resize ──
    window.addEventListener('resize', this.onResize);
  }

  private setupLights(): void {
    // Soft ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Hemisphere (sky / ground)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemi);

    // Main directional (key light) - cast soft shadows
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 10, 7);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left   = -CAMERA_FRUSTUM * 2;
    dir.shadow.camera.right  =  CAMERA_FRUSTUM * 2;
    dir.shadow.camera.top    =  CAMERA_FRUSTUM * 2;
    dir.shadow.camera.bottom = -CAMERA_FRUSTUM * 2;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far  = 50;
    dir.shadow.bias = -0.001;
    this.scene.add(dir);

    // Fill light
    const fill = new THREE.DirectionalLight(0x90b0d0, 0.5);
    fill.position.set(-5, 3, -5);
    this.scene.add(fill);
  }

  private setupGround(): void {
    // Very subtle, clean grid
    const gridHelper = new THREE.GridHelper(200, 80, 0xffffff, 0xffffff);
    gridHelper.position.y = -0.5;
    const mat = gridHelper.material;
    if (Array.isArray(mat)) {
      mat.forEach(m => { m.transparent = true; m.opacity = 0.05; });
    } else {
      mat.transparent = true;
      mat.opacity = 0.05;
    }
    this.scene.add(gridHelper);
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
