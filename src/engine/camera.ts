import { Vector2 } from '../types';

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public viewportWidth: number = 1280;
  public viewportHeight: number = 720;
  
  private shakeTime: number = 0;
  private shakeMagnitude: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public resize(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public shake(magnitude: number, duration: number) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  public update(dt: number, focusX: number, focusY: number, mouseLookAheadX: number = 0, mouseLookAheadY: number = 0) {
    // Lead slightly towards mouse aim
    this.targetX = focusX + mouseLookAheadX * 0.15 - this.viewportWidth / 2;
    this.targetY = focusY + mouseLookAheadY * 0.15 - this.viewportHeight / 2;

    // Smooth lerp
    this.x += (this.targetX - this.x) * Math.min(1, 10 * dt);
    this.y += (this.targetY - this.y) * Math.min(1, 10 * dt);

    // Screen shake
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const progress = this.shakeTime;
      const currentMag = this.shakeMagnitude * Math.min(1, progress * 4);
      this.offsetX = (Math.random() * 2 - 1) * currentMag;
      this.offsetY = (Math.random() * 2 - 1) * currentMag;
      if (this.shakeTime <= 0) {
        this.shakeMagnitude = 0;
        this.offsetX = 0;
        this.offsetY = 0;
      }
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  public getScreenPos(worldX: number, worldY: number): Vector2 {
    return {
      x: worldX - this.x + this.offsetX,
      y: worldY - this.y + this.offsetY
    };
  }

  public getWorldPos(screenX: number, screenY: number): Vector2 {
    return {
      x: screenX + this.x - this.offsetX,
      y: screenY + this.y - this.offsetY
    };
  }

  public applyTransform(ctx: CanvasRenderingContext2D) {
    ctx.translate(-Math.round(this.x - this.offsetX), -Math.round(this.y - this.offsetY));
  }
}
