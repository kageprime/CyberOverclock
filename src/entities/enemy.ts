import { EnemyType } from '../types';
import { sound } from '../audio/sound';

export class Enemy {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 16;
  public type: EnemyType;
  public hp: number = 50;
  public maxHp: number = 50;
  public speed: number = 130;
  public isDead: boolean = false;
  public angle: number = 0;

  // Timers & Combat
  public attackTimer: number = 0;
  public attackInterval: number = 2.0;
  public telegraphTimer: number = 0;
  public stunTimer: number = 0;
  public burnTimer: number = 0;
  public burnDps: number = 0;
  public freezeTimer: number = 0;

  // Boss specific state
  public isBoss: boolean = false;
  public bossPhase: number = 1;

  constructor(x: number, y: number, type: EnemyType, sectorScale: number = 1.0) {
    this.x = x;
    this.y = y;
    this.type = type;

    switch (type) {
      case 'drone':
        this.radius = 15;
        this.maxHp = Math.round(45 * sectorScale);
        this.speed = 140;
        this.attackInterval = 2.2;
        break;

      case 'stalker':
        this.radius = 16;
        this.maxHp = Math.round(65 * sectorScale);
        this.speed = 190;
        this.attackInterval = 1.5;
        break;

      case 'enforcer':
        this.radius = 26;
        this.maxHp = Math.round(180 * sectorScale);
        this.speed = 95;
        this.attackInterval = 3.0;
        break;

      case 'sniper':
        this.radius = 15;
        this.maxHp = Math.round(40 * sectorScale);
        this.speed = 100;
        this.attackInterval = 3.5;
        break;

      case 'boss_titan':
        this.isBoss = true;
        this.radius = 42;
        this.maxHp = Math.round(1200 * sectorScale);
        this.speed = 70;
        this.attackInterval = 1.8;
        break;
    }

    this.hp = this.maxHp;
    this.attackTimer = 0.5 + Math.random() * this.attackInterval;
  }

  public update(dt: number, game: any) {
    if (this.isDead) return;

    // Slow-down factor when player is in Overclock mode
    const timeScale = game.player.stats.isOverclocked ? 0.45 : 1.0;
    const effectiveDt = dt * timeScale;

    // Handle status effects
    if (this.stunTimer > 0) {
      this.stunTimer -= effectiveDt;
      return;
    }

    if (this.burnTimer > 0) {
      this.burnTimer -= effectiveDt;
      this.takeDamage(this.burnDps * effectiveDt, false, game, false);
      if (Math.random() > 0.5) {
        game.particles.emitHitSparks(this.x, this.y, '#ff4400', 1);
      }
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer -= effectiveDt;
    }

    const player = game.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    // Apply friction to knockback velocity
    this.x += this.vx * effectiveDt;
    this.y += this.vy * effectiveDt;
    this.vx *= 0.88;
    this.vy *= 0.88;

    const currentSpeed = (this.freezeTimer > 0 ? this.speed * 0.45 : this.speed) * (game.player.stats.isOverclocked ? 0.5 : 1.0);

    // AI Behaviors
    switch (this.type) {
      case 'drone':
        // Hover at range of 220px, strafe around player
        if (dist > 240) {
          this.x += Math.cos(this.angle) * currentSpeed * effectiveDt;
          this.y += Math.sin(this.angle) * currentSpeed * effectiveDt;
        } else if (dist < 160) {
          this.x -= Math.cos(this.angle) * currentSpeed * effectiveDt;
          this.y -= Math.sin(this.angle) * currentSpeed * effectiveDt;
        } else {
          // Circle strafe
          const strafeAngle = this.angle + Math.PI / 2;
          this.x += Math.cos(strafeAngle) * currentSpeed * 0.8 * effectiveDt;
          this.y += Math.sin(strafeAngle) * currentSpeed * 0.8 * effectiveDt;
        }

        this.attackTimer += effectiveDt;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = 0;
          this.fireDroneLaser(game);
        }
        break;

      case 'stalker':
        // Close in aggressively and melee lunge
        if (dist > 30) {
          this.x += Math.cos(this.angle) * currentSpeed * effectiveDt;
          this.y += Math.sin(this.angle) * currentSpeed * effectiveDt;
        }

        // Contact attack
        if (dist < this.radius + player.radius + 6) {
          this.attackTimer += effectiveDt;
          if (this.attackTimer >= 0.8) {
            this.attackTimer = 0;
            player.takeDamage(15, game);
            game.particles.emitSlashArc(this.x, this.y, this.angle, Math.PI * 0.6, 35, 1, '#ff0055');
          }
        }
        break;

      case 'enforcer':
        // Heavy advance and ground slam
        if (dist > 70) {
          this.x += Math.cos(this.angle) * currentSpeed * effectiveDt;
          this.y += Math.sin(this.angle) * currentSpeed * effectiveDt;
        }

        this.attackTimer += effectiveDt;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = 0;
          this.performGroundSlam(game);
        }
        break;

