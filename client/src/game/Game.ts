import * as THREE from 'three';
import { GameScene } from './Scene';
import { GameCamera } from './Camera';
import { Player } from './Player';
import { PlatformManager } from './PlatformManager';
import { InputHandler } from './InputHandler';
import { PhysicsEngine } from './PhysicsEngine';
import { ScoreManager } from './ScoreManager';
import { ParticleSystem } from './ParticleSystem';
import { AudioManager } from './AudioManager';
import { GameState, ScoreEvent } from '../utils/Types';
import {
  CHARGE_SPEED,
  MAX_CHARGE_TIME,
  PLAYER_Y_OFFSET,
} from '../utils/Constants';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Main game controller – orchestrates all subsystems.
 */
export class Game {
  // Subsystems
  private gameScene: GameScene;
  private gameCamera: GameCamera;
  private player: Player;
  private platformManager: PlatformManager;
  private inputHandler: InputHandler;
  private physics: PhysicsEngine;
  private scoreManager: ScoreManager;
  private particles: ParticleSystem;
  private audio: AudioManager;
  private composer: EffectComposer;

  // State
  private state: GameState = GameState.READY;
  private chargeTime = 0;
  private clock = new THREE.Clock();
  private elapsedTime = 0;
  private animFrameId = 0;

  // Fall animation
  private fallVelocity = 0;
  private fallTimer = 0;

