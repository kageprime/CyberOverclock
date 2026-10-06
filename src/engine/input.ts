import { Vector2 } from '../types';

export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  
  public mousePos: Vector2 = { x: 0, y: 0 };
  public mouseWorldPos: Vector2 = { x: 0, y: 0 };
  public mouseLeftDown: boolean = false;
  public mouseLeftJustPressed: boolean = false;
  public mouseRightDown: boolean = false;
  public mouseRightJustPressed: boolean = false;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keysDown.has(code)) {
        this.keysJustPressed.add(code);
      }
      this.keysDown.add(code);

      // Prevent scrolling on Space / Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mousePos.x = (e.clientX - rect.left) * scaleX;
      this.mousePos.y = (e.clientY - rect.top) * scaleY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseLeftDown = true;
        this.mouseLeftJustPressed = true;
      } else if (e.button === 2) {
        this.mouseRightDown = true;
        this.mouseRightJustPressed = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseLeftDown = false;
      if (e.button === 2) this.mouseRightDown = false;
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  public isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  public isKeyJustPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  public getMovementVector(): Vector2 {
    let dx = 0;
    let dy = 0;

    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) dy -= 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) dy += 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) dx -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) dx += 1;

    // Check gamepad
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      const stickX = gp.axes[0];
      const stickY = gp.axes[1];
      if (Math.hypot(stickX, stickY) > 0.25) {
        dx = stickX;
        dy = stickY;
      }
      // D-Pad
      if (gp.buttons[12]?.pressed) dy = -1;
      if (gp.buttons[13]?.pressed) dy = 1;
      if (gp.buttons[14]?.pressed) dx = -1;
      if (gp.buttons[15]?.pressed) dx = 1;
    }

    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }

    return { x: dx, y: dy };
  }

  public isDashPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    const gpDash = gp && (gp.buttons[0]?.pressed || gp.buttons[6]?.pressed); // A or Left Trigger

    return this.isKeyJustPressed('Space') || this.isKeyJustPressed('ShiftLeft') || Boolean(gpDash);
  }

  public isOverclockPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    const gpOC = gp && (gp.buttons[3]?.pressed || gp.buttons[5]?.pressed); // Y or Right Bumper
    return this.isKeyJustPressed('KeyE') || Boolean(gpOC);
  }

  public isSecondaryPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    const gpSec = gp && (gp.buttons[1]?.pressed || gp.buttons[7]?.pressed); // B or Right Trigger
    return this.mouseRightJustPressed || this.isKeyJustPressed('KeyQ') || Boolean(gpSec);
  }

  public isPrimaryPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    const gpPri = gp && (gp.buttons[2]?.pressed || gp.buttons[7]?.value > 0.5); // X
    return this.mouseLeftJustPressed || Boolean(gpPri);
  }

  public endFrame() {
    this.keysJustPressed.clear();
    this.mouseLeftJustPressed = false;
    this.mouseRightJustPressed = false;
  }
}
