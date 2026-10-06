import { PlayerStats, Vector2 } from '../types';
import { sound } from '../audio/sound';
import { meta } from '../systems/meta';

export class Player {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 18;
  public angle: number = 0;

  public stats: PlayerStats;
  public cyberwareList: any[] = [];

  // Attack state
  public comboStep: number = 0; // 0: ready, 1, 2, 3
  public comboResetTimer: number = 0;
  public attackCooldown: number = 0;
  public isSwinging: boolean = false;
  public swingProgress: number = 0;

  // Dash state
  public dashDirection: Vector2 = { x: 0, y: 0 };
  public dashCooldownTimer: number = 0;

  // Visual effects
  public invulnTimer: number = 0;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;

    // Apply meta permanent upgrades
    const baseHp = 100 + meta.upgrades.hullPlating * 15;
    const baseSpeed = 240 + meta.upgrades.synapseSpeed * 15;
    const baseDamage = 35 + meta.upgrades.bladeEdge * 5;
    const startingNanites = meta.upgrades.naniteVault * 25;

    this.stats = {
      maxHp: baseHp,
      hp: baseHp,
      speed: baseSpeed,
      dashSpeed: 680,
      dashDuration: 0.22,
      dashCooldown: 1.1,
      dashChargesMax: 2,
      dashCharges: 2,
      dashTimer: 0,
      isDashing: false,
      dashInvulnerable: false,
      
      meleeDamage: baseDamage,
      meleeRange: 65,
      meleeArc: Math.PI * 0.75,
      critChance: 0.15,
      critMultiplier: 2.0,
      comboCount: 0,
      comboTimer: 0,

      laserDamage: 22,
      laserCooldown: 0.25,
      laserTimer: 0,

      overclockCharge: 0,
      overclockMax: 100,
      isOverclocked: false,
      overclockDuration: 7.0 + meta.upgrades.overclockCap * 1.5,
      overclockTimer: 0,

      nanites: startingNanites,
      metaCores: 0
    };
  }

  public update(dt: number, game: any) {
    const input = game.input;

    // Handle invulnerability blink timer
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
    }

    // Aim angle towards mouse
    this.angle = Math.atan2(input.mouseWorldPos.y - this.y, input.mouseWorldPos.x - this.x);

    // Recharging dash charges
    if (this.stats.dashCharges < this.stats.dashChargesMax) {
      this.dashCooldownTimer += dt;
      if (this.dashCooldownTimer >= this.stats.dashCooldown) {
        this.stats.dashCharges++;
        this.dashCooldownTimer = 0;
      }
    }

    // Cooldown timers
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.stats.laserTimer > 0) this.stats.laserTimer -= dt;

    // Combo reset timer
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.comboStep = 0;
      }
    }

    // Overclock timer
    if (this.stats.isOverclocked) {
      this.stats.overclockTimer -= dt;
      // Emit ambient overclock particles
      if (Math.random() > 0.4) {
        game.particles.emitHitSparks(this.x, this.y, '#ffea00', 2);
      }
      if (this.stats.overclockTimer <= 0) {
        this.stats.isOverclocked = false;
        this.stats.overclockCharge = 0;
        sound.setCombatIntensity(false);
      }
    }

    // Trigger Overclock if ready
    if (input.isOverclockPressed() && !this.stats.isOverclocked && this.stats.overclockCharge >= this.stats.overclockMax) {
      this.activateOverclock(game);
    }

    // Handle Dash action
    if (input.isDashPressed() && this.stats.dashCharges > 0 && !this.stats.isDashing) {
      this.performDash(game);
    }

    // Dashing state update
    if (this.stats.isDashing) {
      this.stats.dashTimer -= dt;
      this.x += this.dashDirection.x * this.stats.dashSpeed * dt;
      this.y += this.dashDirection.y * this.stats.dashSpeed * dt;

      // Ghost trail emitter
      if (Math.random() > 0.2) {
        game.particles.emitDashGhost(this.x, this.y, this.angle, this.stats.isOverclocked ? '#ffea00' : '#00f0ff');
      }

      if (this.stats.dashTimer <= 0) {
        this.stats.isDashing = false;
      }
    } else {
      // Normal movement
      const move = input.getMovementVector();
      const currentSpeed = this.stats.speed * (this.stats.isOverclocked ? 1.4 : 1.0);
      this.vx = move.x * currentSpeed;
      this.vy = move.y * currentSpeed;

      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // Constrain inside room bounds
    if (game.currentRoom) {
      const room = game.currentRoom;
      const minX = room.x + this.radius + 20;
      const maxX = room.x + room.width - this.radius - 20;
      const minY = room.y + this.radius + 20;
      const maxY = room.y + room.height - this.radius - 20;

      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }

    // Handle Primary Melee Attack
    if (input.isPrimaryPressed() && this.attackCooldown <= 0 && !this.stats.isDashing) {
      this.performMeleeAttack(game);
    }

    // Handle Secondary Ranged Laser Attack
    if (input.isSecondaryPressed() && this.stats.laserTimer <= 0 && !this.stats.isDashing) {
      this.performRangedAttack(game);
    }

    // Update active cyberware hooks
    for (const cw of this.cyberwareList) {
      if (cw.onUpdate) {
        cw.onUpdate(dt, game);
      }
    }
  }

  private performDash(game: any) {
    const move = game.input.getMovementVector();
    if (move.x === 0 && move.y === 0) {
      // Dash towards mouse direction if not moving
      this.dashDirection.x = Math.cos(this.angle);
      this.dashDirection.y = Math.sin(this.angle);
    } else {
      this.dashDirection.x = move.x;
      this.dashDirection.y = move.y;
    }

    this.stats.dashCharges--;
    this.stats.isDashing = true;
    this.stats.dashTimer = this.stats.dashDuration;
    sound.playDash();

    // Trigger Cyberware onDash hooks
    for (const cw of this.cyberwareList) {
      if (cw.onDash) cw.onDash(game);
    }
  }

  private performMeleeAttack(game: any) {
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 0.85;
    this.attackCooldown = this.comboStep === 3 ? 0.35 : 0.2;

    sound.playSlash(this.comboStep);

    // Multiplier based on combo step
    let damage = this.stats.meleeDamage;
    let range = this.stats.meleeRange;
    let arc = this.stats.meleeArc;

    if (this.comboStep === 2) {
      damage *= 1.25;
      range *= 1.1;
    } else if (this.comboStep === 3) {
      damage *= 1.8;
      range *= 1.35;
      arc = Math.PI * 1.8; // Full circle whirlwind slash!
      game.camera.shake(6, 0.2);
    }

    if (this.stats.isOverclocked) {
      damage *= 1.5;
    }

    const slashColor = this.stats.isOverclocked ? '#ffea00' : this.comboStep === 3 ? '#ff00aa' : '#00f0ff';
    game.particles.emitSlashArc(this.x, this.y, this.angle, arc, range, this.comboStep, slashColor);

    // Deflect projectiles if Photon Edge equipped or combo 3
    const hasPhoton = this.cyberwareList.some(c => c.id === 'photon_edge');
    if (hasPhoton || this.comboStep === 3) {
      game.projectiles.deflectInArc(this.x, this.y, range, this.angle, arc);
    }

    // Hit detection against enemies
    const halfArc = arc / 2;
    let enemiesHit = 0;

    for (const enemy of game.enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= range + enemy.radius) {
        const enemyAngle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        let diff = enemyAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) <= halfArc || this.comboStep === 3) {
          // Calculate Critical Hit
          const isCrit = this.stats.isOverclocked || Math.random() < this.stats.critChance;
          const finalDamage = Math.round(damage * (isCrit ? this.stats.critMultiplier : 1));

          // Knockback
          const knockback = this.comboStep === 3 ? 240 : 120;
          enemy.vx += Math.cos(enemyAngle) * knockback;
          enemy.vy += Math.sin(enemyAngle) * knockback;

          enemy.takeDamage(finalDamage, isCrit, game);
          enemiesHit++;

          // Charge Overclock meter
          this.stats.overclockCharge = Math.min(this.stats.overclockMax, this.stats.overclockCharge + 4);

          // Trigger cyberware hooks
          for (const cw of this.cyberwareList) {
            if (cw.onHit) cw.onHit(enemy, finalDamage, isCrit, game);
          }
        }
      }
    }

    if (enemiesHit > 0) {
      sound.playHit(this.comboStep === 3);
    }
  }

  private performRangedAttack(game: any) {
    this.stats.laserTimer = this.stats.laserCooldown;
    sound.playLaser();

    const speed = 750;
    const vx = Math.cos(this.angle) * speed;
    const vy = Math.sin(this.angle) * speed;

    const hasCryo = this.cyberwareList.some(c => c.id === 'cryo_projector');
    const color = hasCryo ? '#00e5ff' : '#00ffcc';

    game.projectiles.spawn({
      x: this.x + Math.cos(this.angle) * 22,
      y: this.y + Math.sin(this.angle) * 22,
      vx,
      vy,
      radius: 5,
      damage: this.stats.laserDamage,
      isPlayer: true,
      color,
      life: 0,
      maxLife: 1.0
    });
  }

  public activateOverclock(game: any) {
    this.stats.isOverclocked = true;
    this.stats.overclockTimer = this.stats.overclockDuration;
    sound.playOverclock();
    sound.setCombatIntensity(true);
    game.camera.shake(10, 0.35);
    game.particles.emitExplosion(this.x, this.y, '#ffea00', 30);
    game.particles.emitText(this.x, this.y - 30, 'OVERCLOCK ACTIVATED!', '#ffea00', 20);

    for (const cw of this.cyberwareList) {
      if (cw.onOverclockStart) cw.onOverclockStart(game);
    }
  }

  public takeDamage(amount: number, game: any) {
    if (this.invulnTimer > 0 || this.stats.isDashing) return;

    this.stats.hp -= amount;
    this.invulnTimer = 0.45; // brief i-frames on hit
    sound.playHit(true);
    game.camera.shake(9, 0.25);
    game.particles.emitText(this.x, this.y - 20, `-${amount}`, '#ff0055', 18);

    for (const cw of this.cyberwareList) {
      if (cw.onTakeDamage) cw.onTakeDamage(amount, game);
    }

    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      game.handlePlayerDeath();
    }
  }

  public addCyberware(cw: any, game: any) {
    this.cyberwareList.push(cw);
    cw.apply(this.stats);
    sound.playPickup();
    game.particles.emitText(this.x, this.y - 30, `+ ${cw.name}`, '#00f0ff', 16);
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Flashing if invulnerable
    if (this.invulnTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.restore();
      return;
    }

    // Overclock aura
    if (this.stats.isOverclocked) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(this.angle);

    // Cyber Operative Chassis
    ctx.fillStyle = '#0a101d';
    ctx.strokeStyle = this.stats.isOverclocked ? '#ffea00' : '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;

    // Body circle
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cyber Visor / Eyes
    ctx.fillStyle = this.stats.isOverclocked ? '#ffea00' : '#00f0ff';
    ctx.fillRect(4, -5, 8, 10);

    // Katana blade sheath / active weapon
    ctx.strokeStyle = this.comboStep === 3 ? '#ff00aa' : '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 10);
    ctx.lineTo(26, 12);
    ctx.stroke();

    ctx.restore();
  }
}
