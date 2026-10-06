import { sound } from '../audio/sound';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  life: number;
  maxLife: number;
  isHoming?: boolean;
  target?: any;
  isLaserBeam?: boolean;
}

export class ProjectileSystem {
  public projectiles: Projectile[] = [];

  public update(dt: number, game: any) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Homing logic
      if (p.isHoming && p.target && !p.target.isDead) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const angle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        
        // Turn towards target
        let diff = angle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), 5 * dt);

        p.vx = Math.cos(newAngle) * speed;
        p.vy = Math.sin(newAngle) * speed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;

      // Trail particles
      if (Math.random() > 0.4) {
        game.particles.emitHitSparks(p.x, p.y, p.color, 1);
      }

      // Check wall collisions
      if (game.currentRoom && game.currentRoom.isWall(p.x, p.y)) {
        game.particles.emitHitSparks(p.x, p.y, p.color, 4);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with targets
      if (p.isPlayer) {
        // Collide with enemies
        for (const enemy of game.enemies) {
          if (!enemy.isDead && Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + p.radius) {
            enemy.takeDamage(p.damage, false, game);
            game.particles.emitHitSparks(p.x, p.y, p.color, 6);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      } else {
        // Collide with player
        const player = game.player;
        if (!player.stats.isDashing && Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
          player.takeDamage(p.damage, game);
          game.particles.emitHitSparks(p.x, p.y, '#ff0055', 8);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Lifetime expiration
      if (p.life >= p.maxLife) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bright inner core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  public spawn(projectile: Projectile) {
    this.projectiles.push(projectile);
  }

  public deflectInArc(x: number, y: number, radius: number, arcAngle: number, arcSpan: number) {
    let deflectedCount = 0;
    const halfArc = arcSpan / 2;

    for (const p of this.projectiles) {
      if (!p.isPlayer) {
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist <= radius + 20) {
          const angleToP = Math.atan2(p.y - y, p.x - x);
          let diff = angleToP - arcAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          if (Math.abs(diff) <= halfArc) {
            // Deflect!
            p.isPlayer = true;
            p.color = '#00f0ff';
            p.vx = -p.vx * 1.3;
            p.vy = -p.vy * 1.3;
            p.damage *= 2;
            p.life = 0;
            deflectedCount++;
          }
        }
      }
    }
    if (deflectedCount > 0) {
      sound.playHit(true);
    }
  }

  public clear() {
    this.projectiles = [];
  }
}
