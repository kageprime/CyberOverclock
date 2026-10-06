export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EnemyType = 'drone' | 'stalker' | 'enforcer' | 'sniper' | 'boss_titan';

export interface Cyberware {
  id: string;
  name: string;
  tagline: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string; // emoji or cyber symbol
  apply: (player: PlayerStats) => void;
  // Synergy hooks
  onHit?: (target: any, damage: number, isCrit: boolean, game: any) => void;
  onKill?: (target: any, game: any) => void;
  onDash?: (game: any) => void;
  onTakeDamage?: (amount: number, game: any) => void;
  onOverclockStart?: (game: any) => void;
  onUpdate?: (dt: number, game: any) => void;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  speed: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  dashChargesMax: number;
  dashCharges: number;
  dashTimer: number;
  isDashing: boolean;
  dashInvulnerable: boolean;
  
  // Combat stats
  meleeDamage: number;
  meleeRange: number;
  meleeArc: number;
  critChance: number;
  critMultiplier: number;
  comboCount: number;
  comboTimer: number;

  // Ranged sidearm
  laserDamage: number;
  laserCooldown: number;
  laserTimer: number;

  // Overclock mechanic
  overclockCharge: number;
  overclockMax: number;
  isOverclocked: boolean;
  overclockDuration: number;
  overclockTimer: number;

  // Meta & Currency
  nanites: number; // Currency in run
  metaCores: number; // Permanent meta currency
}

export type RoomRewardType = 'cyberware' | 'nanites' | 'heal' | 'overclock_core' | 'boss';

export interface RoomDoor {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'north' | 'south' | 'east' | 'west';
  rewardType: RoomRewardType;
  isOpen: boolean;
  targetRoomIndex: number;
}

export interface RoomNode {
  id: number;
  sector: number;
  isCleared: boolean;
  isCurrent: boolean;
  type: 'combat' | 'elite' | 'rest' | 'shop' | 'boss';
  rewardType: RoomRewardType;
  enemiesTotal: number;
  enemiesRemaining: number;
  connections: number[];
}
