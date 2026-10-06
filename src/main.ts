import './style.css';
import { Camera } from './engine/camera';
import { InputManager } from './engine/input';
import { ParticleSystem } from './engine/particles';
import { ProjectileSystem } from './combat/projectile';
import { Player } from './entities/player';
import { Enemy } from './entities/enemy';
import { DungeonManager } from './world/dungeon';
import { Room } from './world/room';
import { sound } from './audio/sound';
import { meta } from './systems/meta';
import { getRandomCyberwareSelection } from './systems/cyberware';
import { Cyberware, EnemyType, RoomRewardType } from './types';

type GameState = 'menu' | 'playing' | 'reward' | 'meta' | 'gameover' | 'victory';

export class Game {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public camera: Camera;
  public input: InputManager;
  public particles: ParticleSystem;
  public projectiles: ProjectileSystem;
  public dungeon: DungeonManager;

  public player: Player;
  public enemies: Enemy[] = [];
  public currentRoom: Room | null = null;

  public state: GameState = 'menu';
  public lastTime: number = 0;
  public isPaused: boolean = false;

  // Run statistics
  public runEnemiesDefeated: number = 0;
  public runRoomsCleared: number = 0;

  // Reward modal state
  public rewardOptions: Cyberware[] = [];

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.camera = new Camera(this.canvas.width, this.canvas.height);
    this.input = new InputManager(this.canvas);
    this.particles = new ParticleSystem();
    this.projectiles = new ProjectileSystem();
    this.dungeon = new DungeonManager();

    this.player = new Player(600, 450);

