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
    this.renderer.toneMappingExposure = 1.5;
    container.appendChild(this.renderer.domElement);

    // ── Lighting ──
    this.setupLights();

    // ── Ground plane ──
    this.setupGround();

    // ── Resize ──
    window.addEventListener('resize', this.onResize);
  }

  private setupLights(): void {
    // Ambient — brighter so objects aren't lost in shadow
    const ambient = new THREE.AmbientLight(COLORS.AMBIENT, 1.0);
    this.scene.add(ambient);

    // Hemisphere (sky / ground) — blue sky, dark ground
    const hemi = new THREE.HemisphereLight(0x4488cc, 0x112244, 0.6);
    this.scene.add(hemi);

    // Main directional (key light)
    const dir = new THREE.DirectionalLight(COLORS.DIRECTIONAL, 1.8);
    dir.position.set(8, 18, 10);
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

    // Blue fill light — gives the cyberpunk tint from below-left
    const fill = new THREE.DirectionalLight(0x2288FF, 0.5);
    fill.position.set(-5, 3, -5);
    this.scene.add(fill);

    // Cyan point light that follows camera area for extra glow
    const pointLight = new THREE.PointLight(0x00C8FF, 0.8, 30);
    pointLight.position.set(0, 8, 0);
    this.scene.add(pointLight);
  }

  private setupGround(): void {
    // Cyberpunk Neon Grid — brighter primary, visible secondary
    const gridHelper = new THREE.GridHelper(200, 80, 0x00C8FF, 0x1A3050);
    gridHelper.position.y = -0.5;
    // Make grid lines translucent but visible
    const mat = gridHelper.material;
    if (Array.isArray(mat)) {
      mat.forEach(m => { m.transparent = true; m.opacity = 0.6; });
    } else {
      mat.transparent = true;
      mat.opacity = 0.6;
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