  // UI callbacks
  public onScoreUpdate: ((event: ScoreEvent) => void) | null = null;
  public onGameOver: ((score: number, isRecord: boolean, combo: number, jumps: number) => void) | null = null;
  public onCombo: ((combo: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.gameScene = new GameScene(container);
    this.gameCamera = new GameCamera(container);
    this.player = new Player();
    this.platformManager = new PlatformManager(this.gameScene.scene);
    this.physics = new PhysicsEngine();
    this.scoreManager = new ScoreManager();
    this.particles = new ParticleSystem(this.gameScene.scene);
    this.audio = new AudioManager();

    this.inputHandler = new InputHandler(container, (type) => {
      if (type === 'start') this.onInputStart();
      else this.onInputEnd();
    });

    // Add player to scene
    this.gameScene.scene.add(this.player.group);

    // Score events
    this.scoreManager.onScore((event) => {
      this.onScoreUpdate?.(event);
      if (event.combo >= 2) {
        this.onCombo?.(event.combo);
      }
    });

    // Setup Post-Processing (Bloom)
    this.composer = new EffectComposer(this.gameScene.renderer);
    const renderPass = new RenderPass(this.gameScene.scene, this.gameCamera.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    this.composer.addPass(bloomPass);

    // Resize camera on window resize
    window.addEventListener('resize', () => {
      const cam = this.gameCamera.camera;
      this.gameScene.renderer.setSize(container.clientWidth, container.clientHeight);
      this.composer.setSize(container.clientWidth, container.clientHeight);
      cam.updateProjectionMatrix();
    });
  }

  /** Start or restart the game. */
  public start(): void {
    this.state = GameState.READY;
    this.chargeTime = 0;
    this.fallVelocity = 0;
    this.fallTimer = 0;
    this.scoreManager.reset();
    this.particles.clear();

    // Reset platforms
    this.platformManager.init();

    // Place player on first platform
    const firstPlatform = this.platformManager.getCurrentPlatform();
    this.player.setPosition(
      firstPlatform.position.x,
      0,
      firstPlatform.position.z,
    );
    this.player.resetScale();
    this.player.resetRotation();

    // Face toward next platform
    const dir = this.platformManager.getJumpDirection();
    this.player.faceDirection(dir);

    // Snap camera
    const midPoint = firstPlatform.position.clone()
      .add(this.platformManager.getNextPlatform().position)
      .multiplyScalar(0.5);
    midPoint.y = 0;
    this.gameCamera.snapToTarget(midPoint);

    this.inputHandler.setEnabled(true);
    this.clock.start();

    // Start game loop
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.update();
  }

  /** Main game loop. */
  private update = (): void => {
    this.animFrameId = requestAnimationFrame(this.update);

    const dt = Math.min(this.clock.getDelta(), 0.05); // Cap delta
    this.elapsedTime += dt;

    switch (this.state) {
      case GameState.READY:
        this.player.updateIdle(this.elapsedTime);
        break;

      case GameState.CHARGING:
        this.chargeTime = Math.min(this.chargeTime + dt * CHARGE_SPEED, MAX_CHARGE_TIME);
        this.player.updateCharge(this.chargeTime);
        this.platformManager.getCurrentPlatform().updateCharge(this.chargeTime);
        // Charge tick sound (every ~0.12s)
        if (Math.floor(this.chargeTime / 0.12) !== Math.floor((this.chargeTime - dt * CHARGE_SPEED) / 0.12)) {
          this.audio.playCharge(this.chargeTime / MAX_CHARGE_TIME);
        }
        // Emit charge particles
        if (Math.random() > 0.5) {
          this.particles.emitTrail(this.player.getPosition());
        }
        break;

      case GameState.JUMPING: {
        // Emit trail particles
        this.particles.emitTrail(this.player.getPosition());
        
        const result = this.physics.update(dt);
        if (result) {
          if (result.landed) {
            this.handleLanding(result.isCenter, result.distanceFromCenter);
          } else {
            this.handleMiss();
          }
        }
        break;
      }

      case GameState.FALLING:
        this.fallTimer += dt;
        this.fallVelocity += 15 * dt; // gravity
        const pos = this.player.getPosition();
        this.player.setWorldPosition(
          new THREE.Vector3(pos.x, pos.y - this.fallVelocity * dt, pos.z)
        );
        // Spin during fall
        this.player.setJumpTilt(this.fallTimer * 3);

        if (pos.y < -5) {
          this.triggerGameOver();
        }
        break;

      case GameState.GAME_OVER:
        // Idle state, waiting for restart
        break;
    }

    // Update camera & particles
    this.gameCamera.update(dt);
    this.particles.update(dt);

    // Render
    this.composer.render();
  };

  private onInputStart(): void {
    if (this.state !== GameState.READY) return;
    this.state = GameState.CHARGING;
    this.chargeTime = 0;
  }

  private onInputEnd(): void {
    if (this.state !== GameState.CHARGING) return;
    this.state = GameState.JUMPING;

    // Reset visuals
    this.player.resetScale();
    this.platformManager.getCurrentPlatform().resetSink();

    // Jump sound
    this.audio.playJump();

    // Get jump parameters
    const currentPlatform = this.platformManager.getCurrentPlatform();
    const nextPlatform = this.platformManager.getNextPlatform();
    const direction = this.platformManager.getJumpDirection();

    // Start physics jump
    this.physics.startJump(
      this.player,
      this.chargeTime,
      direction,
      currentPlatform.position,
      nextPlatform,
    );
  }

  private handleLanding(isCenter: boolean, distFromCenter: number): void {
    this.state = GameState.LANDING;

    const nextPlatform = this.platformManager.getNextPlatform();
    const scoreEvent = this.scoreManager.addScore(isCenter, nextPlatform.isSpecial);

    // Sound effects
    if (nextPlatform.isSpecial) {
      this.audio.playSpecial();
    } else if (isCenter && scoreEvent.combo >= 2) {
      this.audio.playCombo(scoreEvent.combo);
    } else if (isCenter) {
      this.audio.playCenter();
    } else {
      this.audio.playLand();
    }

    // Particle effects
    const landPos = this.player.getPosition();
    if (isCenter) {
      this.particles.emitCenterLanding(landPos);
    } else {
      this.particles.emitNormalLanding(landPos);
    }

    // Easter egg: special platform full-screen effect
    if (nextPlatform.isSpecial) {
      this.triggerEasterEgg();
    }

    // Advance to next platform
    this.platformManager.advance();
    this.platformManager.generateNext();

    // Face new direction
    const dir = this.platformManager.getJumpDirection();
    this.player.faceDirection(dir);

    // Move camera to midpoint between current and next
    const current = this.platformManager.getCurrentPlatform();
    const next = this.platformManager.getNextPlatform();
    const midPoint = current.position.clone()
      .add(next.position)
      .multiplyScalar(0.5);
    midPoint.y = 0;
    this.gameCamera.setTarget(midPoint);

    // Brief landing delay then ready
    setTimeout(() => {
      if (this.state === GameState.LANDING) {
        this.state = GameState.READY;
      }
    }, 150);
  }

  private handleMiss(): void {
    this.state = GameState.FALLING;
    this.fallVelocity = 0;
    this.fallTimer = 0;
    this.inputHandler.setEnabled(false);
    this.audio.playGameOver();
  }

  private triggerGameOver(): void {
    this.state = GameState.GAME_OVER;
    this.inputHandler.setEnabled(false);

    const isRecord = this.scoreManager.finalize();
    this.onGameOver?.(
      this.scoreManager.getScore(),
      isRecord,
      this.scoreManager.getMaxCombo(),
      this.scoreManager.getJumps(),
    );
  }

  private triggerEasterEgg(): void {
    // Fire confetti / fireworks on the effects canvas
    const canvas = document.getElementById('effects-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    canvas.classList.remove('hidden');
    this.spawnConfetti(canvas);
    setTimeout(() => canvas.classList.add('hidden'), 2500);
  }

  private spawnConfetti(canvas: HTMLCanvasElement): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; rotation: number; rv: number }[] = [];
    const colors = ['#2AABEE', '#FFD700', '#FF6B6B', '#5CB85C', '#9B59B6', '#FF9F43'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 15 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rv: (Math.random() - 0.5) * 0.3,
      });
    }

    let frame = 0;
    const maxFrames = 150;

    const animate = () => {
      if (frame >= maxFrames) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.rv;
        p.vx *= 0.99;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      requestAnimationFrame(animate);
    };
    animate();
  }

  public getBestScore(): number {
    return this.scoreManager.getBestScore();
  }

  public getState(): GameState {
    return this.state;
  }

  /** Get audio manager for external mute control. */
  public getAudio(): AudioManager {
    return this.audio;
  }

  public dispose(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.inputHandler.dispose();
    this.gameScene.dispose();
    this.gameCamera.dispose();
    this.player.dispose();
    this.platformManager.dispose();
    this.audio.dispose();
  }
}