    this.setupUI();
    this.startLoop();
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.camera) {
      this.camera.resize(this.canvas.width, this.canvas.height);
    }
  }

  private setupUI() {
    // Start game button
    document.getElementById('btnStart')?.addEventListener('click', () => {
      sound.init();
      this.startRun();
    });

    // Meta hub button
    document.getElementById('btnMeta')?.addEventListener('click', () => {
      sound.init();
      this.openMetaHub();
    });

    document.getElementById('btnMetaBack')?.addEventListener('click', () => {
      this.setGameState('menu');
    });

    // Restart button
    document.getElementById('btnRestart')?.addEventListener('click', () => {
      this.startRun();
    });

    document.getElementById('btnVictoryRestart')?.addEventListener('click', () => {
      this.startRun();
    });

    // Mute toggle
    document.getElementById('btnMute')?.addEventListener('click', () => {
      sound.init();
      const muted = sound.toggleMute();
      const btn = document.getElementById('btnMute');
      if (btn) btn.innerText = muted ? '🔇 MUTED' : '🔊 AUDIO ON';
    });
  }

  public setGameState(state: GameState) {
    this.state = state;
    document.querySelectorAll('.ui-screen').forEach(el => el.classList.add('hidden'));

    if (state === 'menu') {
      document.getElementById('screenMenu')?.classList.remove('hidden');
    } else if (state === 'reward') {
      document.getElementById('screenReward')?.classList.remove('hidden');
    } else if (state === 'meta') {
      document.getElementById('screenMeta')?.classList.remove('hidden');
      this.renderMetaHub();
    } else if (state === 'gameover') {
      document.getElementById('screenGameOver')?.classList.remove('hidden');
      this.updateGameOverStats();
    } else if (state === 'victory') {
      document.getElementById('screenVictory')?.classList.remove('hidden');
    }
  }

  public startRun() {
    this.dungeon.startNewRun();
    this.player = new Player(700, 450);
    this.enemies = [];
    this.projectiles.clear();
    this.particles.clear();
    this.runEnemiesDefeated = 0;
    this.runRoomsCleared = 0;

    this.loadRoom();
    this.setGameState('playing');
  }

  private loadRoom() {
    this.currentRoom = this.dungeon.currentRoom!;
    this.player.x = this.currentRoom.x + this.currentRoom.width / 2;
    this.player.y = this.currentRoom.y + this.currentRoom.height / 2 + 100;
    this.projectiles.clear();
    this.spawnEnemiesForRoom();
  }

  private spawnEnemiesForRoom() {
    this.enemies = [];
    if (!this.currentRoom) return;

    const sectorScale = 1 + (this.dungeon.sector - 1) * 0.4 + (this.dungeon.roomIndex - 1) * 0.12;

    if (this.dungeon.isBossRoom()) {
      // Spawn Boss
      this.enemies.push(
        new Enemy(
          this.currentRoom.x + this.currentRoom.width / 2,
          this.currentRoom.y + 240,
          'boss_titan',
          sectorScale
        )
      );
      sound.setCombatIntensity(true);
      return;
    }

    // Normal wave composition
    const enemyCount = 4 + this.dungeon.roomIndex * 2;
    const types: EnemyType[] = ['drone', 'stalker', 'enforcer', 'sniper'];

    for (let i = 0; i < enemyCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const ex = this.currentRoom.x + 150 + Math.random() * (this.currentRoom.width - 300);
      const ey = this.currentRoom.y + 120 + Math.random() * (this.currentRoom.height - 350);
      this.enemies.push(new Enemy(ex, ey, type, sectorScale));
    }

    sound.setCombatIntensity(true);
  }

  public onEnemyDefeated(_enemy: Enemy) {
    this.runEnemiesDefeated++;
    meta.totalKills++;

    // Check if room cleared
    const livingEnemies = this.enemies.filter(e => !e.isDead);
    if (livingEnemies.length === 0 && this.currentRoom && !this.currentRoom.isCleared) {
      this.onRoomCleared();
    }
  }

  private onRoomCleared() {
    if (!this.currentRoom) return;
    this.currentRoom.unlockDoors();
    this.runRoomsCleared++;
    sound.setCombatIntensity(false);
    sound.playRoomClear();
    this.particles.emitText(this.player.x, this.player.y - 45, 'SECTOR CLEARED! GATES OPEN', '#00ff88', 22);

    // If it's a boss room, trigger instant victory or reward
    if (this.dungeon.isBossRoom()) {
      if (this.dungeon.sector >= 2) {
        setTimeout(() => this.triggerVictory(), 1500);
      }
    }
  }

  private triggerVictory() {
    meta.metaCores += 100;
    meta.save();
    this.setGameState('victory');
  }

  public handlePlayerDeath() {
    meta.totalRuns++;
    meta.metaCores += Math.round(this.player.stats.nanites * 0.5) + this.runRoomsCleared * 10;
    meta.save();
    this.setGameState('gameover');
  }

  private updateGameOverStats() {
    const statEl = document.getElementById('gameOverStats');
    if (statEl) {
      statEl.innerHTML = `
        <div class="stat-row"><span>Sector Reached:</span> <strong>Sector ${this.dungeon.sector}</strong></div>
        <div class="stat-row"><span>Rooms Purged:</span> <strong>${this.runRoomsCleared}</strong></div>
        <div class="stat-row"><span>Hostiles Destroyed:</span> <strong>${this.runEnemiesDefeated}</strong></div>
        <div class="stat-row"><span>Meta Cores Recovered:</span> <strong>+${Math.round(this.player.stats.nanites * 0.5) + this.runRoomsCleared * 10} 💠</strong></div>
      `;
    }
  }

  private openRewardModal(rewardType: RoomRewardType) {
    if (rewardType === 'heal') {
      const healAmount = Math.round(this.player.stats.maxHp * 0.45);
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + healAmount);
      this.particles.emitText(this.player.x, this.player.y - 20, `+${healAmount} HP`, '#00ff88', 20);
      sound.playPickup();
      return;
    }

    if (rewardType === 'nanites') {
      const bonus = 60 + this.dungeon.sector * 30;
      this.player.stats.nanites += bonus;
      this.particles.emitText(this.player.x, this.player.y - 20, `+${bonus} NANITES`, '#00f0ff', 20);
      sound.playPickup();
      return;
    }

    if (rewardType === 'overclock_core') {
      this.player.stats.overclockDuration += 1.5;
      this.player.stats.overclockCharge = this.player.stats.overclockMax;
      this.particles.emitText(this.player.x, this.player.y - 20, '+OVERCLOCK BOOST', '#ffea00', 20);
      sound.playPickup();
      return;
    }

    // Offer 3 Cyberware Implants
    const currentIds = this.player.cyberwareList.map(c => c.id);
    this.rewardOptions = getRandomCyberwareSelection(3, currentIds);

    const cardsContainer = document.getElementById('rewardCards');
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';

    this.rewardOptions.forEach((cw) => {
      const card = document.createElement('div');
      card.className = `reward-card rarity-${cw.rarity}`;
      card.innerHTML = `
        <div class="card-icon">${cw.icon}</div>
        <div class="card-name">${cw.name}</div>
        <div class="card-tagline">${cw.tagline}</div>
        <div class="card-desc">${cw.description}</div>
        <div class="card-rarity">${cw.rarity.toUpperCase()}</div>
      `;
      card.addEventListener('click', () => {
        this.player.addCyberware(cw, this);
        this.setGameState('playing');
      });
      cardsContainer.appendChild(card);
    });

    this.setGameState('reward');
  }

  // --- Neural Lab Meta Hub ---
  private openMetaHub() {
    this.setGameState('meta');
  }

  private renderMetaHub() {
    const coresEl = document.getElementById('metaCoresCount');
    if (coresEl) coresEl.innerText = `${meta.metaCores} 💠`;

    const upgradeListEl = document.getElementById('metaUpgradeList');
    if (!upgradeListEl) return;
    upgradeListEl.innerHTML = '';

    const upgradeDefs = [
      { key: 'hullPlating', name: 'Reinforced Hull Plating', desc: '+15 Starting Max HP' },
      { key: 'synapseSpeed', name: 'Neural Accelerator', desc: '+15 Movement Speed' },
      { key: 'bladeEdge', name: 'High-Frequency Blade', desc: '+5 Base Katana Damage' },
      { key: 'overclockCap', name: 'Capacitor Overcharge', desc: '+1.5s Overclock Duration' },
      { key: 'naniteVault', name: 'Encrypted Nanite Stash', desc: '+25 Starting Credits' }
    ] as const;

    upgradeDefs.forEach((def) => {
      const lvl = meta.upgrades[def.key];
      const cost = meta.getUpgradeCost(def.key);
      const isMax = lvl >= 5;
      const canBuy = meta.canBuy(def.key);

      const item = document.createElement('div');
      item.className = 'meta-item';
      item.innerHTML = `
        <div class="meta-info">
          <div class="meta-title">${def.name} <span class="meta-lvl">LVL ${lvl}/5</span></div>
          <div class="meta-desc">${def.desc}</div>
        </div>
        <button class="btn-buy ${isMax ? 'disabled' : canBuy ? 'buyable' : 'locked'}" ${isMax || !canBuy ? 'disabled' : ''}>
          ${isMax ? 'MAXED' : `${cost} 💠`}
        </button>
      `;

      item.querySelector('button')?.addEventListener('click', () => {
        if (meta.purchaseUpgrade(def.key)) {
          sound.playPickup();
          this.renderMetaHub();
        }
      });

      upgradeListEl.appendChild(item);
    });
  }

  // --- Game Loop ---

  private startLoop() {
    const loop = (timestamp: number) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      this.input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(dt: number) {
    if (this.state !== 'playing') return;

    // Convert mouse screen to world
    this.input.mouseWorldPos = this.camera.getWorldPos(this.input.mousePos.x, this.input.mousePos.y);

    // Update player
    this.player.update(dt, this);

    // Update camera
    this.camera.update(
      dt,
      this.player.x,
      this.player.y,
      this.input.mouseWorldPos.x - this.player.x,
      this.input.mouseWorldPos.y - this.player.y
    );

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, this);
    }

    // Update projectiles
    this.projectiles.update(dt, this);

    // Update particles
    this.particles.update(dt);

    // Check door interactions if room cleared
    if (this.currentRoom && this.currentRoom.isCleared) {
      for (const door of this.currentRoom.doors) {
        if (door.isOpen) {
          const dist = Math.hypot(this.player.x - (door.x + door.width / 2), this.player.y - (door.y + door.height / 2));
          if (dist < 40) {
            // Traverse door!
            const res = this.dungeon.advanceToRoom(door.rewardType);
            if (res.victory) {
              this.triggerVictory();
            } else {
              this.openRewardModal(door.rewardType);
              this.loadRoom();
            }
            break;
          }
        }
      }
    }

    this.updateHUD();
  }

  private updateHUD() {
    const hpBar = document.getElementById('hudHpFill');
    const hpText = document.getElementById('hudHpText');
    if (hpBar && hpText) {
      const pct = Math.max(0, (this.player.stats.hp / this.player.stats.maxHp) * 100);
      hpBar.style.width = `${pct}%`;
      hpText.innerText = `${Math.ceil(this.player.stats.hp)} / ${this.player.stats.maxHp}`;
    }

    const ocBar = document.getElementById('hudOcFill');
    const ocPrompt = document.getElementById('hudOcPrompt');
    if (ocBar && ocPrompt) {
      const ocPct = (this.player.stats.overclockCharge / this.player.stats.overclockMax) * 100;
      ocBar.style.width = `${ocPct}%`;
      if (this.player.stats.isOverclocked) {
        ocPrompt.innerText = `OVERCLOCK ACTIVE [${this.player.stats.overclockTimer.toFixed(1)}s]`;
        ocPrompt.classList.add('pulse-active');
      } else if (this.player.stats.overclockCharge >= this.player.stats.overclockMax) {
        ocPrompt.innerText = `OVERCLOCK READY [PRESS E]`;
        ocPrompt.classList.add('pulse-ready');
      } else {
        ocPrompt.innerText = `OVERCLOCK SYNC: ${Math.round(ocPct)}%`;
        ocPrompt.classList.remove('pulse-ready', 'pulse-active');
      }
    }

    const dashPips = document.getElementById('hudDashPips');
    if (dashPips) {
      dashPips.innerHTML = '';
      for (let i = 0; i < this.player.stats.dashChargesMax; i++) {
        const pip = document.createElement('div');
        pip.className = `dash-pip ${i < this.player.stats.dashCharges ? 'charged' : 'charging'}`;
        dashPips.appendChild(pip);
      }
    }

    const nanitesEl = document.getElementById('hudNanites');
    if (nanitesEl) nanitesEl.innerText = `${this.player.stats.nanites} 💎`;

    const sectorEl = document.getElementById('hudSector');
    if (sectorEl) {
      sectorEl.innerText = `SECTOR 0${this.dungeon.sector} // ${this.dungeon.isBossRoom() ? 'TITAN ARENA' : `ROOM 0${this.dungeon.roomIndex}/05`}`;
    }

    // Boss bar if active
    const boss = this.enemies.find(e => e.isBoss && !e.isDead);
    const bossBarContainer = document.getElementById('bossBarContainer');
    if (bossBarContainer) {
      if (boss) {
        bossBarContainer.classList.remove('hidden');
        const fill = document.getElementById('bossBarFill');
        const name = document.getElementById('bossBarName');
        if (fill) fill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
        if (name) name.innerText = `PROJECT TITAN // PHASE ${boss.bossPhase}`;
      } else {
        bossBarContainer.classList.add('hidden');
      }
    }

    // Active cyberware icons
    const implantsContainer = document.getElementById('hudImplants');
    if (implantsContainer) {
      implantsContainer.innerHTML = '';
      for (const cw of this.player.cyberwareList) {
        const icon = document.createElement('span');
        icon.className = `implant-badge rarity-${cw.rarity}`;
        icon.title = `${cw.name}: ${cw.description}`;
        icon.innerText = cw.icon;
        implantsContainer.appendChild(icon);
      }
    }
  }

  private render() {
    this.ctx.fillStyle = '#030308';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'playing' || this.state === 'reward') {
      this.ctx.save();
      this.camera.applyTransform(this.ctx);

      // Render room
      if (this.currentRoom) {
        this.currentRoom.render(this.ctx);
      }

      // Render projectiles
      this.projectiles.render(this.ctx);

      // Render enemies
      for (const enemy of this.enemies) {
        enemy.render(this.ctx);
      }

      // Render player
      this.player.render(this.ctx);

      // Render particles & combat text
      this.particles.render(this.ctx);

      this.ctx.restore();

      // Laser aiming reticle in screen coords
      this.renderReticle();
    }
  }

  private renderReticle() {
    const mx = this.input.mousePos.x;
    const my = this.input.mousePos.y;
    this.ctx.save();
    this.ctx.strokeStyle = this.player.stats.isOverclocked ? '#ffea00' : '#00f0ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = this.ctx.strokeStyle;
    this.ctx.shadowBlur = 8;

    // Crosshair ring
    this.ctx.beginPath();
    this.ctx.arc(mx, my, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    // Crosshair ticks
    this.ctx.beginPath();
    this.ctx.moveTo(mx - 14, my);
    this.ctx.lineTo(mx - 9, my);
    this.ctx.moveTo(mx + 9, my);
    this.ctx.lineTo(mx + 14, my);
    this.ctx.moveTo(mx, my - 14);
    this.ctx.lineTo(mx, my - 9);
    this.ctx.moveTo(mx, my + 9);
    this.ctx.lineTo(mx, my + 14);
    this.ctx.stroke();

    this.ctx.restore();
  }

  public getClosestEnemy(x: number, y: number): Enemy | null {
    let closest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of this.enemies) {
      if (!e.isDead) {
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < minDist) {
          minDist = d;
          closest = e;
        }
      }
    }
    return closest;
  }

  public fireHomingDroneShot(fromX: number, fromY: number, target: Enemy) {
    sound.playLaser();
    this.projectiles.spawn({
      x: fromX,
      y: fromY - 20,
      vx: 0,
      vy: -200,
      radius: 4,
      damage: 18,
      isPlayer: true,
      color: '#00ffff',
      life: 0,
      maxLife: 3.0,
      isHoming: true,
      target
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
