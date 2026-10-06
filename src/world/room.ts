import { RoomDoor, RoomRewardType } from '../types';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  isDestructible?: boolean;
  hp?: number;
}

export class Room {
  public x: number = 0;
  public y: number = 0;
  public width: number = 1400;
  public height: number = 900;
  public doors: RoomDoor[] = [];
  public obstacles: Obstacle[] = [];
  public isCleared: boolean = false;
  public rewardType: RoomRewardType = 'cyberware';
  public sector: number = 1;

  constructor(sector: number = 1, isBossRoom: boolean = false) {
    this.sector = sector;
    this.generateArena(isBossRoom);
  }

  private generateArena(isBossRoom: boolean) {
    this.obstacles = [];
    this.doors = [];

    if (isBossRoom) {
      // Big open boss arena with 4 corner energy pylons
      const pylons = [
        { x: this.x + 300, y: this.y + 240 },
        { x: this.x + this.width - 300, y: this.y + 240 },
        { x: this.x + 300, y: this.y + this.height - 240 },
        { x: this.x + this.width - 300, y: this.y + this.height - 240 },
      ];
      for (const p of pylons) {
        this.obstacles.push({
          x: p.x - 25,
          y: p.y - 25,
          width: 50,
          height: 50
        });
      }
    } else {
      // Procedural arena layout with energy pillars and explosive barrels
      const pillarCount = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pillarCount; i++) {
        const px = this.x + 200 + Math.random() * (this.width - 400);
        const py = this.y + 180 + Math.random() * (this.height - 360);
        // Avoid center spawn
        if (Math.hypot(px - (this.x + this.width / 2), py - (this.y + this.height / 2)) > 150) {
          this.obstacles.push({
            x: px,
            y: py,
            width: 44,
            height: 44
          });
        }
      }

      // Explosive plasma barrels
      const barrelCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < barrelCount; i++) {
        const bx = this.x + 180 + Math.random() * (this.width - 360);
        const by = this.y + 160 + Math.random() * (this.height - 320);
        this.obstacles.push({
          x: bx,
          y: by,
          width: 28,
          height: 28,
          isDestructible: true,
          hp: 20
        });
      }
    }
  }

  public setupDoors(availableRewards: RoomRewardType[]) {
    this.doors = [];
    const doorSize = 80;

    // Hades-style exit portals at the top wall
    const count = Math.min(3, availableRewards.length);
    const spacing = this.width / (count + 1);

    for (let i = 0; i < count; i++) {
      this.doors.push({
        x: this.x + spacing * (i + 1) - doorSize / 2,
        y: this.y + 20,
        width: doorSize,
        height: 25,
        direction: 'north',
        rewardType: availableRewards[i],
        isOpen: false,
        targetRoomIndex: i + 1
      });
    }
  }

  public unlockDoors() {
    this.isCleared = true;
    for (const d of this.doors) {
      d.isOpen = true;
    }
  }

  public isWall(x: number, y: number): boolean {
    // Outer perimeter
    if (x <= this.x + 15 || x >= this.x + this.width - 15 || y <= this.y + 15 || y >= this.y + this.height - 15) {
      return true;
    }

    // Obstacles
    for (const ob of this.obstacles) {
      if (x >= ob.x && x <= ob.x + ob.width && y >= ob.y && y <= ob.y + ob.height) {
        return true;
      }
    }

    return false;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Dark cyberpunk arena floor
    ctx.fillStyle = '#06070d';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Neon grid pattern
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let gx = this.x; gx <= this.x + this.width; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, this.y);
      ctx.lineTo(gx, this.y + this.height);
      ctx.stroke();
    }
    for (let gy = this.y; gy <= this.y + this.height; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(this.x, gy);
      ctx.lineTo(this.x + this.width, gy);
      ctx.stroke();
    }

    // Outer cyber walls
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);

    // Render obstacles
    for (const ob of this.obstacles) {
      ctx.save();
      if (ob.isDestructible) {
        // Plasma barrel
        ctx.fillStyle = '#ff2a00';
        ctx.strokeStyle = '#ffaa00';
        ctx.shadowColor = '#ff2a00';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        ctx.strokeRect(ob.x, ob.y, ob.width, ob.height);
      } else {
        // Holographic energy pylon
        ctx.fillStyle = '#0b162c';
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        ctx.strokeRect(ob.x, ob.y, ob.width, ob.height);

        // Core glow
        ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.fillRect(ob.x + 6, ob.y + 6, ob.width - 12, ob.height - 12);
      }
      ctx.restore();
    }

    // Render Doors / Exit Portals
    for (const door of this.doors) {
      ctx.save();
      if (door.isOpen) {
        ctx.fillStyle = '#00ff88';
        ctx.strokeStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;

        ctx.fillRect(door.x, door.y, door.width, door.height);
        ctx.strokeRect(door.x, door.y, door.width, door.height);

        // Holographic reward preview badge above door
        const badgeY = door.y + 40;
        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.fillRect(door.x - 15, badgeY, door.width + 30, 26);
        ctx.strokeStyle = '#00ff88';
        ctx.strokeRect(door.x - 15, badgeY, door.width + 30, 26);

        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        
        let label = 'GATE';
        if (door.rewardType === 'cyberware') label = '⚡ IMPLANT';
        else if (door.rewardType === 'nanites') label = '💎 NANITES';
        else if (door.rewardType === 'heal') label = '💉 MEDBAY';
        else if (door.rewardType === 'overclock_core') label = '💠 OVERCLOCK';
        else if (door.rewardType === 'boss') label = '⚠️ TITAN BOSS';

        ctx.fillText(label, door.x + door.width / 2, badgeY + 18);
      } else {
        // Locked door
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(door.x, door.y, door.width, door.height);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