      case 'sniper':
        // Keep far distance
        if (dist < 320) {
          this.x -= Math.cos(this.angle) * currentSpeed * effectiveDt;
          this.y -= Math.sin(this.angle) * currentSpeed * effectiveDt;
        }

        this.attackTimer += effectiveDt;
        if (this.attackTimer >= this.attackInterval - 1.0) {
          // Telegraphing beam
          this.telegraphTimer = 1.0;
        }
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = 0;
          this.fireSniperRound(game);
        }
        break;

      case 'boss_titan':
        this.updateBoss(effectiveDt, game, dist);
        break;
    }

    // Keep within room boundaries
    if (game.currentRoom) {
      const room = game.currentRoom;
      const minX = room.x + this.radius + 20;
      const maxX = room.x + room.width - this.radius - 20;
      const minY = room.y + this.radius + 20;
      const maxY = room.y + room.height - this.radius - 20;

      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }

  private fireDroneLaser(game: any) {
    const speed = 360;
    game.projectiles.spawn({
      x: this.x + Math.cos(this.angle) * 16,
      y: this.y + Math.sin(this.angle) * 16,
      vx: Math.cos(this.angle) * speed,
      vy: Math.sin(this.angle) * speed,
      radius: 4,
      damage: 12,
      isPlayer: false,
      color: '#ff0055',
      life: 0,
      maxLife: 3.0
    });
  }

  private fireSniperRound(game: any) {
    const speed = 720;
    sound.playLaser();
    game.camera.shake(5, 0.15);
    game.projectiles.spawn({
      x: this.x + Math.cos(this.angle) * 20,
      y: this.y + Math.sin(this.angle) * 20,
      vx: Math.cos(this.angle) * speed,
      vy: Math.sin(this.angle) * speed,
      radius: 6,
      damage: 28,
      isPlayer: false,
      color: '#ff0033',
      life: 0,
      maxLife: 2.0
    });
  }

  private performGroundSlam(game: any) {
    sound.playExplosion();
    game.camera.shake(10, 0.3);
    game.particles.emitExplosion(this.x, this.y, '#ff5500', 16);

    // Shockwave ring of projectiles in 8 directions
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 260;
      game.projectiles.spawn({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6,
        damage: 18,
        isPlayer: false,
        color: '#ff7700',
        life: 0,
        maxLife: 2.5
      });
    }
  }

  private updateBoss(dt: number, game: any, dist: number) {
    const hpRatio = this.hp / this.maxHp;
    this.bossPhase = hpRatio < 0.35 ? 3 : hpRatio < 0.7 ? 2 : 1;

    // Movement
    if (dist > 180) {
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    }

    this.attackTimer += dt;
    const interval = this.bossPhase === 3 ? 1.0 : this.bossPhase === 2 ? 1.4 : 1.9;

    if (this.attackTimer >= interval) {
      this.attackTimer = 0;
      const attackType = Math.floor(Math.random() * 3);

      if (attackType === 0) {
        // Spread shot
        sound.playLaser();
        const bullets = this.bossPhase === 3 ? 7 : 5;
        const spread = Math.PI * 0.45;
        for (let i = 0; i < bullets; i++) {
          const shootAngle = this.angle - spread / 2 + (i / (bullets - 1)) * spread;
          game.projectiles.spawn({
            x: this.x,
            y: this.y,
            vx: Math.cos(shootAngle) * 340,
            vy: Math.sin(shootAngle) * 340,
            radius: 5,
            damage: 14,
            isPlayer: false,
            color: '#ff00aa',
            life: 0,
            maxLife: 3.5
          });
        }
      } else if (attackType === 1) {
        // Homing missiles
        sound.playExplosion();
        game.camera.shake(6, 0.2);
        for (let i = -1; i <= 1; i += 2) {
          game.projectiles.spawn({
            x: this.x + i * 30,
            y: this.y,
            vx: Math.cos(this.angle + i * 0.8) * 180,
            vy: Math.sin(this.angle + i * 0.8) * 180,
            radius: 7,
            damage: 22,
            isPlayer: false,
            color: '#ffea00',
            life: 0,
            maxLife: 4.0,
            isHoming: true,
            target: game.player
          });
        }
      } else {
        // Ground slam EMP ring
        this.performGroundSlam(game);
      }
    }
  }

  public takeDamage(amount: number, isCrit: boolean, game: any, playSound: boolean = true) {
    if (this.isDead) return;

    this.hp -= amount;
    const displayAmount = Math.max(1, Math.round(amount));

    game.particles.emitText(
      this.x + (Math.random() * 20 - 10),
      this.y - 15,
      isCrit ? `${displayAmount} CRIT!` : `${displayAmount}`,
      isCrit ? '#ffea00' : '#ffffff',
      isCrit ? 18 : 14
    );

    game.particles.emitHitSparks(this.x, this.y, isCrit ? '#ffea00' : '#ff0055', isCrit ? 10 : 5);

    if (playSound) {
      sound.playHit(isCrit);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die(game);
    }
  }

  private die(game: any) {
    this.isDead = true;
    sound.playExplosion();
    game.camera.shake(this.isBoss ? 20 : 6, this.isBoss ? 0.6 : 0.2);
    game.particles.emitExplosion(this.x, this.y, this.isBoss ? '#00f0ff' : '#ff0055', this.isBoss ? 45 : 20);

    // Drop Nanites currency
    const naniteDrop = this.isBoss ? 150 : this.type === 'enforcer' ? 25 : 10;
    game.player.stats.nanites += naniteDrop;
    game.particles.emitText(this.x, this.y - 30, `+${naniteDrop} 💎`, '#00f0ff', 16);

    // Trigger Cyberware onKill hooks
    for (const cw of game.player.cyberwareList) {
      if (cw.onKill) cw.onKill(this, game);
    }

    game.onEnemyDefeated(this);
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Telegraph sniper beam
    if (this.type === 'sniper' && this.attackTimer >= this.attackInterval - 1.0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 50, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(this.angle) * 600, Math.sin(this.angle) * 600);
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(this.angle);

    // Enemy body rendering with neon aesthetics
    ctx.shadowBlur = 10;

    if (this.type === 'drone') {
      ctx.fillStyle = '#1a0b2e';
      ctx.strokeStyle = '#ff00aa';
      ctx.shadowColor = '#ff00aa';
      ctx.lineWidth = 2;
      // Diamond drone frame
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.lineTo(0, -this.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Glowing red ocular sensor
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(3, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'stalker') {
      ctx.fillStyle = '#16091e';
      ctx.strokeStyle = '#ff3366';
      ctx.shadowColor = '#ff3366';
      ctx.lineWidth = 2.5;
      // Sleek predatory triangle
      ctx.beginPath();
      ctx.moveTo(this.radius + 4, 0);
      ctx.lineTo(-this.radius, -this.radius * 0.8);
      ctx.lineTo(-this.radius * 0.4, 0);
      ctx.lineTo(-this.radius, this.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'enforcer') {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ff7700';
      ctx.shadowColor = '#ff7700';
      ctx.lineWidth = 3;
      // Heavy armored hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const rad = (i / 6) * Math.PI * 2;
        const px = Math.cos(rad) * this.radius;
        const py = Math.sin(rad) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'boss_titan') {
      ctx.fillStyle = '#0b0c16';
      ctx.strokeStyle = this.bossPhase === 3 ? '#ff0055' : '#00f0ff';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.lineWidth = 4;
      // Mega Titan Chassis
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer weapon pods
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(-15, -this.radius - 8, 30, 8);
      ctx.fillRect(-15, this.radius, 30, 8);
    } else {
      // Sniper
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Long barrel
      ctx.fillRect(0, -2, 22, 4);
    }

    ctx.restore();

    // Render health bar overhead
    if (this.hp < this.maxHp) {
      const barWidth = this.isBoss ? 90 : 36;
      const barHeight = this.isBoss ? 8 : 4;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.radius - 12;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const hpPercent = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = this.isBoss ? '#ff00aa' : '#00ff88';
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      ctx.restore();
    }
  }
}
