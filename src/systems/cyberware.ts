import { Cyberware, PlayerStats } from '../types';
import { sound } from '../audio/sound';

export const ALL_CYBERWARE: Cyberware[] = [
  {
    id: 'photon_edge',
    name: 'Photon Edge Emitter',
    tagline: 'Deflect projectiles & wide sweep',
    description: 'Increases melee slash range by 35% and allows sword swings to deflect incoming enemy lasers back at foes.',
    rarity: 'rare',
    icon: '⚡',
    apply: (player: PlayerStats) => {
      player.meleeRange *= 1.35;
      player.meleeArc *= 1.25;
    }
  },
  {
    id: 'tesla_coil',
    name: 'Tesla Surge Actuator',
    tagline: 'Chain lightning on dash',
    description: 'Dashing releases high-voltage electric arcs striking up to 4 nearby enemies for 30 shock damage.',
    rarity: 'rare',
    icon: '🔋',
    apply: () => {},
    onDash: (game: any) => {
      const player = game.player;
      const enemies = game.enemies;
      let strikes = 0;
      for (const e of enemies) {
        if (!e.isDead && Math.hypot(e.x - player.x, e.y - player.y) < 220) {
          e.takeDamage(30, false, game);
          game.particles.emitHitSparks(e.x, e.y, '#00f0ff', 10);
          strikes++;
          if (strikes >= 4) break;
        }
      }
      if (strikes > 0) {
        sound.playHit(true);
      }
    }
  },
  {
    id: 'nanite_siphon',
    name: 'Nanite Bio-Siphon',
    tagline: 'Vampiric nano-healing',
    description: 'Restore 2 HP on every melee hit (and 6 HP on critical strikes).',
    rarity: 'common',
    icon: '🩸',
    apply: () => {},
    onHit: (_target: any, _damage: number, isCrit: boolean, game: any) => {
      const heal = isCrit ? 6 : 2;
      const player = game.player;
      if (player.stats.hp < player.stats.maxHp) {
        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
        game.particles.emitText(player.x, player.y - 20, `+${heal} HP`, '#00ff88', 14);
      }
    }
  },
  {
    id: 'thermal_blade',
    name: 'Plasma Overdrive Core',
    tagline: 'Ignite enemies with plasma',
    description: 'Melee slashes ignite enemies, dealing continuous burn damage over 3 seconds.',
    rarity: 'common',
    icon: '🔥',
    apply: (player: PlayerStats) => {
      player.meleeDamage += 5;
    },
    onHit: (target: any, _damage: number, _isCrit: boolean, game: any) => {
      target.burnTimer = 3.0;
      target.burnDps = 15;
      game.particles.emitHitSparks(target.x, target.y, '#ff4400', 8);
    }
  },
  {
    id: 'ghost_protocol',
    name: 'Ghost Protocol Matrix',
    tagline: 'Extra dash & invulnerability',
    description: '+1 Dash Charge, +30% dash distance, and resets melee combo on dash.',
    rarity: 'rare',
    icon: '👻',
    apply: (player: PlayerStats) => {
      player.dashChargesMax += 1;
      player.dashCharges += 1;
      player.dashSpeed *= 1.25;
    }
  },
  {
    id: 'orbital_drone',
    name: 'Autonomous Assault Drone',
    tagline: 'Support drone escort',
    description: 'Deploys an armed AI drone that circles you and fires homing micro-lasers at the closest hostile.',
    rarity: 'epic',
    icon: '🛸',
    apply: () => {},
    onUpdate: (dt: number, game: any) => {
      game.droneTimer = (game.droneTimer || 0) + dt;
      if (game.droneTimer >= 1.2) {
        game.droneTimer = 0;
        // Fire homing drone shot
        const player = game.player;
        const target = game.getClosestEnemy(player.x, player.y);
        if (target) {
          game.fireHomingDroneShot(player.x, player.y, target);
        }
      }
    }
  },
  {
    id: 'hyper_capacitor',
    name: 'Quantum Hyper-Capacitor',
    tagline: 'Faster Overclock & EMP blast',
    description: 'Overclock meter fills 40% faster. Activating Overclock emits a room-wide EMP stunning and damaging all targets.',
    rarity: 'rare',
    icon: '💠',
    apply: () => {},
    onOverclockStart: (game: any) => {
      sound.playExplosion();
      game.camera.shake(12, 0.4);
      for (const e of game.enemies) {
        if (!e.isDead) {
          e.takeDamage(45, true, game);
          e.stunTimer = 2.0;
          game.particles.emitHitSparks(e.x, e.y, '#00f0ff', 12);
        }
      }
    }
  },
  {
    id: 'critical_matrix',
    name: 'Synaptic Precision Chip',
    tagline: 'High critical strike multiplier',
    description: 'Base Critical Chance +20%, and Critical Damage multiplier increased to 250%.',
    rarity: 'rare',
    icon: '🎯',
    apply: (player: PlayerStats) => {
      player.critChance += 0.20;
      player.critMultiplier = 2.5;
    }
  },
  {
    id: 'titanium_chassis',
    name: 'Titanium Exoskeleton Mk.II',
    tagline: '+50 Max HP and Armor',
    description: 'Enhances chassis durability by +50 Max HP and instantly restores 35 HP.',
    rarity: 'common',
    icon: '🛡️',
    apply: (player: PlayerStats) => {
      player.maxHp += 50;
      player.hp = Math.min(player.maxHp, player.hp + 35);
    }
  },
  {
    id: 'adrenal_overdrive',
    name: 'Adrenal Overdrive Neuro-Link',
    tagline: 'Killing extends Overclock',
    description: 'While Overclocked: +35% move speed, and every enemy defeated restores 1.5 seconds of Overclock time!',
    rarity: 'legendary',
    icon: '⚡',
    apply: () => {},
    onKill: (_target: any, game: any) => {
      const player = game.player;
      if (player.stats.isOverclocked) {
        player.stats.overclockTimer = Math.min(player.stats.overclockDuration, player.stats.overclockTimer + 1.5);
        game.particles.emitText(player.x, player.y - 25, '+1.5s OVERCLOCK', '#ffea00', 14);
      }
    }
  },
  {
    id: 'cryo_projector',
    name: 'Cryo-Emission Rounds',
    tagline: 'Laser pistol freezes targets',
    description: 'Your sidearm laser freezes enemies, slowing movement speed by 60% and dealing +15 bonus damage.',
    rarity: 'rare',
    icon: '❄️',
    apply: (player: PlayerStats) => {
      player.laserDamage += 15;
    }
  },
  {
    id: 'nanite_cluster_bomb',
    name: 'Micro-Cluster Munitions',
    tagline: 'Secondary launches explosive cluster',
    description: 'Secondary attack drops 4 explosive micro-grenades that detonate into fiery chain explosions.',
    rarity: 'epic',
    icon: '💣',
    apply: () => {}
  }
];

export function getRandomCyberwareSelection(count: number = 3, existingIds: string[] = []): Cyberware[] {
  const available = ALL_CYBERWARE.filter(c => !existingIds.includes(c.id));
  const pool = available.length >= count ? available : ALL_CYBERWARE;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
