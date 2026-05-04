import * as THREE from 'three';
import {
  CAMERA_FRUSTUM,
  CAMERA_DISTANCE,
  CAMERA_ELEVATION,
  CAMERA_AZIMUTH,
  CAMERA_LERP_SPEED,
} from '../utils/Constants';

/**
 * Isometric orthographic camera with smooth follow.
 */
export class GameCamera {
  public camera: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private aspect: number;

  constructor(container: HTMLElement) {
    this.aspect = container.clientWidth / container.clientHeight;

    const hFrustum = CAMERA_FRUSTUM * this.aspect;
    this.camera = new THREE.OrthographicCamera(
      -hFrustum, hFrustum,
      CAMERA_FRUSTUM, -CAMERA_FRUSTUM,
      0.1, 100
    );

    this.updateCameraPosition(new THREE.Vector3(0, 0, 0));
    this.currentLookAt.copy(this.target);

    window.addEventListener('resize', this.onResize);
  }

  /** Set camera offset position based on isometric angles. */
  private updateCameraPosition(lookAt: THREE.Vector3): void {
    const d = CAMERA_DISTANCE;
    const elev = CAMERA_ELEVATION;
    const azim = CAMERA_AZIMUTH;

    this.camera.position.set(
      lookAt.x + d * Math.cos(elev) * Math.sin(azim),
      lookAt.y + d * Math.sin(elev),
      lookAt.z + d * Math.cos(elev) * Math.cos(azim),
    );
    this.camera.lookAt(lookAt);
  }

  /** Smoothly follow a world position. */
  public setTarget(pos: THREE.Vector3): void {
    this.target.copy(pos);
  }

  /** Instantly snap to target (for game start). */
  public snapToTarget(pos: THREE.Vector3): void {
    this.target.copy(pos);
    this.currentLookAt.copy(pos);
    this.updateCameraPosition(pos);
  }

  /** Call every frame. */
  public update(dt: number): void {
    const lerpFactor = 1 - Math.exp(-CAMERA_LERP_SPEED * dt);
    this.currentLookAt.lerp(this.target, lerpFactor);
    this.updateCameraPosition(this.currentLookAt);
  }

  private onResize = (): void => {
    const container = this.camera.userData.container as HTMLElement | undefined;
    if (!container) return;
    this.aspect = container.clientWidth / container.clientHeight;
    const hFrustum = CAMERA_FRUSTUM * this.aspect;
    this.camera.left   = -hFrustum;
    this.camera.right  =  hFrustum;
    this.camera.updateProjectionMatrix();
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
  }
}
